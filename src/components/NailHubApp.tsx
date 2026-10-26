import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HubShell, type HubSection } from './HubShell';
import { HubWorkspace } from './HubWorkspace';
import { Link } from '@tanstack/react-router';
import { Button } from './ui/button';
import {hebrewError} from '@/lib/hebrew-errors';
import { phoneText, plainText } from '@/lib/input-security';
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Phone, 
  Crown, 
  Heart, 
  Users, 
  User, 
  ArrowRight,
  Check, 
  X,
  Gem,
  Award,
  Flame,
  BadgeCheck
} from 'lucide-react';

// ==========================================
// 1. הגדרות תפקידים ותוויות יוקרתיות
// ==========================================
const ROLES = {
  NAIL_TECH: { 
    id: 'nail_tech', 
    label: 'בונת ציפורניים ומניקוריסטית', 
    badge: 'bg-accent text-primary border-border shadow-soft',
    icon: Sparkles
  },
  INSTRUCTOR: { 
    id: 'instructor', 
    label: 'מדריכה מוסמכת & אקדמיה', 
    badge: 'bg-accent text-foreground border-border shadow-soft',
    icon: Crown
  },
  SUPPLIER: { 
    id: 'supplier', 
    label: 'ספקית & מותג מורשה', 
    badge: 'bg-accent text-primary border-border shadow-soft',
    icon: Gem
  },
  MODEL: { 
    id: 'model', 
    label: 'מודליסטית', 
    badge: 'bg-accent text-primary border-border shadow-soft',
    icon: Heart
  },
  CLIENT: { 
    id: 'client', 
    label: 'לקוחה מועדפת', 
    badge: 'bg-accent text-foreground border-border shadow-soft',
    icon: Award
  }
} as const;

const ADDITIONAL_SERVICES_LIST = [
  'פדיקור קוסמטי',
  'פדיקור רפואי / טיפולי',
  'לק ג\'ל רגליים',
  'עיצוב ושיקום גבות',
  'הרמת גבות',
  'הרמת ריסים',
  'שזירת ריסים',
  'איפור קבוע',
  'טיפולי זוהר ופנים'
];

const SPECIALTIES_LIST = [
  'מבנה אנטומי מושלם',
  'בנייה באקריל',
  'ג\'ל ופוליג\'ל',
  'דיפ פאוודר',
  'פרנץ\' מדויק וחיוך מושלם',
  'ציורי יד ונייל-ארט',
  'השלמת ציפורניים שבורות',
  'אפקט שיש וגליטרים'
];

interface Member {
  id: string;
  fullName: string;
  businessName: string;
  role: string;
  city: string;
  specialties: string[];
  additionalServices: string[];
  phone: string;
  isVerified?: boolean;
}

