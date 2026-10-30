import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {StorySlider} from '../components/StoryEditor';
import {createStoryPreview} from '../lib/story-preview';

vi.mock('@/integrations/supabase/client', () => ({supabase: {}}));
vi.mock('@/lib/media', () => ({uploadPhoto: vi.fn()}));

afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();});
describe('story editing performance boundaries', () => {
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
    const encoding = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob(['preview'], {type})));
    const file = new File(['original'], 'photo.jpg', {type: 'image/jpeg'});
    const preview = await createStoryPreview(file);
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 768, 384);
    expect(encoding.mock.calls[0]?.slice(1)).toEqual(['image/webp', 0.75]);
    expect(preview.type).toBe('image/webp');
    expect(file.size).toBe(8);
    expect(close).toHaveBeenCalledOnce();
  });
});