# Nailhub Israel Community

import React, { useState } from 'react';

import { 

  Sparkles, 

  Search, 

  MapPin, 

  Phone, 

  ShieldCheck, 

  UserCheck, 

  Users, 

  User, 

  Layers, 

  Check, 

  ArrowRight,

  SlidersHorizontal,

  X

} from 'lucide-react';

// ==========================================

// 1. הגדרות תפקידים ותוויות (Constants & Roles)

// ==========================================

export const ROLES = {

  NAIL_TECH: { 

    id: 'nail_tech', 

    label: 'בונת ציפורניים ומניקוריסטית', 

    color: 'bg-rose-50 text-rose-700 border-rose-200' 

  },

  INSTRUCTOR: { 

    id: 'instructor', 

    label: 'מדריכה מוסמכת ואקדמיה', 

    color: 'bg-amber-50 text-amber-700 border-amber-200' 

  },

  SUPPLIER: { 

    id: 'supplier', 

    label: 'ספק / מותג מורשה', 

    color: 'bg-blue-50 text-blue-700 border-blue-200' 

  },

  CLIENT: { 

    id: 'client', 

    label: 'לקוחה', 

    color: 'bg-stone-100 text-stone-700 border-stone-200' 

  },

  MODEL: { 

    id: 'model', 

    label: 'מודליסטית', 

    color: 'bg-pink-50 text-pink-700 border-pink-200' 

  }

} as const;

type RoleKey = keyof typeof ROLES;

const ADDITIONAL_SERVICES_LIST = [

  'פדיקור קוסמטי',

  'פדיקור רפואי / טיפולי',

  'לק ג\'ל רגליים',

  'עיצוב ושיקום גבות',

  'הרמת גבות',

  'הרמת ריסים',

  'שזירת ריסים',

  'איפור קבוע',

  'טיפולי פנים'

];

const SPECIALTIES_LIST = [

  'מבנה אנטומי',

  'בנייה באקריל',

  'בנייה בג\'ל / פוליג\'ל',

  'דיפ פאוודר',

  'פרנץ\' מדויק',

  'ציורי ציפורניים וארט',

  'השלמת ציפורן שבורה',

  'מיניקוריסטיות מתחילות'

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

  accountStatus?: 'active' | 'pending_approval';

}