export function NailHubApp({section = 'feed'}: {section?: HubSection}) {
  const [currentStep, setCurrentStep] = useState<'gate' | 'login' | 'onboarding' | 'app'>('gate');
  const activeTab = section;
  const [inviteCode, setInviteCode] = useState('');
  const [gateError, setGateError] = useState('');
  
  const [currentUser, setCurrentUser] = useState<Member | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: 'קריית ביאליק',
    businessName: '',
    role: 'nail_tech',
    specialties: ['מבנה אנטומי מושלם', 'פרנץ\' מדויק וחיוך מושלם'],
    additionalServices: ['פדיקור קוסמטי']
  });

  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState({ requestedRole: 'instructor', reason: '' });
  const [roleChangeSuccess, setRoleChangeSuccess] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const toMember = (p: any): Member => ({
    id: p.id, fullName: p.display_name, businessName: p.business_name || p.display_name, role: p.account_role,
    city: p.city || '', specialties: p.specialties || [], additionalServices: p.additional_services || [],
    phone: p.hide_phone ? '' : p.phone, isVerified: !!p.is_verified,
  });

  const loadData = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { setAuthError('טעינת הפרופיל נכשלה. נסי להתחבר שוב.'); return; }
    const list = (data || []).map(toMember);
    setMembers(list);
    setCurrentUser(list.find((m) => m.id === userId) ?? null);
    setCurrentStep('app');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) loadData(data.session.user.id); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) loadData(session.user.id);
      if (event === 'SIGNED_OUT') { setCurrentUser(null); setMembers([]); setCurrentStep('gate'); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleVerifyInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim().toUpperCase() === 'NAILVIP') {
      setGateError('');
      setCurrentStep('onboarding');
    } else {
      setGateError('קוד גישה שגוי ✨ הגישה כרגע היא למוזמנות שלב ההרצה בלבד.');
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (![formData.fullName, formData.businessName, formData.city].every(v => plainText(150).safeParse(v).success) || !phoneText.safeParse(formData.phone).success) {
      setAuthError('יש להזין טקסט רגיל ומספר טלפון תקין'); return;
    }
    setAuthError('');
    if (authPassword.length < 6) {setAuthError(hebrewError({code:'weak_password'}));return;}
    setAuthLoading(true);
    try {
    const { data, error } = await supabase.auth.signUp({
      email: authEmail.trim(), password: authPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: formData.fullName.trim(), business_name: formData.businessName.trim(), phone: formData.phone.trim(),
          city: formData.city.trim(), account_role: formData.role, specialties: formData.specialties, additional_services: formData.additionalServices,
        },
      },
    });
    setAuthLoading(false);
    if (error) return setAuthError(hebrewError(error, 'ההרשמה לא הושלמה. נסי שוב בעוד כמה רגעים.'));
    if (data.user?.identities?.length === 0) return setAuthError(hebrewError({code:'email_exists'}));
    if (!data.session) { setAuthInfo('נשלח אלייך מייל אימות 💌 לחצי על הקישור במייל ואז התחברי.'); setCurrentStep('login'); }
    } catch(error) {setAuthError(hebrewError(error));} finally {setAuthLoading(false);}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(''); setAuthLoading(true);
    try {
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
    setAuthLoading(false);
    if (error) setAuthError(hebrewError(error));
    } catch(error) {setAuthError(hebrewError(error));} finally {setAuthLoading(false);}
  };

  const handleSignOut = async () => {
    try {const {error}=await supabase.auth.signOut();if(error)setAuthError(hebrewError(error));}
    catch(error){setAuthError(hebrewError(error));}
  };

  const toggleItem = (list: string[], item: string) => {
    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
  };

  const getRoleDetails = (roleId: string) => {
    const found = Object.values(ROLES).find(r => r.id === roleId);
    return found || ROLES.NAIL_TECH;
  };

  // ==========================================
  // מסך 1: שער כניסה נבחרות (יוקרתי וזוהר)
  // ==========================================
  if (currentStep === 'gate') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans text-right relative overflow-hidden" dir="rtl">
        {/* אלמנטים זוהרים ברקע */}
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-accent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-card backdrop-blur-xl rounded-lg shadow-2xl shadow-soft p-8 md:p-10 border border-border relative z-10">
          <div className="text-right mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 text-primary-foreground rounded-3xl mb-4 shadow-lg shadow-soft transform rotate-2 hover:rotate-0 transition duration-300">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-4xl font-black bg-clip-text text-primary tracking-tight">
              NailHub
            </h1>
            <p className="text-xs font-semibold text-primary mt-1 tracking-wider uppercase">
              קהילת הציפורניים והביוטי היוקרתית
            </p>
          </div>

          <div className=" border border-border rounded-2xl p-4 mb-6 text-right text-xs text-primary leading-relaxed font-medium shadow-sm">
            ברוכה הבאה למרחב המקצועי שלך ✨ הכניסה בשלב זה היא בהזמנה אישית בלבד לחברות מוזמנות.
          </div>

          <form onSubmit={handleVerifyInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">קוד הזמנה לפיילוט *</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="הזיני את קוד ההזמנה שקיבלת"
                className="w-full px-4 py-3.5 rounded-2xl border border-border bg-card focus:bg-card focus:ring-2 focus:ring-ring focus:border-border outline-none text-right font-mono text-base tracking-widest uppercase shadow-sm transition"
              />
            </div>
            
            {gateError && (
              <p className="text-xs text-primary font-semibold text-right bg-accent py-2 rounded-xl border border-border">
                {gateError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full hover: hover: text-primary-foreground font-extrabold py-3.5 rounded-2xl transition shadow-lg shadow-soft hover:shadow-soft active:scale-[0.99] text-sm flex items-center justify-center gap-2"
            >
              <span>אימות קוד וכניסה</span>
              <Sparkles className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-8 text-right pt-4 border-t border-border">
            <Button 
              onClick={() => setCurrentStep('login')}
              className="text-xs font-bold text-primary hover:text-primary transition inline-flex items-center gap-1.5"
            >
              <span>כבר חברה בקהילה? לחצי להתחברות</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // מסך 2: התחברות מהירה
  // ==========================================
  if (currentStep === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans text-right" dir="rtl">
        <div className="max-w-md w-full bg-card backdrop-blur-xl rounded-lg shadow-2xl shadow-soft p-8 md:p-10 border border-border">
          <div className="text-right mb-6">
            <h1 className="text-2xl font-black text-foreground">היי, כיף שחזרת! 💖</h1>
            <p className="text-xs text-foreground mt-1">הזיני אימייל וסיסמה לכניסה לחשבון</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">אימייל *</label>
              <input type="email" required autoComplete="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent" dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">סיסמה *</label>
              <input type="password" required minLength={6} autoComplete="current-password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent" dir="rtl" />
            </div>
            {authInfo && <p className="text-xs text-foreground bg-accent rounded-xl p-2 text-right">{authInfo}</p>}
            {authError && <p className="text-xs text-primary bg-accent rounded-xl p-2 text-right">{authError}</p>}
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent text-primary-foreground font-bold py-3.5 rounded-2xl transition shadow-md text-sm"
            >
              {authLoading ? 'מתחברת...' : 'כניסה לאפליקציה'}
            </Button>
          </form>

          <div className="mt-6 text-right">
            <Button 
              onClick={() => setCurrentStep('gate')}
              className="text-xs text-foreground hover:text-foreground font-medium"
            >
              חזרה לשער הראשי
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // מסך 3: אונבורדינג והרשמה מהממת
  // ==========================================
  if (currentStep === 'onboarding') {
    return (
      <div className="min-h-screen py-10 px-4 font-sans text-right" dir="rtl">
        <div className="max-w-2xl mx-auto bg-card backdrop-blur-xl rounded-lg shadow-xl shadow-soft p-6 md:p-10 border border-border">
          <div className="mb-6 pb-4 border-b border-border flex items-center justify-between">
            <div>
              <span className="inline-block text-[11px] font-black tracking-wider text-primary uppercase bg-accent px-2.5 py-1 rounded-full mb-1">
                שלב 2 מתוך 2 • הגדרת כרטיס ביקור
              </span>
              <h1 className="text-2xl font-black text-foreground">בואי נכיר אותך ✨</h1>
              <p className="text-xs text-foreground mt-0.5">פרטי הקשר שלך נשארים פרטיים</p>
            </div>
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          <form onSubmit={handleCompleteRegistration} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div>
              <label className="block text-xs font-bold text-foreground mb-1.5">אימייל *</label>
              <input type="email" required autoComplete="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent" dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">סיסמה *</label>
              <input type="password" required minLength={6} autoComplete="new-password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent" dir="rtl" />
            </div>
            {authInfo && <p className="text-xs text-foreground bg-accent rounded-xl p-2 text-right">{authInfo}</p>}
            {authError && <p className="text-xs text-primary bg-accent rounded-xl p-2 text-right">{authError}</p>}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">שם מלא *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="השם שלך"
                  className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-ring outline-none text-xs bg-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">שם העסק / הסטודיו</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="לדוגמה: מיה נייל בוטיק"
                  className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-ring outline-none text-xs bg-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">עיר פעילות *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-ring outline-none text-xs bg-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">טלפון ליצירת קשר *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-0000000"
                  className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-ring outline-none text-xs text-right font-mono bg-accent"
                  dir="rtl"
                />
              </div>
            </div>

            {/* בחירת תפקיד עיקרי בסגנון כרטיסים מעוצבים */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-2">תפקידך העיקרי בקהילה *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(ROLES).map((role) => {
                  const Icon = role.icon;
                  const isSelected = formData.role === role.id;
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition duration-200 ${
                        isSelected 
                          ? 'border-border text-primary-foreground shadow-md shadow-soft' 
                          : 'border-border bg-card hover:border-border text-foreground shadow-sm'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.id}
                        checked={isSelected}
                        onChange={() => setFormData({ ...formData, role: role.id })}
                        className="hidden"
                      />
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-card' : 'bg-accent text-primary'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold">{role.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* תחומי התמחות */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-2">תחומי התמחות שאת אוהבת לעשות</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES_LIST.map((spec) => {
                  const isSelected = formData.specialties.includes(spec);
                  return (
                    <Button
                      type="button"
                      key={spec}
                      onClick={() => setFormData({ ...formData, specialties: toggleItem(formData.specialties, spec) })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition duration-150 border ${
                        isSelected 
                          ? 'bg-accent text-primary-foreground border-border shadow-sm shadow-soft' 
                          : 'bg-card text-foreground border-border hover:border-border hover:bg-accent'
                      }`}
                    >
                      {isSelected ? '✨ ' : ''}{spec}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* שירותים נלווים */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-2">שירותים נוספים בקליניקה</label>
              <div className="flex flex-wrap gap-2">
                {ADDITIONAL_SERVICES_LIST.map((srv) => {
                  const isSelected = formData.additionalServices.includes(srv);
                  return (
                    <Button
                      type="button"
                      key={srv}
                      onClick={() => setFormData({ ...formData, additionalServices: toggleItem(formData.additionalServices, srv) })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition duration-150 border ${
                        isSelected 
                          ? 'bg-accent text-primary-foreground border-border' 
                          : 'bg-card text-foreground border-border hover:bg-accent'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{srv}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full hover: hover: text-primary-foreground font-extrabold py-3.5 rounded-2xl transition shadow-lg shadow-soft text-sm flex items-center justify-center gap-2"
            >
              <span>{authLoading ? 'נרשמת...' : 'הצטרפות לקהילת המקצועניות'}</span>
              <Sparkles className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // מסך 4: אפליקציה ראשית (יוקרתית, נשית ואלגנטית)
  // ==========================================
  const filteredMembers = members.filter((m) => {
    const matchRole = filterRole === 'all' || m.role === filterRole;
    const matchQuery = 
      m.fullName.includes(searchQuery) || 
      m.businessName.includes(searchQuery) || 
      m.city.includes(searchQuery) ||
      m.specialties.some(s => s.includes(searchQuery));
    return matchRole && matchQuery;
  });

  return (
    <HubShell section={section} name={currentUser?.fullName} onSignOut={handleSignOut}>
        {authError && <p role="alert" className="text-right text-sm text-destructive mb-4">{authError}</p>}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            
            {/* כותרת קהילה מעוצבת */}
            <div className=" rounded-3xl p-6 text-primary-foreground shadow-xl shadow-soft relative overflow-hidden">
              <div className="relative z-10 max-w-lg">
                <span className="bg-card backdrop-blur-sm text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
                  רשת מקצועית בלעדית
                </span>
                <h2 className="text-2xl md:text-3xl font-black mb-1">
                  הנבחרת של בונות הציפורניים בישראל
                </h2>
                <p className="text-xs text-primary leading-relaxed font-medium">
                  צפי בעבודות, צרי קשרים עסקיים, תמצאי ספקיות ציפורניים ומדריכות מוסמכות בכל הארץ.
                </p>
              </div>
              <Sparkles className="w-48 h-48 text-primary-foreground/10 absolute -left-10 -bottom-10 pointer-events-none" />
            </div>

            {/* חיפוש ופילטור אלגנטי */}
            <div className="bg-card backdrop-blur-md p-4 rounded-3xl border border-border shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפשי לפי שם, עיר, סטודיו או התמחות..."
                    className="w-full pl-4 pr-11 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-xs bg-accent"
                  />
                  <Search className="w-4 h-4 text-primary absolute right-4 top-3.5 pointer-events-none" />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <Button
                    onClick={() => setFilterRole('all')}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition duration-200 ${
                      filterRole === 'all' 
                        ? ' text-primary-foreground shadow-md shadow-soft' 
                        : 'bg-accent text-foreground hover:bg-accent'
                    }`}
                  >
                    הכול ({members.length})
                  </Button>
                  {Object.values(ROLES).map(r => (
                    <Button
                      key={r.id}
                      onClick={() => setFilterRole(r.id)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition duration-200 ${
                        filterRole === r.id 
                          ? ' text-primary-foreground shadow-md shadow-soft' 
                          : 'bg-accent text-foreground hover:bg-accent'
                      }`}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* כרטיסי החברות המעוצבים */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMembers.map((m) => {
                const role = getRoleDetails(m.role);
                const RoleIcon = role.icon;
                return (
                  <div 
                    key={m.id} 
                    className="bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-xl hover:shadow-soft transition duration-300 flex flex-col justify-between group hover:-translate-y-1"
                  >
                    <div>
                      {/* תגית ופרטי עסק */}
                      <div className="flex items-start justify-between mb-3.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-foreground text-base">{m.fullName}</h3>
                            {m.isVerified && (
                              <BadgeCheck className="w-4 h-4 text-primary fill-accent" />
                            )}
                          </div>
                          <p className="text-xs text-primary font-semibold">{m.businessName}</p>
                        </div>
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${role.badge}`}>
                          <RoleIcon className="w-3 h-3" />
                          {role.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-foreground text-xs mb-3.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="font-medium text-foreground">{m.city}</span>
                      </div>

                      {/* התמחויות */}
                      {m.specialties.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[10px] text-foreground block mb-1.5 font-bold uppercase tracking-wider">
                            מומחיות מובילה:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.specialties.map(s => (
                              <span key={s} className="bg-accent text-primary font-semibold px-2.5 py-1 rounded-lg text-[11px] border border-border">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* שירותים נלווים */}
                      {m.additionalServices.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {m.additionalServices.map(s => (
                              <span key={s} className="bg-accent text-foreground font-medium px-2 py-0.5 rounded-md text-[10px]">
                                + {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* יצירת קשר */}
                    {m.phone && <div className="pt-3.5 border-t border-border flex items-center justify-between text-xs">
                      <a 
                        href={phoneText.safeParse(m.phone).success ? `tel:${m.phone.replace(/[^+0-9]/g, '')}` : undefined}
                        className="inline-flex items-center gap-2 text-foreground font-bold hover:text-primary transition"
                      >
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-primary group-hover:bg-accent group-hover:text-primary-foreground transition">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono text-xs">{m.phone}</span>
                      </a>
                      <Button className="text-[11px] text-primary hover:text-primary font-bold">
                        כרטיס מלא ←
                      </Button>
                    </div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* תוכן עמוד פרופיל אישי */}
        {!['directory', 'profile'].includes(activeTab) && currentUser && <HubWorkspace section={section} user={currentUser} />}

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-xl mx-auto bg-card backdrop-blur-xl rounded-lg border border-border p-6 md:p-8 shadow-xl shadow-soft space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h2 className="text-2xl font-black text-foreground">{currentUser.fullName}</h2>
                <p className="text-xs text-primary font-semibold">{currentUser.businessName} • {currentUser.city}</p>
              </div>
              <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${getRoleDetails(currentUser.role).badge}`}>
                {getRoleDetails(currentUser.role).label}
              </span>
            </div>

<nav aria-label="כלים בפרופיל" className="grid grid-cols-2 gap-2">{([{path:'/saved',label:'השמורים שלי'},{path:'/pricelist',label:'המחירון שלי'},{path:'/health',label:'הצהרות בריאות'},{path:'/calculator',label:'מחשבון תמחור'},{path:'/settings',label:'הגדרות חשבון'}] as const).map(item=><Button asChild variant="outline" key={item.path}><Link to={item.path}>{item.label}</Link></Button>)}</nav>
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-foreground block mb-1.5 font-bold">התמחויות שלך:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.specialties.map(s => (
                    <span key={s} className="bg-accent text-primary font-bold px-3 py-1.5 rounded-xl border border-border">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-foreground block mb-1.5 font-bold">שירותים נוספים:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.additionalServices.map(s => (
                    <span key={s} className="bg-accent text-foreground font-medium px-2.5 py-1 rounded-lg">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-foreground block mb-1 font-bold">טלפון ליצירת קשר:</span>
                <span className="font-mono text-sm font-bold text-foreground">{currentUser.phone}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-2.5">
              <Button
                onClick={() => setShowRoleChangeModal(true)}
                className="flex-1 text-primary-foreground font-extrabold py-3 rounded-2xl text-xs transition shadow-md shadow-soft"
              >
                בקשת שדרוג תפקיד (מדריכה / ספקית) ✨
              </Button>
              <Button
                onClick={handleSignOut}
                className="px-5 py-3 border border-border text-foreground hover:text-primary rounded-2xl text-xs transition font-bold"
              >
                התנתקות
              </Button>
            </div>
          </div>
        )}


      {/* מודאל שדרוג תפקיד מעוצב */}
      {showRoleChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-accent backdrop-blur-sm">
          <div className="bg-card max-w-md w-full rounded-lg p-6 md:p-8 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <h3 className="font-black text-foreground text-sm">בקשת שדרוג תפקיד בקהילה ✨</h3>
              <Button onClick={() => setShowRoleChangeModal(false)} className="text-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {roleChangeSuccess ? (
              <div className="text-right py-6">
                <div className="w-14 h-14 bg-accent text-primary rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h4 className="font-black text-foreground text-base">הבקשה נשלחה באהבה! 💖</h4>
                <p className="text-xs text-foreground mt-1">מנהלת הקהילה תבדוק את המסמכים ותאשר את הסטטוס בהקדם.</p>
                <Button
                  onClick={() => {
                    setShowRoleChangeModal(false);
                    setRoleChangeSuccess(false);
                  }}
                  className="mt-5 px-6 py-2.5 bg-accent text-primary-foreground rounded-xl text-xs font-bold"
                >
                  סגור
                </Button>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!currentUser) return;
                  const reason = plainText(2000).safeParse(roleChangeData.reason);
                  if (!reason.success) { alert('יש להזין טקסט רגיל בלבד, עד 2000 תווים'); return; }
                  supabase.from('role_change_requests').insert({ user_id: currentUser.id, current_role: currentUser.role, requested_role: roleChangeData.requestedRole, reason: reason.data })
                    .then(({ error }) => { if (!error) setRoleChangeSuccess(true); else alert(hebrewError(error, 'שליחת הבקשה נכשלה. נסי שוב.')); }, (error: unknown) => alert(hebrewError(error)));
                }} 
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">תפקיד מבוקש</label>
                  <select
                    value={roleChangeData.requestedRole}
                    onChange={(e) => setRoleChangeData({ ...roleChangeData, requestedRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs outline-none bg-accent"
                  >
                    <option value="instructor">מדריכה מוסמכת & אקדמיה 👑</option>
                    <option value="supplier">ספקית / מותג מורשה 💎</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">נימוק או קישור לתעודות / אתר</label>
                  <textarea
                    rows={3}
                    required
                    maxLength={2000}
                    value={roleChangeData.reason}
                    onChange={(e) => setRoleChangeData({ ...roleChangeData, reason: e.target.value })}
                    placeholder="ספרי לנו קצת על הניסיון שלך, איפה עברת הכשרה או קישור לעסק..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs outline-none bg-accent"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full hover: hover: text-primary-foreground font-extrabold py-3 rounded-xl text-xs transition shadow-md shadow-soft"
                >
                  שליחת בקשה לאישור
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </HubShell>
  );
}