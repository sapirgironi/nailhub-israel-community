import React, { useState } from "react";
import { Sparkles, Search, MapPin, Phone, Check, ArrowRight, X } from "lucide-react";

export const ROLES = {
  NAIL_TECH: { id: "nail_tech", label: "בונת ציפורניים ומניקוריסטית", color: "bg-accent text-accent-foreground border-accent-foreground/20" },
  INSTRUCTOR: { id: "instructor", label: "מדריכה מוסמכת ואקדמיה", color: "bg-warn-soft text-warn border-warn/20" },
  SUPPLIER: { id: "supplier", label: "ספק / מותג מורשה", color: "bg-info-soft text-info border-info/20" },
  CLIENT: { id: "client", label: "לקוחה", color: "bg-muted text-secondary-foreground border-border" },
  MODEL: { id: "model", label: "מודליסטית", color: "bg-accent text-accent-foreground border-accent-foreground/10" },
} as const;

const ADDITIONAL_SERVICES_LIST = ["פדיקור קוסמטי", "פדיקור רפואי / טיפולי", "לק ג'ל רגליים", "עיצוב ושיקום גבות", "הרמת גבות", "הרמת ריסים", "שזירת ריסים", "איפור קבוע", "טיפולי פנים"];
const SPECIALTIES_LIST = ["מבנה אנטומי", "בנייה באקריל", "בנייה בג'ל / פוליג'ל", "דיפ פאוודר", "פרנץ' מדויק", "ציורי ציפורניים וארט", "השלמת ציפורן שבורה", "מיניקוריסטיות מתחילות"];

interface Member {
  id: string; fullName: string; businessName: string; role: string; city: string;
  specialties: string[]; additionalServices: string[]; phone: string;
  accountStatus?: "active" | "pending_approval";
}

const input = "w-full px-3.5 py-2.5 rounded-xl border border-input bg-card focus:ring-2 focus:ring-ring outline-none text-sm";
const primaryBtn = "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition shadow-md";
const card = "bg-card rounded-3xl shadow-xl p-8 border border-border";

