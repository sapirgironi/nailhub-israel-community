import { describe, expect, it } from 'vitest';
import { createPostDraft, POST_CATEGORIES, POST_TONES } from '../lib/post-templates';

describe('local post templates', () => {
  it('uses the selected category, tone, and user-provided description', () => {
    const work = createPostDraft('work', 'מקצועי', 'עיצוב בג׳ל');
    const course = createPostDraft('course', 'חם ואישי', 'עיצוב בג׳ל');
    expect(work).toContain('עיצוב בג׳ל');
    expect(work).toContain('הצצה לעבודה');
    expect(course).toContain('למידה');
    expect(course).not.toEqual(work);
  });
  it('generates usable templates for every category and tone without inventing details', () => {
    for (const { id } of POST_CATEGORIES) for (const tone of POST_TONES) {
      expect(createPostDraft(id, tone, 'פרטים שלי')).toContain('פרטים שלי');
    }
  });
});
