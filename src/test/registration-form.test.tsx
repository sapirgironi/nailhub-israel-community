import { useState, type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegistrationForm, type RegistrationDetails } from "@/components/RegistrationForm";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const initialDetails: RegistrationDetails = {
  fullName: "",
  phone: "",
  city: "",
  businessName: "",
  role: "nail_tech",
  specialties: [],
  additionalServices: [],
};

function RegistrationFormHarness() {
  const [details, setDetails] = useState(initialDetails);

  return (
    <RegistrationForm
      details={details}
      onChange={setDetails}
      email=""
      onEmail={vi.fn()}
      password=""
      onPassword={vi.fn()}
      onSubmit={vi.fn()}
      onLogin={vi.fn()}
      busy={false}
      error=""
      specialties={[]}
      services={[]}
    />
  );
}

describe("RegistrationForm profile selection", () => {
  it("updates the chosen role and shows only that profile’s feature details", () => {
    render(<RegistrationFormHarness />);

    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(
      screen.getByText(
        "מחשבון תמחור ומחירון דיגיטלי: חישוב עלות חומרים ורווח לכל טיפול בנפרד, ויצירת מחירון מעוצב שתוכלי לשלוח ישירות ללקוחות בוואטסאפ.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "לקוחה" }));

    expect(screen.getByRole("radio", { name: "לקוחה" })).toBeChecked();
    expect(
      screen.getByText("אינדקס מקצועיות: חיפוש לפי אזור, צפייה בפרופילים ויצירת קשר בוואטסאפ."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/מחשבון תמחור ומחירון דיגיטלי/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "גללי למטה כדי לראות את כל מה שיש לקהילה ולאפליקציה להציע עבור הפרופיל שבחרת ↓",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("תחומי התמחות")).not.toBeInTheDocument();
    expect(screen.queryByText("שירותים נוספים בקליניקה")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "מדריכה / מעבירת השתלמויות" }));
    expect(
      screen.getByText(
        "רכש מרוכז לערכות תלמידות: הוזלה משמעותית של חבילות ההצטיידות והציוד להדרכות דרך כוח הקנייה של הפלטפורמה.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "מכרזי הצטיידות לאקדמיות: רכישת מכשור וציוד מתקדם לכיתות הלימוד במחירי קבוצה ייחודיים.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "ספק / מותג מוצרים" }));
    expect(
      screen.getByText(
        "מכרזי פרימיום סגורים: גישה בלעדית להגשת הצעות מחיר דיסקרטיות במכרזי רכש מרוכזים לקהילה.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "עסקאות נפח וכוח קנייה מרוכז: מכירת כמויות גדולות במכה אחת של מארזים וסלי צריכה שוטפים, ישירות לאלפי מקצועיות פעילות.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "נייליסטית מקצועית" }));
    expect(
      screen.getByText(
        "כוח קנייה קהילתי: הוזלה משמעותית בסלי חומרים ומארזי עבודה שוטפים דרך סקרי רכישה משותפת.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "מכרזי פרימיום בלעדיים: גישה מוקדמת לרכישת ציוד מקצועי כבד ומכשור מתקדם במחירי מכרז חסרי תקדים.",
      ),
    ).toBeInTheDocument();
  });
});