export function NailHubApp() {
  const [currentStep, setCurrentStep] = useState<"gate" | "login" | "onboarding" | "app">("gate");
  const [activeTab, setActiveTab] = useState<"directory" | "profile">("directory");
  const [inviteCode, setInviteCode] = useState("");
  const [gateError, setGateError] = useState("");
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    fullName: "", phone: "", city: "קריית ביאליק", businessName: "", role: "nail_tech",
    specialties: ["מבנה אנטומי", "דיפ פאוודר"], additionalServices: ["פדיקור קוסמטי"],
  });
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState({ requestedRole: "instructor", reason: "" });
  const [roleChangeSuccess, setRoleChangeSuccess] = useState(false);
  const [members, setMembers] = useState<Member[]>([
    { id: "1", fullName: "ספיר גירוני", businessName: "ספיר גירוני ביוטי", role: "nail_tech", city: "קריית ביאליק", specialties: ["מבנה אנטומי", "דיפ פאוודר", "פרנץ' מדויק"], additionalServices: ["פדיקור קוסמטי", "עיצוב ושיקום גבות"], phone: "050-0000000", accountStatus: "active" },
    { id: "2", fullName: "גולן גירוני", businessName: "ליליאור אספקת ציוד", role: "supplier", city: "קריית ביאליק", specialties: ["ציוד מניקור", "אבקות דיפ"], additionalServices: [], phone: "054-3289555", accountStatus: "active" },
  ]);
  const [filterRole, setFilterRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleVerifyInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim().toUpperCase() === "NAILVIP") { setGateError(""); setCurrentStep("onboarding"); }
    else setGateError("קוד הזמנה שגוי. הגישה כרגע היא למוזמנות פיילוט בלבד (קוד לדוגמה: NAILVIP)");
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return alert("נא להזין שם מלא");
    const newUser: Member = {
      id: String(Date.now()), fullName: formData.fullName, businessName: formData.businessName || formData.fullName,
      role: formData.role, city: formData.city, phone: formData.phone, specialties: formData.specialties,
      additionalServices: formData.additionalServices, accountStatus: formData.role === "supplier" ? "pending_approval" : "active",
    };
    setCurrentUser(newUser);
    setMembers((p) => [newUser, ...p]);
    setCurrentStep("app");
  };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); setCurrentUser(members[0]); setCurrentStep("app"); };
  const toggleItem = (list: string[], item: string) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  const getRoleDetails = (id: string) => Object.values(ROLES).find((r) => r.id === id) || ROLES.NAIL_TECH;

  if (currentStep === "gate") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-right" dir="rtl">
        <div className={`max-w-md w-full ${card}`}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-accent text-accent-foreground rounded-2xl mb-3 shadow-inner"><Sparkles className="w-7 h-7" /></div>
            <h1 className="text-3xl font-extrabold tracking-tight">NailHub</h1>
            <p className="text-sm text-muted-foreground mt-1">קהילת הציפורניים המקצועית של ישראל</p>
          </div>
          <div className="bg-warn-soft border border-warn/20 rounded-2xl p-4 mb-6 text-warn text-sm leading-relaxed">
            האפליקציה נמצאת בשלב הרצה סגור (VIP Pilot). הכניסה באמצעות קוד גישה מורשה בלבד.
          </div>
          <form onSubmit={handleVerifyInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">קוד הזמנה לפיילוט *</label>
              <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="הזיני קוד גישה (לדוגמה: NAILVIP)" className={`${input} py-3 text-center font-mono text-lg tracking-widest uppercase`} />
            </div>
            {gateError && <p className="text-xs text-destructive font-medium">{gateError}</p>}
            <button type="submit" className={primaryBtn}>אימות וכניסה</button>
          </form>
          <div className="mt-6 text-center pt-4 border-t border-border">
            <button onClick={() => setCurrentStep("login")} className="text-xs text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-1">
              כבר חברה בקהילה? לחצי להתחברות <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-right" dir="rtl">
        <div className={`max-w-md w-full ${card}`}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">התחברות ל-NailHub</h1>
            <p className="text-xs text-muted-foreground mt-1">הזיני את פרטייך לכניסה למערכת</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">מספר טלפון נייד</label>
              <input type="tel" defaultValue="050-0000000" className={`${input} py-3 text-left font-mono`} dir="ltr" />
            </div>
            <button type="submit" className={primaryBtn}>כניסה מהירה</button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setCurrentStep("gate")} className="text-xs text-muted-foreground hover:text-foreground">חזרה לשער ההזמנות</button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "onboarding") {
    return (
      <div className="min-h-screen bg-background py-10 px-4 text-right" dir="rtl">
        <div className="max-w-2xl mx-auto bg-card rounded-3xl shadow-xl p-6 md:p-8 border border-border">
          <div className="mb-6 pb-4 border-b border-border">
            <span className="text-xs font-bold text-accent-foreground tracking-wider">שלב 2 מתוך 2</span>
            <h1 className="text-2xl font-black mt-1">הגדרת הפרופיל המקצועי שלך</h1>
            <p className="text-xs text-muted-foreground mt-1">המידע יוצג בדירקטורי החברות של NailHub</p>
          </div>
          <form onSubmit={handleCompleteRegistration} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold mb-1">שם מלא *</label>
                <input required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="לדוגמה: שרה ישראלי" className={input} /></div>
              <div><label className="block text-xs font-bold mb-1">שם העסק / מותג</label>
                <input value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} placeholder="לדוגמה: שרה ביוטי סטודיו" className={input} /></div>
              <div><label className="block text-xs font-bold mb-1">עיר פעילות *</label>
                <input required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className={input} /></div>
              <div><label className="block text-xs font-bold mb-1">טלפון ליצירת קשר *</label>
                <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="050-0000000" className={`${input} text-left`} dir="ltr" /></div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-2">תפקיד עיקרי בקהילה *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(ROLES).map((role) => {
                  const sel = formData.role === role.id;
                  return (
                    <label key={role.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${sel ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border hover:border-input bg-muted/50"}`}>
                      <input type="radio" name="role" checked={sel} onChange={() => setFormData({ ...formData, role: role.id })} className="hidden" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${sel ? "border-primary-foreground" : "border-muted-foreground"}`}>
                        {sel && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-xs font-bold">{role.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-2">תחומי התמחות מקצועיים</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES_LIST.map((spec) => {
                  const sel = formData.specialties.includes(spec);
                  return (
                    <button type="button" key={spec} onClick={() => setFormData({ ...formData, specialties: toggleItem(formData.specialties, spec) })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${sel ? "bg-accent text-accent-foreground border-accent-foreground/30 font-bold" : "bg-card text-muted-foreground border-border hover:bg-muted font-medium"}`}>
                      {sel && "✓ "}{spec}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-2">שירותים וטיפולים נלווים בקליניקה</label>
              <div className="flex flex-wrap gap-2">
                {ADDITIONAL_SERVICES_LIST.map((srv) => {
                  const sel = formData.additionalServices.includes(srv);
                  return (
                    <button type="button" key={srv} onClick={() => setFormData({ ...formData, additionalServices: toggleItem(formData.additionalServices, srv) })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>
                      {sel && "✓ "}{srv}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" className={`${primaryBtn} text-sm shadow-lg`}>השלמת הרשמה וכניסה לאפליקציה</button>
          </form>
        </div>
      </div>
    );
  }

  const filteredMembers = members.filter((m) => {
    const matchRole = filterRole === "all" || m.role === filterRole;
    const q = searchQuery;
    const matchQuery = m.fullName.includes(q) || m.businessName.includes(q) || m.city.includes(q) || m.specialties.some((s) => s.includes(q));
    return matchRole && matchQuery;
  });
  const chip = (active: boolean) => `px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`;
  const tab = (active: boolean) => `px-3 py-1.5 rounded-lg transition ${active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`;

  return (
    <div className="min-h-screen bg-background text-right" dir="rtl">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-accent text-accent-foreground rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
            <div>
              <span className="font-extrabold text-base block leading-tight">NailHub</span>
              <span className="text-[10px] text-muted-foreground font-medium">קהילת הציפורניים של ישראל</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-bold">
            <button onClick={() => setActiveTab("directory")} className={tab(activeTab === "directory")}>דירקטורי חברות</button>
            <button onClick={() => setActiveTab("profile")} className={tab(activeTab === "profile")}>הפרופיל שלי</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {activeTab === "directory" && (
          <div className="space-y-6">
            <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="חיפוש לפי שם, עיר, סטודיו או התמחות..." className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-border bg-card focus:ring-2 focus:ring-ring outline-none text-xs" />
                  <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-3 pointer-events-none" />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
                  <button onClick={() => setFilterRole("all")} className={chip(filterRole === "all")}>הכול ({members.length})</button>
                  {Object.values(ROLES).map((r) => (
                    <button key={r.id} onClick={() => setFilterRole(r.id)} className={chip(filterRole === r.id)}>{r.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((m) => {
                const role = getRoleDetails(m.role);
                return (
                  <div key={m.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div>
                          <h3 className="font-bold text-base">{m.fullName}</h3>
                          <p className="text-xs text-muted-foreground">{m.businessName}</p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${role.color}`}>{role.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3"><MapPin className="w-3.5 h-3.5" /><span>{m.city}</span></div>
                      {m.specialties.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[10px] text-muted-foreground block mb-1 font-bold">התמחויות:</span>
                          <div className="flex flex-wrap gap-1">{m.specialties.map((s) => <span key={s} className="bg-muted px-2 py-0.5 rounded text-[11px]">{s}</span>)}</div>
                        </div>
                      )}
                      {m.additionalServices.length > 0 && (
                        <div className="mb-4">
                          <span className="text-[10px] text-muted-foreground block mb-1 font-bold">שירותים נוספים:</span>
                          <div className="flex flex-wrap gap-1">{m.additionalServices.map((s) => <span key={s} className="bg-accent text-accent-foreground px-2 py-0.5 rounded text-[10px]">{s}</span>)}</div>
                        </div>
                      )}
                    </div>
                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                      <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 font-bold"><Phone className="w-3.5 h-3.5 text-accent-foreground" /><span>{m.phone}</span></a>
                      <button className="text-[11px] text-muted-foreground hover:text-foreground font-medium">צפייה בפרופיל</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "profile" && currentUser && (
          <div className="max-w-xl mx-auto bg-card rounded-3xl border border-border p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h2 className="text-xl font-black">{currentUser.fullName}</h2>
                <p className="text-xs text-muted-foreground">{currentUser.businessName} • {currentUser.city}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${getRoleDetails(currentUser.role).color}`}>{getRoleDetails(currentUser.role).label}</span>
            </div>
            {currentUser.accountStatus === "pending_approval" && (
              <div className="bg-warn-soft text-warn border border-warn/20 rounded-xl p-3 text-xs">החשבון ממתין לאישור מנהלת הקהילה.</div>
            )}
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1 font-bold">תחומי התמחות:</span>
                <div className="flex flex-wrap gap-1.5">{currentUser.specialties.map((s) => <span key={s} className="bg-muted px-2.5 py-1 rounded-lg font-medium">{s}</span>)}</div>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1 font-bold">שירותים נלווים:</span>
                <div className="flex flex-wrap gap-1.5">{currentUser.additionalServices.map((s) => <span key={s} className="bg-accent text-accent-foreground px-2.5 py-1 rounded-lg font-medium">{s}</span>)}</div>
              </div>
              <div className="pt-2">
                <span className="text-muted-foreground block mb-1 font-bold">טלפון לקביעת תורים / קשר:</span>
                <span className="font-mono text-sm font-bold">{currentUser.phone}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
              <button onClick={() => setShowRoleChangeModal(true)} className="flex-1 bg-muted hover:bg-secondary font-bold py-2.5 rounded-xl text-xs transition">בקשת שינוי / שדרוג תפקיד</button>
              <button onClick={() => setCurrentStep("gate")} className="px-4 py-2.5 border border-border text-muted-foreground hover:text-destructive rounded-xl text-xs transition font-medium">התנתקות</button>
            </div>
          </div>
        )}
      </main>

      {showRoleChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm" dir="rtl">
          <div className="bg-card max-w-md w-full rounded-3xl p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <h3 className="font-bold text-sm">בקשת שדרוג / שינוי תפקיד</h3>
              <button onClick={() => setShowRoleChangeModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            {roleChangeSuccess ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto mb-3"><Check className="w-6 h-6" /></div>
                <h4 className="font-bold text-sm">הבקשה נשלחה בהצלחה!</h4>
                <p className="text-xs text-muted-foreground mt-1">מנהלת הקהילה תבדוק את הפרטים ותעדכן את הסטטוס.</p>
                <button onClick={() => { setShowRoleChangeModal(false); setRoleChangeSuccess(false); }} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">סגור</button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setRoleChangeSuccess(true); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">תפקיד מבוקש</label>
                  <select value={roleChangeData.requestedRole} onChange={(e) => setRoleChangeData({ ...roleChangeData, requestedRole: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-input bg-card text-xs outline-none">
                    <option value="instructor">מדריכה מוסמכת ואקדמיה</option>
                    <option value="supplier">ספק / מותג מורשה</option>
                    <option value="nail_tech">בונת ציפורניים ומניקוריסטית</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">נימוק או קישור לתעודות / מסמכים</label>
                  <textarea rows={3} required value={roleChangeData.reason} onChange={(e) => setRoleChangeData({ ...roleChangeData, reason: e.target.value })} placeholder="פרטי מדוע את מבקשת לשנות תפקיד (למשל: סיום קורס מדריכות, פתיחת חנות וכו')..." className="w-full px-3 py-2 rounded-xl border border-input bg-card text-xs outline-none" />
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl text-xs transition">שליחת בקשה לאישור מנהלת</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
