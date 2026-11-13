export const POST_CATEGORIES = [
  { id: "work", label: "הצגת עבודה" },
  { id: "tip", label: "טיפ מקצועי" },
  { id: "appointment", label: "הזמנה לתור" },
  { id: "course", label: "הדרכה והשתלמות" },
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number]["id"];
export const POST_TONES = ["מקצועי", "חם ואישי", "מעורר השראה"] as const;
export type PostTone = (typeof POST_TONES)[number];

export function createPostDraft(category: PostCategory, tone: PostTone, description: string) {
  const openings: Record<PostCategory, string> = {
    work: "הצצה לעבודה מהקליניקה",
    tip: "טיפ מקצועי לקהילה",
    appointment: "מוזמנות להתחדש",
    course: "הזמנה ללמידה ולהתפתחות מקצועית",
  };
  const endings: Record<PostTone, string> = {
    מקצועי: "אשמח לשמוע את דעתכן בתגובות.",
    "חם ואישי": "אשמח לשמוע מה אתן חושבות 💗",
    "מעורר השראה": "כל פרט קטן הוא הזדמנות ליצור משהו מיוחד ✨",
  };
  return [openings[category], description.trim(), endings[tone]].filter(Boolean).join("\n\n");
}
