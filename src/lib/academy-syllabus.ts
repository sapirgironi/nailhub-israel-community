import type {
  GeneratedCourseContent,
  LessonPlanItem,
  SavedCourse,
  StudentSyllabusItem,
} from "../types/academy";

interface SessionTemplate {
  title: string;
  studentSummary: string;
  practicalFocus: string;
  learningGoal: string;
  demoContent: string;
  practiceContent: string;
  requiredEquipment: string[];
  mistakesToWatch: string[];
  homework: string;
}

const BEGINNER_CURRICULUM: SessionTemplate[] = [
  {
    title: "יסודות, אנטומיה, חיטוי ומבנה הציפורן",
    studentSummary:
      "היכרות עם הציפורן הטבעית, היגיינה, סטריליזציה תקנית, מבנה מכשיר השיוף ותרגול זוויות ראשוני.",
    practicalFocus:
      "אחיזת ידית המנוע (Pen grip), שליטה במהירויות ותרגול הסרת קוטיקולה יבשה על טיפסים/אצבעות אימון.",
    learningGoal: "שליטה תיאורטית באנטומיה, הבנת כיווני סיבוב (F/R) ועבודה בטוחה ללא פציעות.",
    demoContent: "חיטוי עמדה, פירוק והרכבת ראשי שיוף, הדגמת זווית 45 מעלות על טיפס אימון.",
    practiceContent: "התלמידה מתרגלת אחיזה, פתיחת כיס קוטיקולה ותרגול עדין על אצבע אימון.",
    requiredEquipment: [
      "מכשיר שיוף",
      "ראש להבה יהלום",
      "דוחף עור מתכתי",
      "אלכוהול 70%",
      "טיפסים לאימון",
    ],
    mistakesToWatch: [
      "לחיצה אנכית עם שפיץ ראש השיוף ישירות על לוחית הציפורן",
      "עבודה בסל״ד גבוה מדי שגורם לתחושת חימום ורטט",
      "אי-הקפדה על כיוון סיבוב מול כיוון תנועת היד (עבודה נגד הכיוון)",
    ],
    homework: "צפייה בסרטון תרגול, ותרגול 30 דקות של אחיזה יציבה ופתיחת כיסים בטיפסי אימון.",
  },
  {
    title: "מניקור משולב יבש והכנת לוחית הציפורן",
    studentSummary:
      "שילוב מספריים/צבתית, גזירה רציפה של הקוטיקולה (נקניקייה), ניקוי תעלות וסילוק שאריות עור.",
    practicalFocus: "עבודה על יד אחת של מודליסטית: פתיחת כיס מושלמת וגזירה חלקה בקו אחיד.",
    learningGoal: "גזירה נקייה בלחיצה אחת ללא משיכות עור וללא פציעות כלל.",
    demoContent: "הדגמה על מודליסטית: פתיחת כיס, הרמת הפטרול, גזירה רציפה במספריים והחלקת העור.",
    practiceContent: "עבודה מעשית מודרכת על 5 אצבעות של מודליסטית בליווי צמוד של המדריכה.",
    requiredEquipment: [
      "מספרי מניקור מקצועיות",
      "ראש כדור/חרוט לליטוש",
      "מברשת אבק",
      "חומר חיטוי לעור",
    ],
    mistakesToWatch: [
      "משיכת העור במקום חיתוך נקי בעזרת הלהבים",
      "חיתוך עמוק מדי לתוך העור החי במקום הסרת הקוטיקולה היבשה בלבד",
      "אי-החזקת העור במתיחה נכונה בזמן הגזירה",
    ],
    homework: "צילום מאקרו של מניקור על יד אחת של חברה/בת משפחה ושליחה לבדיקה בוואטסאפ.",
  },
  {
    title: "מבנה אנטומי, יישור לוחית וגזרת אור (היילייט)",
    studentSummary:
      "עבודה עם ראבר בייס (Rubber Base), יצירת נקודת שיא (Apex), יישור שקעים וגזרי אור סימטריים.",
    practicalFocus:
      "מריחת שכבת החלקה, היפוך היד לבניית גובה נכון, ובדיקת קו האור תחת מנורת שולחן עגולה.",
    learningGoal: "השגת מבנה אנטומי חלק, חזק ועמיד שלא נשבר ושומר על ברק מושלם.",
    demoContent: "הנחת בסיס, טיפת חיזוק, שימוש במכחול 000 ליישור צדדי, בדיקת השתקפות האור.",
    practiceContent: "תרגול מבנה אנטומי על 10 אצבעות של מודליסטית, תוך דגש על סימטריה וייבוש נכון.",
    requiredEquipment: [
      "ראבר בייס צמיג",
      "מכחול 000 דק",
      "מנורת ייבוש LED/UV",
      "מנורת תאורה עגולה לבדיקת אור",
    ],
    mistakesToWatch: [
      "הצפת תעלות הציפורן בחומר בסיס עקב חוסר שליטה בכמות",
      "היפוך יד לא מאוזן הגורם לחומר לזלוג לצד אחד",
      "הכנסה מאוחרת למנורה כשהחומר כבר איבד את הצורה והמבנה",
    ],
    homework: "מריחת מבנה אנטומי על 5 טיפסים שונים, צילום תחת תאורה ובדיקת השתקפות האור.",
  },
  {
    title: "מריחה צמודה לקוטיקולה, פיניש, צילום ושיווק",
    studentSummary:
      "טכניקת צבע מתחת לקוטיקולה, סגירת קצוות הרמטית, צילום מקצועי לרשתות ופתיחת יומן עבודה.",
    practicalFocus: "עבודה עצמאית מלאה מקצה לקצה על מודליסטית, כולל מריחת צבע אטום וטופ ללא ניגוב.",
    learningGoal: "סיום סט שלם ברמת גימור מושלמת, צילום תמונת תיק עבודות והבנת מחירון פתיחה.",
    demoContent: "מריחת לק ג׳ל בעזרת מכחול דק, נעילת קצה חופשי, תאורת צילום נכונה וזוויות יד.",
    practiceContent: "מבחן מעשי: עבודה מלאה של התלמידה ללא התערבות ידנית, משוב וליטוש סופי.",
    requiredEquipment: [
      "לק ג׳ל אטום",
      "טופ מבריק ללא ניגוב",
      "רינג לייט / מנורת צילום",
      "שמן הזנה לקוטיקולה",
    ],
    mistakesToWatch: [
      "נגיעת צבע בעור ללא ניקוי מיידי לפני ייבוש במנורה",
      "שכבות צבע עבות מדי שמתקמטות ולא מתייבשות מבפנים",
      "צילום עם תאורה חזקה מדי שמסנוורת ומסתירה את איכות העבודה",
    ],
    homework: "פתיחת עמוד אינסטגרם מקצועי, העלאת תמונת הסט הראשון עם תמחור פתיחה מוגדר.",
  },
];

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function generateSyllabusFromCourse(course: SavedCourse): GeneratedCourseContent {
  const { pricingInput, pricingOutput } = course;
  const sessions = pricingInput.sessionsCount || BEGINNER_CURRICULUM.length;
  const totalMinutes = Math.round((pricingInput.hoursPerSession || 4) * 60);
  const openingEnd = Math.round(totalMinutes * 0.125);
  const demoEnd = Math.round(totalMinutes * 0.375);
  const summaryStart = Math.round(totalMinutes * 0.875);

  const kitItems = pricingInput.includeStudentKit
    ? [
        "מכשיר שיוף מקצועי + ערכת ראשי יהלום (להבה, כדור, חרוט)",
        "מספרי מניקור מקצועיות לחיתוך קוטיקולה",
        "ראבר בייס לחיזוק, טופ ללא ניגוב ופריימר ללא חומצה",
        "מכחול 000 דק לעבודה צמודה לקוטיקולה",
        "פצירות 100/180, באפרים, מברשת אבק ואלכוהול 70%",
      ]
    : ["ערכת מתכלים שוטפת לשימוש בסדנה בלבד"];

  const instructorLessons: LessonPlanItem[] = [];
  const sessionsForStudent: StudentSyllabusItem[] = [];

  for (let i = 1; i <= sessions; i++) {
    const templateIndex = Math.min(i - 1, BEGINNER_CURRICULUM.length - 1);
    const template = BEGINNER_CURRICULUM[templateIndex];
    if (!template) {
      throw new Error("The beginner curriculum has no lesson templates.");
    }

    sessionsForStudent.push({
      sessionNumber: i,
      title: template.title,
      summary: template.studentSummary,
      practicalFocus: template.practicalFocus,
    });

    instructorLessons.push({
      sessionNumber: i,
      topic: template.title,
      learningGoal: template.learningGoal,
      timeline: [
        {
          timeRange: `${formatTime(0)} - ${formatTime(openingEnd)}`,
          title: "פתיחה ובקרה",
          description:
            i === 1
              ? "תיאום ציפיות, הסבר על סדר היום וחלוקת עמדות"
              : "בדיקת שיעורי בית, מעבר על שאלות וטעויות ממפגש קודם",
          type: "theory",
        },
        {
          timeRange: `${formatTime(openingEnd)} - ${formatTime(demoEnd)}`,
          title: "הדגמת מדריכה (Step-by-Step)",
          description: template.demoContent,
          type: "demo",
        },
        {
          timeRange: `${formatTime(demoEnd)} - ${formatTime(summaryStart)}`,
          title: "תרגול מעשי בליווי צמוד",
          description: template.practiceContent,
          type: "practice",
        },
        {
          timeRange: `${formatTime(summaryStart)} - ${formatTime(totalMinutes)}`,
          title: "משוב אישי וסיכום",
          description: "בדיקת תוצאות, מתן דגשים אישיים לשיפור והגדרת משימת הבית.",
          type: "summary",
        },
      ],
      requiredEquipment: template.requiredEquipment,
      instructorCommonMistakesToWatch: template.mistakesToWatch,
      homework: template.homework,
    });
  }

  return {
    courseId: course.id,
    syllabusOverview: `קורס הכשרה מקיף ומעשי הכולל ${sessions} מפגשים (${pricingOutput.totalTeachingHours} שעות לימוד סה״כ).`,
    targetAudience:
      course.category === "beginner"
        ? "מתחילות ללא רקע או בעלות רקע בסיסי בלבד"
        : "מקצועיות המעוניינות בשדרוג טכניקה ומהירות",
    prerequisites:
      course.category === "beginner" ? "אין צורך בניסיון קודם" : "שליטה בסיסית במכשיר שיוף",
    studentKitIncluded: kitItems,
    sessionsForStudent,
    instructorLessons,
    certificationTerms: "נוכחות מלאה ב-100% מהמפגשים וביצוע עבודת גמר עצמאית על מודליסטית.",
    cancellationPolicy:
      "מקדמת הרשמה משריינת את מקומך ואינה ניתנת להחזר במקרה של ביטול בפחות מ-7 ימי עסקים.",
  };
}