export default function NailHubApp() {

  // ניהול מצבי ניווט ומערכת

  const [currentStep, setCurrentStep] = useState<'gate' | 'login' | 'onboarding' | 'app'>('gate');

  const [activeTab, setActiveTab] = useState<'directory' | 'profile'>('directory');

  const [inviteCode, setInviteCode] = useState('');

  const [gateError, setGateError] = useState('');

  

  // נתוני המשתמשת המחוברת

  const [currentUser, setCurrentUser] = useState<Member | null>(null);

  // טופס הרשמה

  const [formData, setFormData] = useState({

    fullName: '',

    phone: '',

    city: 'קריית ביאליק',

    businessName: '',

    role: 'nail_tech',

    specialties: ['מבנה אנטומי', 'דיפ פאוודר'],

    additionalServices: ['פדיקור קוסמטי']

  });

  // מודאל בקשת שינוי תפקיד

  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);

  const [roleChangeData, setRoleChangeData] = useState({ requestedRole: 'instructor', reason: '' });

  const [roleChangeSuccess, setRoleChangeSuccess] = useState(false);

  // מאגר חברים לדוגמה בדירקטורי

  const [members, setMembers] = useState<Member[]>([

    {

      id: '1',

      fullName: 'ספיר גירוני',

      businessName: 'ספיר גירוני ביוטי',

      role: 'nail_tech',

      city: 'קריית ביאליק',

      specialties: ['מבנה אנטומי', 'דיפ פאוודר', 'פרנץ\' מדויק'],

      additionalServices: ['פדיקור קוסמטי', 'עיצוב ושיקום גבות'],

      phone: '050-0000000',

      accountStatus: 'active'

    },

    {

      id: '2',

      fullName: 'גולן גירוני',

      businessName: 'ליליאור אספקת ציוד',

      role: 'supplier',

      city: 'קריית ביאליק',

      specialties: ['ציוד מניקור', 'אבקות דיפ'],

      additionalServices: [],

      phone: '054-3289555',

      accountStatus: 'active'

    }

  ]);

  // פילטרים לדירקטורי

  const [filterRole, setFilterRole] = useState('all');

  const [searchQuery, setSearchQuery] = useState('');

  // ------------------------------------------

  // שלב 1: אימות שער כניסה (Invite Gate)

  // ------------------------------------------

  const handleVerifyInvite = (e: React.FormEvent) => {

    e.preventDefault();

    if (inviteCode.trim().toUpperCase() === 'NAILVIP') {

      setGateError('');

      setCurrentStep('onboarding');

    } else {

      setGateError('קוד הזמנה שגוי. הגישה כרגע היא למוזמנות פיילוט בלבד (קוד לדוגמה: NAILVIP)');

    }

  };

  // ------------------------------------------

  // שלב 2: סיום הרשמה

  // ------------------------------------------

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

      accountStatus: formData.role === 'supplier' ? 'pending_approval' : 'active'

    };

    setCurrentUser(newUser);

    setMembers(prev => [newUser, ...prev]);

    setCurrentStep('app');

  };

  // ------------------------------------------

  // שלב 3: התחברות למשתמשת קיימת (Mock Login)

  // ------------------------------------------

  const handleLogin = (e: React.FormEvent) => {

    e.preventDefault();

    const existing = members[0];

    setCurrentUser(existing);

    setCurrentStep('app');

  };

  // עזר לבחירה מרובה (Toggle)

  const toggleItem = (list: string[], item: string) => {

    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];

  };

  const getRoleDetails = (roleId: string) => {

    const found = Object.values(ROLES).find(r => r.id === roleId);

    return found || ROLES.NAIL_TECH;

  };

  // ==========================================

  // תצוגת שער הגישה (Invite Gate UI)

  // ==========================================

  if (currentStep === 'gate') {

    return (

      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-right" dir="rtl">

        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-200">

          <div className="text-center mb-6">

            <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl mb-3 shadow-inner">

              <Sparkles className="w-7 h-7" />

            </div>

            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">NailHub</h1>

            <p className="text-sm text-stone-500 mt-1">קהילת הציפורניים המקצועית של ישראל</p>

          </div>

          

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-amber-900 text-sm leading-relaxed">

            האפליקציה נמצאת בשלב הרצה סגור (VIP Pilot). הכניסה באמצעות קוד גישה מורשה בלבד.

          </div>

          <form onSubmit={handleVerifyInvite} className="space-y-4">

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-1">קוד הזמנה לפיילוט *</label>

              <input

                type="text"

                value={inviteCode}

                onChange={(e) => setInviteCode(e.target.value)}

                placeholder="הזיני קוד גישה (לדוגמה: NAILVIP)"

                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-center font-mono text-lg tracking-widest uppercase"

              />

            </div>

            {gateError && <p className="text-xs text-rose-600 font-medium">{gateError}</p>}

            <button

              type="submit"

              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl transition shadow-md"

            >

              אימות וכניסה

            </button>

          </form>

          <div className="mt-6 text-center pt-4 border-t border-stone-100">

            <button 

              onClick={() => setCurrentStep('login')}

              className="text-xs text-stone-500 hover:text-stone-900 font-medium inline-flex items-center gap-1"

            >

              כבר חברה בקהילה? לחצי להתחברות

              <ArrowRight className="w-3.5 h-3.5 rotate-180" />

            </button>

          </div>

        </div>

      </div>

    );

  }

  // ==========================================

  // תצוגת התחברות (Login Screen)

  // ==========================================

  if (currentStep === 'login') {

    return (

      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-right" dir="rtl">

        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-200">

          <div className="text-center mb-6">

            <h1 className="text-2xl font-bold text-stone-900">התחברות ל-NailHub</h1>

            <p className="text-xs text-stone-500 mt-1">הזיני את פרטייך לכניסה למערכת</p>

          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-1">מספר טלפון נייד</label>

              <input

                type="tel"

                defaultValue="050-0000000"

                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-left font-mono"

                dir="ltr"

              />

            </div>

            <button

              type="submit"

              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl transition shadow-md"

            >

              כניסה מהירה

            </button>

          </form>

          <div className="mt-6 text-center">

            <button 

              onClick={() => setCurrentStep('gate')}

              className="text-xs text-stone-500 hover:text-stone-900"

            >

              חזרה לשער ההזמנות

            </button>

          </div>

        </div>

      </div>

    );

  }

  // ==========================================

  // תצוגת אונבורדינג והרשמה (Onboarding)

  // ==========================================

  if (currentStep === 'onboarding') {

    return (

      <div className="min-h-screen bg-stone-50 py-10 px-4 font-sans text-right" dir="rtl">

        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-stone-200">

          <div className="mb-6 pb-4 border-b border-stone-100">

            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">שלב 2 מתוך 2</span>

            <h1 className="text-2xl font-black text-stone-900 mt-1">הגדרת הפרופיל המקצועי שלך</h1>

            <p className="text-xs text-stone-500 mt-1">המידע יוצג בדירקטורי החברות של NailHub</p>

          </div>

          <form onSubmit={handleCompleteRegistration} className="space-y-6">

            {/* פרטים בסיסיים */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label className="block text-xs font-bold text-stone-700 mb-1">שם מלא *</label>

                <input

                  type="text"

                  required

                  value={formData.fullName}

                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}

                  placeholder="לדוגמה: שרה ישראלי"

                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-sm"

                />

              </div>

              <div>

                <label className="block text-xs font-bold text-stone-700 mb-1">שם העסק / מותג</label>

                <input

                  type="text"

                  value={formData.businessName}

                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}

                  placeholder="לדוגמה: שרה ביוטי סטודיו"

                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-sm"

                />

              </div>

              <div>

                <label className="block text-xs font-bold text-stone-700 mb-1">עיר פעילות *</label>

                <input

                  type="text"

                  required

                  value={formData.city}

                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}

                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-sm"

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

                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-sm text-left"

                  dir="ltr"

                />

              </div>

            </div>

            {/* בחירת תפקיד עיקרי */}

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-2">תפקיד עיקרי בקהילה *</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                {Object.values(ROLES).map((role) => (

                  <label

                    key={role.id}

                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${

                      formData.role === role.id 

                        ? 'border-stone-900 bg-stone-900 text-white shadow-sm' 

                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-800'

                    }`}

                  >

                    <input

                      type="radio"

                      name="role"

                      value={role.id}

                      checked={formData.role === role.id}

                      onChange={() => setFormData({ ...formData, role: role.id })}

                      className="hidden"

                    />

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.role === role.id ? 'border-white' : 'border-stone-400'}`}>

                      {formData.role === role.id && <div className="w-2 h-2 rounded-full bg-white" />}

                    </div>

                    <span className="text-xs font-bold">{role.label}</span>

                  </label>

                ))}

              </div>

            </div>

            {/* תחומי התמחות */}

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-2">תחומי התמחות מקצועיים</label>

              <div className="flex flex-wrap gap-2">

                {SPECIALTIES_LIST.map((spec) => {

                  const isSelected = formData.specialties.includes(spec);

                  return (

                    <button

                      type="button"

                      key={spec}

                      onClick={() => setFormData({ ...formData, specialties: toggleItem(formData.specialties, spec) })}

                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${

                        isSelected 

                          ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold' 

                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'

                      }`}

                    >

                      {isSelected && '✓ '}

                      {spec}

                    </button>

                  );

                })}

              </div>

            </div>

            {/* שירותים נוספים */}

            <div>

              <label className="block text-xs font-bold text-stone-700 mb-2">שירותים וטיפולים נלווים בקליניקה</label>

              <div className="flex flex-wrap gap-2">

                {ADDITIONAL_SERVICES_LIST.map((srv) => {

                  const isSelected = formData.additionalServices.includes(srv);

                  return (

                    <button

                      type="button"

                      key={srv}

                      onClick={() => setFormData({ ...formData, additionalServices: toggleItem(formData.additionalServices, srv) })}

                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${

                        isSelected 

                          ? 'bg-stone-900 text-white border-stone-900' 

                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'

                      }`}

                    >

                      {isSelected && '✓ '}

                      {srv}

                    </button>

                  );

                })}

              </div>

            </div>

            <button

              type="submit"

              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl transition shadow-lg text-sm"

            >

              השלמת הרשמה וכניסה לאפליקציה

            </button>

          </form>

        </div>

      </div>

    );

  }

  // ==========================================

  // תצוגת האפליקציה המרכזית (Main App UI)

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

    <div className="min-h-screen bg-stone-50 font-sans text-right" dir="rtl">

      {/* סרגל עליון */}

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200 px-4 py-3">

        <div className="max-w-6xl mx-auto flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center font-black">

              <Sparkles className="w-5 h-5" />

            </div>

            <div>

              <span className="font-extrabold text-base text-stone-900 block leading-tight">NailHub</span>

              <span className="text-[10px] text-stone-400 font-medium">קהילת הציפורניים של ישראל</span>

            </div>

          </div>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">

            <button

              onClick={() => setActiveTab('directory')}

              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'directory' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}

            >

              דירקטורי חברות

            </button>

            <button

              onClick={() => setActiveTab('profile')}

              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'profile' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}

            >

              הפרופיל שלי

            </button>

          </div>

        </div>

      </header>

      {/* גוף האפליקציה */}

      <main className="max-w-6xl mx-auto p-4 md:p-6">

        {/* לשונית דירקטורי */}

        {activeTab === 'directory' && (

          <div className="space-y-6">

            {/* סרגל חיפוש ופילטור */}

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">

              <div className="flex flex-col md:flex-row gap-3">

                <div className="relative flex-1">

                  <input

                    type="text"

                    value={searchQuery}

                    onChange={(e) => setSearchQuery(e.target.value)}

                    placeholder="חיפוש לפי שם, עיר, סטודיו או התמחות..."

                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none text-xs"

                  />

                  <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3 pointer-events-none" />

                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">

                  <button

                    onClick={() => setFilterRole('all')}

                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${

                      filterRole === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'

                    }`}

                  >

                    הכול ({members.length})

                  </button>

                  {Object.values(ROLES).map(r => (

                    <button

                      key={r.id}

                      onClick={() => setFilterRole(r.id)}

                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${

                        filterRole === r.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'

                      }`}

                    >

                      {r.label}

                    </button>

                  ))}

                </div>

              </div>

            </div>

            {/* רשימת כרטיסי חברות */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {filteredMembers.map((m) => {

                const role = getRoleDetails(m.role);

                return (

                  <div key={m.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">

                    <div>

                      <div className="flex items-start justify-between mb-3">

                        <div>

                          <h3 className="font-bold text-stone-900 text-base">{m.fullName}</h3>

                          <p className="text-xs text-stone-500">{m.businessName}</p>

                        </div>

                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${role.color}`}>

                          {role.label}

                        </span>

                      </div>

                      <div className="flex items-center gap-1 text-stone-500 text-xs mb-3">

                        <MapPin className="w-3.5 h-3.5" />

                        <span>{m.city}</span>

                      </div>

                      {/* התמחויות */}

                      {m.specialties.length > 0 && (

                        <div className="mb-3">

                          <span className="text-[10px] text-stone-400 block mb-1 font-bold">התמחויות:</span>

                          <div className="flex flex-wrap gap-1">

                            {m.specialties.map(s => (

                              <span key={s} className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px]">

                                {s}

                              </span>

                            ))}

                          </div>

                        </div>

                      )}

                      {/* שירותים נלווים */}

                      {m.additionalServices.length > 0 && (

                        <div className="mb-4">

                          <span className="text-[10px] text-stone-400 block mb-1 font-bold">שירותים נוספים:</span>

                          <div className="flex flex-wrap gap-1">

                            {m.additionalServices.map(s => (

                              <span key={s} className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px]">

                                {s}

                              </span>

                            ))}

                          </div>

                        </div>

                      )}

                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">

                      <a 

                        href={`tel:${m.phone}`}

                        className="inline-flex items-center gap-1 text-stone-700 font-bold hover:text-stone-900"

                      >

                        <Phone className="w-3.5 h-3.5 text-rose-500" />

                        <span>{m.phone}</span>

                      </a>

                      <button className="text-[11px] text-stone-400 hover:text-stone-700 font-medium">

                        צפייה בפרופיל

                      </button>

                    </div>

                  </div>

                );

              })}

            </div>

          </div>

        )}

        {/* לשונית פרופיל אישי */}

        {activeTab === 'profile' && currentUser && (

          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-6">

            <div className="flex items-center justify-between pb-4 border-b border-stone-100">

              <div>

                <h2 className="text-xl font-black text-stone-900">{currentUser.fullName}</h2>

                <p className="text-xs text-stone-500">{currentUser.businessName} • {currentUser.city}</p>

              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${getRoleDetails(currentUser.role).color}`}>

                {getRoleDetails(currentUser.role).label}

              </span>

            </div>

            <div className="space-y-4 text-xs text-stone-700">

              <div>

                <span className="text-stone-400 block mb-1 font-bold">תחומי התמחות:</span>

                <div className="flex flex-wrap gap-1.5">

                  {currentUser.specialties.map(s => (

                    <span key={s} className="bg-stone-100 px-2.5 py-1 rounded-lg font-medium">{s}</span>

                  ))}

                </div>

              </div>

              <div>

                <span className="text-stone-400 block mb-1 font-bold">שירותים נלווים:</span>

                <div className="flex flex-wrap gap-1.5">

                  {currentUser.additionalServices.map(s => (

                    <span key={s} className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg font-medium">{s}</span>

                  ))}

                </div>

              </div>

              <div className="pt-2">

                <span className="text-stone-400 block mb-1 font-bold">טלפון לקביעת תורים / קשר:</span>

                <span className="font-mono text-sm font-bold text-stone-900">{currentUser.phone}</span>

              </div>

            </div>

            <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row gap-2">

              <button

                onClick={() => setShowRoleChangeModal(true)}

                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2.5 rounded-xl text-xs transition"

              >

                בקשת שינוי / שדרוג תפקיד

              </button>

              <button

                onClick={() => setCurrentStep('gate')}

                className="px-4 py-2.5 border border-stone-200 text-stone-500 hover:text-rose-600 rounded-xl text-xs transition font-medium"

              >

                התנתקות

              </button>

            </div>

          </div>

        )}

      </main>

      {/* מודאל בקשת שינוי תפקיד */}

      {showRoleChangeModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">

          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-stone-200">

            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">

              <h3 className="font-bold text-stone-900 text-sm">בקשת שדרוג / שינוי תפקיד</h3>

              <button onClick={() => setShowRoleChangeModal(false)} className="text-stone-400 hover:text-stone-600">

                <X className="w-5 h-5" />

              </button>

            </div>

            {roleChangeSuccess ? (

              <div className="text-center py-6">

                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">

                  <Check className="w-6 h-6" />

                </div>

                <h4 className="font-bold text-stone-900 text-sm">הבקשה נשלחה בהצלחה!</h4>

                <p className="text-xs text-stone-500 mt-1">מנהלת הקהילה תבדוק את הפרטים ותעדכן את הסטטוס.</p>

                <button

                  onClick={() => {

                    setShowRoleChangeModal(false);

                    setRoleChangeSuccess(false);

                  }}

                  className="mt-4 px-6 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold"

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

                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none"

                  >

                    <option value="instructor">מדריכה מוסמכת ואקדמיה</option>

                    <option value="supplier">ספק / מותג מורשה</option>

                    <option value="nail_tech">בונת ציפורניים ומניקוריסטית</option>

                  </select>

                </div>

                <div>

                  <label className="block text-xs font-bold text-stone-700 mb-1">נימוק או קישור לתעודות / מסמכים</label>

                  <textarea

                    rows={3}

                    required

                    value={roleChangeData.reason}

                    onChange={(e) => setRoleChangeData({ ...roleChangeData, reason: e.target.value })}

                    placeholder="פרטי מדוע את מבקשת לשנות תפקיד (למשל: סיום קורס מדריכות, פתיחת חנות וכו')..."

                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none"

                  />

                </div>

                <button

                  type="submit"

                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-xl text-xs transition"

                >

                  שליחת בקשה לאישור מנהלת

                </button>

              </form>

            )}

          </div>

        </div>

      )}

    </div>

  );

}

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bc4f06b9-047d-53b1-b79e-961e18b39d90).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
