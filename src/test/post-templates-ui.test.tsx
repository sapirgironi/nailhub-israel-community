import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/media', () => ({ uploadPhoto: vi.fn() }));
vi.mock('@/components/StoryTextEditor', () => ({
  StoryTextEditor: ({ value, onChange }: { value: string; onChange: (value: string, caret: number) => void }) =>
    <textarea aria-label="טקסט הפוסט" value={value} onChange={(e) => onChange(e.target.value, e.target.value.length)} />,
}));
import { FeedPostComposer } from '@/components/FeedPostComposer';
import { PostDraftWriter } from '@/components/PostDraftWriter';

afterEach(cleanup);

it('creates and applies a category template without requiring a photo', () => {
  render(<FeedPostComposer userId="professional" onClose={() => {}} onPublished={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'פוסט טקסט מעוצב' }));
  fireEvent.change(screen.getByLabelText('טקסט הפוסט'), { target: { value: 'פרטי ההדרכה' } });
  fireEvent.change(screen.getByLabelText('נושא לתבנית הפוסט'), { target: { value: 'course' } });
  fireEvent.click(screen.getByRole('button', { name: 'הצעת תבנית לניסוח' }));
  fireEvent.click(screen.getByRole('button', { name: 'בחירת הנוסח' }));
  expect((screen.getByLabelText('טקסט הפוסט') as HTMLTextAreaElement).value).toContain('פרטי ההדרכה');
  expect((screen.getByLabelText('טקסט הפוסט') as HTMLTextAreaElement).value).toContain('למידה');
});

it('creates an editable draft from the selected category and entered details', () => {
  render(<PostDraftWriter />);
  fireEvent.change(screen.getByLabelText('נושא הפוסט'), { target: { value: 'tip' } });
  fireEvent.change(screen.getByPlaceholderText(/לדוגמה:/), { target: { value: 'הפרטים המקצועיים שלי' } });
  fireEvent.click(screen.getByRole('button', { name: 'יצירת טיוטת פוסט' }));
  const draft = screen.getByDisplayValue(/טיפ מקצועי לקהילה/) as HTMLTextAreaElement;
  expect(draft.value).toContain('הפרטים המקצועיים שלי');
});
