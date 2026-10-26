import React, { useState } from 'react';
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
    badge: 'bg-rose-50 text-rose-600 border-rose-200/80 shadow-rose-100',
    icon: Sparkles
  },
  INSTRUCTOR: { 
    id: 'instructor', 
    label: 'מדריכה מוסמכת & אקדמיה', 
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-amber-100',
    icon: Crown
  },
  SUPPLIER: { 
    id: 'supplier', 
    label: 'ספקית & מותג מורשה', 
    badge: 'bg-purple-50 text-purple-700 border-purple-200/80 shadow-purple-100',
    icon: Gem
  },
  MODEL: { 
    id: 'model', 
    label: 'מודליסטית', 
    badge: 'bg-pink-50 text-pink-600 border-pink-200/80 shadow-pink-100',
    icon: Heart
  },
  CLIENT: { 
    id: 'client', 
    label: 'לקוחה VIP', 
    badge: 'bg-stone-50 text-stone-700 border-stone-200/80 shadow-stone-100',
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

export function NailHubApp() {
  const [currentStep, setCurrentStep] = useState<'gate' | 'login' | 'onboarding' | 'app'>('gate');
  const [activeTab, setActiveTab] = useState<'directory' | 'profile'>('directory');
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

  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      fullName: 'ספיר גירוני',
      businessName: 'ספיר ביוטי & ניילס',
      role: 'nail_tech',
      city: 'קריית ביאליק',
      specialties: ['מבנה אנטומי מושלם', 'פרנץ\' מדויק וחיוך מושלם', 'דיפ פאוודר'],
      additionalServices: ['פדיקור קוסמטי', 'עיצוב ושיקום גבות'],
      phone: '050-0000000',
      isVerified: true
    },
    {
      id: '2',
      fullName: 'ליליאן שיין',
      businessName: 'Lili Nails & Academy',
      role: 'instructor',
      city: 'חיפה',
      specialties: ['מבנה אנטומי מושלם', 'ציורי יד ונייל-ארט'],
      additionalServices: ['הרמת ריסים'],
      phone: '054-0000000',
      isVerified: true
    },
    {
      id: '3',
      fullName: 'גולן אספקה',
      businessName: 'גלמור פרו דילר',
      role: 'supplier',
      city: 'קריית ביאליק',
      specialties: ['אבקות דיפ', 'ראשי שיוף ומכשור'],
      additionalServices: [],
      phone: '054-3289555',
      isVerified: true
    }
  ]);

  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleVerifyInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim().toUpperCase() === 'NAILVIP') {
      setGateError('');
      setCurrentStep('onboarding');
    } else {
      setGateError('קוד גישה שגוי ✨ הגישה כרגע היא למוזמנות פיילוט VIP בלבד.');
    }
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return alert('נא להזין שם מלא');

    const newUser: Member = {
      id: String(Date.now()),
      fullName: formData.fullName,
      businessName: formData.businessName || formData.fullName,
      role: formData.role,
      city: formData.city,
      phone: formData.phone,
      specialties: formData.specialties,
      additionalServices: formData.additionalServices,
      isVerified: true
    };

    setCurrentUser(newUser);
    setMembers(prev => [newUser, ...prev]);
    setCurrentStep('app');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser(members[0] ?? null);
    setCurrentStep('app');
  };

  const toggleItem = (list: string[], item: string) => {
    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
  };

  const getRoleDetails = (roleId: string) => {
    const found = Object.values(ROLES).find(r => r.id === roleId);
    return found || ROLES.NAIL_TECH;
  };

  // ==========================================
  // מסך 1: שער כניסה VIP (יוקרתי וזוהר)
  // ==========================================
  if (currentStep === 'gate') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/60 to-purple-50 flex items-center justify-center p-4 font-sans text-right relative overflow-hidden" dir="rtl">
        {/* אלמנטים זוהרים ברקע */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-rose-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-pink-300/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-white/85 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-rose-200/50 p-8 md:p-10 border border-white/60 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-rose-400 via-pink-400 to-rose-300 text-white rounded-3xl mb-4 shadow-lg shadow-rose-300/60 transform rotate-2 hover:rotate-0 transition duration-300">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-rose-600 via-pink-600 to-rose-400 bg-clip-text text-transparent tracking-tight">
              NailHub
            </h1>
            <p className="text-xs font-semibold text-rose-900/60 mt-1 tracking-wider uppercase">
              קהילת הציפורניים והביוטי היוקרתית
            </p>
          </div>

          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-4 mb-6 text-center text-xs text-rose-800 leading-relaxed font-medium shadow-sm">
            ברוכה הבאה למרחב המקצועי שלך ✨ הכניסה בשלב זה היא בהזמנה אישית בלבד לחברות VIP.
          </div>

          <form onSubmit={handleVerifyInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">קוד הזמנה לפיילוט *</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="הזיני קוד (למשל: NAILVIP)"
                className="w-full px-4 py-3.5 rounded-2xl border border-rose-100 bg-white/90 focus:bg-white focus:ring-2 focus:ring-rose-400 focus:border-rose-300 outline-none text-center font-mono text-base tracking-widest uppercase shadow-sm transition"
              />
            </div>
            
            {gateError && (
              <p className="text-xs text-rose-600 font-semibold text-center bg-rose-50/80 py-2 rounded-xl border border-rose-100">
                {gateError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold py-3.5 rounded-2xl transition shadow-lg shadow-rose-300/50 hover:shadow-rose-400/60 active:scale-[0.99] text-sm flex items-center justify-center gap-2"
            >
              <span>אימות קוד וכניסה</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center pt-4 border-t border-rose-100/60">
            <button 
              onClick={() => setCurrentStep('login')}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 transition inline-flex items-center gap-1.5"
            >
              <span>כבר חברה בקהילה? לחצי להתחברות</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/50 to-stone-50 flex items-center justify-center p-4 font-sans text-right" dir="rtl">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-rose-100 p-8 md:p-10 border border-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-stone-900">היי, כיף שחזרת! 💖</h1>
            <p className="text-xs text-stone-500 mt-1">הזיני את הנייד שלך לכניסה מהירה לחשבון</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">מספר טלפון נייד</label>
              <input
                type="tel"
                defaultValue="050-0000000"
                className="w-full px-4 py-3 rounded-2xl border border-rose-100 focus:ring-2 focus:ring-rose-400 outline-none text-left font-mono text-sm bg-rose-50/20"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-2xl transition shadow-md text-sm"
            >
              כניסה לאפליקציה
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setCurrentStep('gate')}
              className="text-xs text-stone-400 hover:text-stone-700 font-medium"
            >
              חזרה לשער הראשי
            </button>
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/40 to-stone-50 py-10 px-4 font-sans text-right" dir="rtl">
        <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-rose-100 p-6 md:p-10 border border-white">
          <div className="mb-6 pb-4 border-b border-rose-100/60 flex items-center justify-between">
            <div>
              <span className="inline-block text-[11px] font-black tracking-wider text-rose-500 uppercase bg-rose-50 px-2.5 py-1 rounded-full mb-1">
                שלב 2 מתוך 2 • הגדרת כרטיס ביקור
              </span>
              <h1 className="text-2xl font-black text-stone-900">בואי נכיר אותך ✨</h1>
              <p className="text-xs text-stone-500 mt-0.5">הפרופיל שלך יוצג לחברות הקהילה וללקוחות</p>
            </div>
            <Sparkles className="w-8 h-8 text-rose-400" />
          </div>

          <form onSubmit={handleCompleteRegistration} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">שם מלא *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="השם שלך"
                  className="w-full px-4 py-2.5 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-400 outline-none text-xs bg-rose-50/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">שם העסק / הסטודיו</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="לדוגמה: מיה נייל בוטיק"
                  className="w-full px-4 py-2.5 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-400 outline-none text-xs bg-rose-50/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">עיר פעילות *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-400 outline-none text-xs bg-rose-50/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">טלפון ליצירת קשר *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-0000000"
                  className="w-full px-4 py-2.5 rounded-xl border border-rose-100 focus:ring-2 focus:ring-rose-400 outline-none text-xs text-left font-mono bg-rose-50/10"
                  dir="ltr"
                />
              </div>
            </div>

            {/* בחירת תפקיד עיקרי בסגנון כרטיסים מעוצבים */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">תפקידך העיקרי בקהילה *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(ROLES).map((role) => {
                  const Icon = role.icon;
                  const isSelected = formData.role === role.id;
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition duration-200 ${
                        isSelected 
                          ? 'border-rose-400 bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' 
                          : 'border-rose-100/80 bg-white hover:border-rose-200 text-stone-800 shadow-sm'
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
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-rose-50 text-rose-500'}`}>
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
              <label className="block text-xs font-bold text-stone-700 mb-2">תחומי התמחות שאת אוהבת לעשות</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES_LIST.map((spec) => {
                  const isSelected = formData.specialties.includes(spec);
                  return (
                    <button
                      type="button"
                      key={spec}
                      onClick={() => setFormData({ ...formData, specialties: toggleItem(formData.specialties, spec) })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition duration-150 border ${
                        isSelected 
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200' 
                          : 'bg-white text-stone-600 border-rose-100 hover:border-rose-200 hover:bg-rose-50/30'
                      }`}
                    >
                      {isSelected ? '✨ ' : ''}{spec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* שירותים נלווים */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">שירותים נוספים בקליניקה</label>
              <div className="flex flex-wrap gap-2">
                {ADDITIONAL_SERVICES_LIST.map((srv) => {
                  const isSelected = formData.additionalServices.includes(srv);
                  return (
                    <button
                      type="button"
                      key={srv}
                      onClick={() => setFormData({ ...formData, additionalServices: toggleItem(formData.additionalServices, srv) })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition duration-150 border ${
                        isSelected 
                          ? 'bg-stone-900 text-white border-stone-900' 
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{srv}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold py-3.5 rounded-2xl transition shadow-lg shadow-rose-300/50 text-sm flex items-center justify-center gap-2"
            >
              <span>הצטרפות לקהילת המקצועניות</span>
              <Sparkles className="w-4 h-4" />
            </button>
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
    <div className="min-h-screen bg-gradient-to-br from-rose-50/40 via-white to-pink-50/30 font-sans text-right text-stone-800" dir="rtl">
      
      {/* סרגל עליון יוקרתי (Glassmorphism) */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-rose-100/80 px-4 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 to-pink-400 text-white rounded-2xl flex items-center justify-center shadow-md shadow-rose-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg bg-gradient-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent block leading-tight">
                NailHub
              </span>
              <span className="text-[10px] text-stone-400 font-bold tracking-wide">
                הבית של מקצועניות הציפורניים
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-rose-50/70 p-1 rounded-2xl border border-rose-100/60 text-xs font-bold">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 rounded-xl transition duration-200 ${
                activeTab === 'directory' 
                  ? 'bg-white text-rose-600 shadow-sm shadow-rose-100 font-black' 
                  : 'text-stone-500 hover:text-rose-600'
              }`}
            >
              דירקטורי חברות ✨
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-1.5 rounded-xl transition duration-200 ${
                activeTab === 'profile' 
                  ? 'bg-white text-rose-600 shadow-sm shadow-rose-100 font-black' 
                  : 'text-stone-500 hover:text-rose-600'
              }`}
            >
              הפרופיל שלי 💖
            </button>
          </div>
        </div>
      </header>

      {/* תוכן עמוד דירקטורי */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {activeTab === 'directory' && (
          <div className="space-y-6">
            
            {/* כותרת קהילה מעוצבת */}
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 rounded-3xl p-6 text-white shadow-xl shadow-rose-200/60 relative overflow-hidden">
              <div className="relative z-10 max-w-lg">
                <span className="bg-white/20 backdrop-blur-sm text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
                  רשת מקצועית בלעדית
                </span>
                <h2 className="text-2xl md:text-3xl font-black mb-1">
                  הנבחרת של בונות הציפורניים בישראל
                </h2>
                <p className="text-xs text-rose-100 leading-relaxed font-medium">
                  צפי בעבודות, צרי קשרים עסקיים, תמצאי ספקיות ציפורניים ומדריכות מוסמכות בכל הארץ.
                </p>
              </div>
              <Sparkles className="w-48 h-48 text-white/10 absolute -left-10 -bottom-10 pointer-events-none" />
            </div>

            {/* חיפוש ופילטור אלגנטי */}
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-rose-100 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפשי לפי שם, עיר, סטודיו או התמחות..."
                    className="w-full pl-4 pr-11 py-3 rounded-2xl border border-rose-100 focus:ring-2 focus:ring-rose-400 outline-none text-xs bg-rose-50/20"
                  />
                  <Search className="w-4 h-4 text-rose-400 absolute right-4 top-3.5 pointer-events-none" />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <button
                    onClick={() => setFilterRole('all')}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition duration-200 ${
                      filterRole === 'all' 
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' 
                        : 'bg-rose-50/60 text-stone-600 hover:bg-rose-100/60'
                    }`}
                  >
                    הכול ({members.length})
                  </button>
                  {Object.values(ROLES).map(r => (
                    <button
                      key={r.id}
                      onClick={() => setFilterRole(r.id)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition duration-200 ${
                        filterRole === r.id 
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' 
                          : 'bg-rose-50/60 text-stone-600 hover:bg-rose-100/60'
                      }`}
                    >
                      {r.label}
                    </button>
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
                    className="bg-white rounded-[2rem] border border-rose-100/80 p-5 shadow-sm hover:shadow-xl hover:shadow-rose-100/70 transition duration-300 flex flex-col justify-between group hover:-translate-y-1"
                  >
                    <div>
                      {/* תגית ופרטי עסק */}
                      <div className="flex items-start justify-between mb-3.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-stone-900 text-base">{m.fullName}</h3>
                            {m.isVerified && (
                              <BadgeCheck className="w-4 h-4 text-rose-500 fill-rose-100" />
                            )}
                          </div>
                          <p className="text-xs text-rose-900/60 font-semibold">{m.businessName}</p>
                        </div>
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${role.badge}`}>
                          <RoleIcon className="w-3 h-3" />
                          {role.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-stone-400 text-xs mb-3.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-medium text-stone-600">{m.city}</span>
                      </div>

                      {/* התמחויות */}
                      {m.specialties.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[10px] text-stone-400 block mb-1.5 font-bold uppercase tracking-wider">
                            מומחיות מובילה:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.specialties.map(s => (
                              <span key={s} className="bg-rose-50/70 text-rose-700 font-semibold px-2.5 py-1 rounded-lg text-[11px] border border-rose-100/50">
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
                              <span key={s} className="bg-stone-50 text-stone-500 font-medium px-2 py-0.5 rounded-md text-[10px]">
                                + {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* יצירת קשר */}
                    <div className="pt-3.5 border-t border-rose-50 flex items-center justify-between text-xs">
                      <a 
                        href={`tel:${m.phone}`}
                        className="inline-flex items-center gap-2 text-stone-700 font-bold hover:text-rose-600 transition"
                      >
                        <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono text-xs">{m.phone}</span>
                      </a>
                      <button className="text-[11px] text-rose-500 hover:text-rose-700 font-bold">
                        כרטיס מלא ←
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* תוכן עמוד פרופיל אישי */}
        {activeTab === 'profile' && currentUser && (
          <div className="max-w-xl mx-auto bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-rose-100 p-6 md:p-8 shadow-xl shadow-rose-100/50 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-rose-100">
              <div>
                <h2 className="text-2xl font-black text-stone-900">{currentUser.fullName}</h2>
                <p className="text-xs text-rose-600 font-semibold">{currentUser.businessName} • {currentUser.city}</p>
              </div>
              <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${getRoleDetails(currentUser.role).badge}`}>
                {getRoleDetails(currentUser.role).label}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-stone-400 block mb-1.5 font-bold">התמחויות שלך:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.specialties.map(s => (
                    <span key={s} className="bg-rose-50 text-rose-700 font-bold px-3 py-1.5 rounded-xl border border-rose-100">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-stone-400 block mb-1.5 font-bold">שירותים נוספים:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.additionalServices.map(s => (
                    <span key={s} className="bg-stone-100 text-stone-600 font-medium px-2.5 py-1 rounded-lg">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-stone-400 block mb-1 font-bold">טלפון ליצירת קשר:</span>
                <span className="font-mono text-sm font-bold text-stone-900">{currentUser.phone}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-rose-100 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => setShowRoleChangeModal(true)}
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-md shadow-rose-200"
              >
                בקשת שדרוג תפקיד (מדריכה / ספקית) ✨
              </button>
              <button
                onClick={() => setCurrentStep('gate')}
                className="px-5 py-3 border border-rose-200 text-stone-500 hover:text-rose-600 rounded-2xl text-xs transition font-bold"
              >
                התנתקות
              </button>
            </div>
          </div>
        )}
      </main>

      {/* מודאל שדרוג תפקיד מעוצב */}
      {showRoleChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full rounded-[2rem] p-6 md:p-8 shadow-2xl border border-rose-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-rose-100">
              <h3 className="font-black text-stone-900 text-sm">בקשת שדרוג תפקיד בקהילה ✨</h3>
              <button onClick={() => setShowRoleChangeModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleChangeSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h4 className="font-black text-stone-900 text-base">הבקשה נשלחה באהבה! 💖</h4>
                <p className="text-xs text-stone-500 mt-1">מנהלת הקהילה תבדוק את המסמכים ותאשר את הסטטוס בהקדם.</p>
                <button
                  onClick={() => {
                    setShowRoleChangeModal(false);
                    setRoleChangeSuccess(false);
                  }}
                  className="mt-5 px-6 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold"
                >
                  סגור
                </button>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setRoleChangeSuccess(true);
                }} 
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">תפקיד מבוקש</label>
                  <select
                    value={roleChangeData.requestedRole}
                    onChange={(e) => setRoleChangeData({ ...roleChangeData, requestedRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-100 text-xs outline-none bg-rose-50/20"
                  >
                    <option value="instructor">מדריכה מוסמכת & אקדמיה 👑</option>
                    <option value="supplier">ספקית / מותג מורשה 💎</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">נימוק או קישור לתעודות / אתר</label>
                  <textarea
                    rows={3}
                    required
                    value={roleChangeData.reason}
                    onChange={(e) => setRoleChangeData({ ...roleChangeData, reason: e.target.value })}
                    placeholder="ספרי לנו קצת על הניסיון שלך, איפה עברת הכשרה או קישור לעסק..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-100 text-xs outline-none bg-rose-50/20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-md shadow-rose-200"
                >
                  שליחת בקשה לאישור
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}