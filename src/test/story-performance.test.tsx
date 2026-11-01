import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {StorySlider, storyPixelWidth, storyImageScale, boundedImageView, storyBorderWidth, reorderStoryLayers, storyLayerCanMove} from '../components/StoryEditor';
import {createStoryPreview} from '../lib/story-preview';

vi.mock('@/integrations/supabase/client', () => ({supabase: {}}));
vi.mock('@/lib/media', () => ({uploadPhoto: vi.fn()}));

afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();});
describe('story editing performance boundaries', () => {
  it('limits photo borders to 0 through 12 pixels', () => {
    expect(storyBorderWidth(-1)).toBe(0);
    expect(storyBorderWidth(6)).toBe(6);
    expect(storyBorderWidth(15)).toBe(12);
  });
  it('moves background and overlays through the same z-order without altering their content', () => {
    const layers = [{id: 0, z: 0, text: 'background'}, {id: 1, z: 1, text: 'text'}, {id: 2, z: 2, text: 'photo'}];
    const forward = reorderStoryLayers(layers, 0, 1);
    expect(forward).toEqual([{id: 1, z: 0, text: 'text'}, {id: 0, z: 1, text: 'background'}, {id: 2, z: 2, text: 'photo'}]);
    expect(reorderStoryLayers(forward, 0, -1)).toEqual(layers);
    expect(reorderStoryLayers(layers, 2, 1)).toEqual(layers);
  });
  it('denies gestures on locked background or overlay layers', () => {
    expect(storyLayerCanMove({locked: true})).toBe(false);
    expect(storyLayerCanMove({locked: false})).toBe(true);
    expect(storyLayerCanMove({})).toBe(true);
  });
  it('resizes text in pixels up to canvas width minus 24 without changing font or scale', () => {
    const layer = {width: 150, fontSize: 28, scale: 1};
    const widened = {...layer, width: storyPixelWidth(layer.width, 100, 0, 0, 300, 1)};
    expect(widened).toEqual({width: 276, fontSize: 28, scale: 1});
    expect(storyPixelWidth(150, -100, 0, 0, 300, 1)).toBe(48);
    expect(storyPixelWidth(150, -30, 0, 0, 300, -1)).toBe(210);
  });
  it('clamps background scale to the requested 0.8 to 2 range', () => {
    expect(storyImageScale(0.5)).toBe(0.8);
    expect(storyImageScale(1)).toBe(1);
    expect(storyImageScale(3)).toBe(2);
  });
  it('bounds panning using the contained image dimensions and scaled translation', () => {
    expect(boundedImageView({scale: 2, x: 999, y: -999}, 300, 600, 300, 600)).toEqual({scale: 2, x: 75, y: -150});
    expect(boundedImageView({scale: 1, x: 999, y: -999}, 300, 600, 300, 600)).toEqual({scale: 1, x: 0, y: 0});
  });
  it('previews size locally and commits main state only on release', () => {
    const preview = vi.fn(), commit = vi.fn();
    render(<StorySlider label="size" value={1} min={0.4} max={5} onPreview={preview} onCommit={commit}/>);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, {target: {value: '2'}});
    fireEvent.change(slider, {target: {value: '3'}});
    expect(preview).toHaveBeenLastCalledWith(3);
    expect(commit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    fireEvent.blur(slider);
    expect(commit).toHaveBeenCalledExactlyOnceWith(3);
  });
  it('commits opacity for keyboard and interrupted touch interactions', () => {
    const commit = vi.fn();
    render(<StorySlider label="opacity" value={1} min={0.15} max={1} onPreview={vi.fn()} onCommit={commit}/>);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, {target: {value: '0.5'}});
    expect(commit).not.toHaveBeenCalled();
    fireEvent.keyUp(slider, {key: 'ArrowLeft'});
    expect(commit).toHaveBeenLastCalledWith(0.5);
    fireEvent.change(slider, {target: {value: '0.3'}});
    fireEvent.pointerCancel(slider);
    expect(commit).toHaveBeenLastCalledWith(0.3);
  });
  it('uses a compressed 768px editing image without mutating the original', async () => {
    const close = vi.fn(), drawImage = vi.fn();
    const image = {width: 4000, height: 2000, close};
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(image));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);
    const encoding = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob(['preview'], {type: type ?? 'image/webp'})));
    const file = new File(['original'], 'photo.jpg', {type: 'image/jpeg'});
    const preview = await createStoryPreview(file);
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 768, 384);
    expect(encoding.mock.calls[0]?.slice(1)).toEqual(['image/webp', 0.75]);
    expect(preview.type).toBe('image/webp');
    expect(file.size).toBe(8);
    expect(close).toHaveBeenCalledOnce();
  });
  it('commits an opacity preview once when release also loses pointer capture', () => {
    const commit = vi.fn();
    render(<StorySlider label="opacity" value={1} min={0.15} max={1} onPreview={vi.fn()} onCommit={commit}/>);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, {target: {value: '0.4'}});
    expect(commit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    fireEvent.lostPointerCapture(slider);
    fireEvent.blur(slider);
    expect(commit).toHaveBeenCalledExactlyOnceWith(0.4);
  });
  it('bounds a portrait editing image to 384 by 768 pixels', async () => {
    const close = vi.fn(), drawImage = vi.fn();
    const image = {width: 2000, height: 4000, close};
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(image));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['preview'])));
    await createStoryPreview(new File(['original'], 'photo.jpg', {type: 'image/jpeg'}));
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 384, 768);
    expect(close).toHaveBeenCalledOnce();
  });
});