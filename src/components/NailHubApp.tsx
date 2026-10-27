import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HubShell, type HubSection } from './HubShell';
import { HubWorkspace } from './HubWorkspace';
import { AdminPanel } from './AdminPanel';
import { SupportForm } from './SupportForm';
import { Link,useNavigate } from '@tanstack/react-router';
import {RegistrationForm} from './RegistrationForm';
import { Button } from './ui/button';
import {PasswordField} from './PasswordField';
import {lovable} from '@/integrations/lovable/index';
import {isPasswordAllowed,PASSWORD_LENGTH_MESSAGE} from '@/lib/password-policy';
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
  const [currentStep, setCurrentStep] = useState<'gate' | 'login' | 'onboarding' | 'app'>('onboarding');
  const activeTab = section;
  const navigate=useNavigate();

  
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
  const [roleError,setRoleError]=useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [authLoading, setAuthLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    const { data: adminCheck } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    setIsAdmin(adminCheck === true);
    setCurrentStep('app');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) loadData(data.session.user.id); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) loadData(session.user.id);
      if (event === 'SIGNED_OUT') { setCurrentUser(null); setMembers([]); setIsAdmin(false); setCurrentStep('login'); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (![formData.fullName, formData.businessName, formData.city].every(v => plainText(150).safeParse(v).success) || !phoneText.safeParse(formData.phone).success) {
      setAuthError('יש להזין טקסט רגיל ומספר טלפון תקין'); return;
    }
    setAuthError('');
    if (!isPasswordAllowed(authPassword)) {setAuthError(PASSWORD_LENGTH_MESSAGE);return;}
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
    if(data.session){await loadData(data.session.user.id);await navigate({to:'/feed',search:{compose:false}});}
    else {const {data:login,error:loginError}=await supabase.auth.signInWithPassword({email:authEmail.trim(),password:authPassword});if(loginError||!login.session){setAuthError(hebrewError(loginError,'לא ניתן להתחבר כרגע. נסי שוב.'));return;}await loadData(login.session.user.id);await navigate({to:'/feed',search:{compose:false}});}
    } catch(error) {setAuthError(hebrewError(error));} finally {setAuthLoading(false);}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(''); setAuthLoading(true);
    try {
    const {data,error} = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
    setAuthLoading(false);
    if (error) setAuthError(hebrewError(error));
    else if(data.session){await loadData(data.session.user.id);await navigate({to:'/feed',search:{compose:false}});}
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
  // מסך 2: התחברות מהירה
  // ==========================================
  if (currentStep === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans text-right" dir="rtl">
        <div className="max-w-md w-full bg-card backdrop-blur-xl rounded-3xl shadow-soft p-8 md:p-10 border border-border">
          <div className="text-right mb-6">
            <h1 className="text-2xl font-black text-foreground">היי, כיף שחזרת! 💖</h1>
            <p className="text-xs text-foreground mt-1">הזיני אימייל וסיסמה לכניסה לחשבון</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">אימייל *</label>
              <input type="email" required autoComplete="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent" dir="rtl" />
            </div>
            <PasswordField value={authPassword} onChange={setAuthPassword} autoComplete="current-password"/>
            {authError && <p className="text-xs text-primary bg-accent rounded-xl p-2 text-right">{authError}</p>}
            <Button
              type="submit"
              className="w-full bg-rose-glam hover:opacity-90 text-primary-foreground font-bold py-3.5 rounded-2xl transition shadow-md text-sm"
            >
              {authLoading ? 'מתחברת...' : 'כניסה לאפליקציה'}
            </Button>
          </form>
          <div className="mt-4 space-y-2">
            <div className="text-center text-xs text-muted-foreground">או כניסה מהירה עם</div>
            <div className="grid grid-cols-2 gap-2">
              {(['google','apple'] as const).map(p=><Button key={p} type="button" variant="outline" className="rounded-2xl text-sm font-bold" onClick={async()=>{setAuthError('');const r=await lovable.auth.signInWithOAuth(p,{redirect_uri:window.location.origin+'/feed'});if(r.error){setAuthError(hebrewError(r.error,'לא ניתן להתחבר כרגע. נסי שוב.'));return;}if(r.redirected)return;await navigate({to:'/feed',search:{compose:false}});}}>{p==='google'?'Google':'Apple'}</Button>)}
            </div>
          </div>

          <div className="mt-6 text-right">
            <Button 
              onClick={() => {setAuthError('');setCurrentStep('onboarding');}}
              className="text-xs text-foreground hover:text-foreground font-medium"
            >
              חדשה כאן? להרשמה מהירה
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // מסך 3: אונבורדינג והרשמה מהממת
  // ==========================================
  if(currentStep==='onboarding'){return <RegistrationForm details={formData} onChange={setFormData} email={authEmail} onEmail={setAuthEmail} password={authPassword} onPassword={setAuthPassword} onSubmit={handleCompleteRegistration} onLogin={()=>{setAuthError('');setCurrentStep('login');}} busy={authLoading} error={authError} specialties={SPECIALTIES_LIST} services={ADDITIONAL_SERVICES_LIST}/>;}

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
    <HubShell section={section} name={currentUser?.fullName} onSignOut={handleSignOut} isAdmin={isAdmin}>
        {authError && <p role="alert" className="text-right text-sm text-destructive mb-4">{authError}</p>}
        {activeTab === 'admin' && (isAdmin ? <AdminPanel /> : <p className="text-sm text-muted-foreground py-8 text-center">אזור הניהול פתוח למנהלות בלבד</p>)}
        {activeTab === 'support' && currentUser && <SupportForm user={currentUser} />}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            
            {/* כותרת קהילה מעוצבת */}
            <div className=" rounded-3xl p-6 text-foreground shadow-soft relative overflow-hidden">
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
                        ? 'bg-accent text-accent-foreground shadow-soft' 
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
                          ? 'bg-accent text-accent-foreground shadow-soft' 
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
                    className="bg-card rounded-3xl border border-border p-5 shadow-sm hover:shadow-soft transition duration-300 flex flex-col justify-between group hover:-translate-y-1"
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
                              <span key={s} className="bg-accent text-primary font-semibold px-2.5 py-1 rounded-3xl text-[11px] border border-border">
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
          <div className="max-w-xl mx-auto bg-card backdrop-blur-xl rounded-3xl border border-border p-6 md:p-8 shadow-soft space-y-6">
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
                    <span key={s} className="bg-accent text-foreground font-medium px-2.5 py-1 rounded-3xl">
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
                onClick={() => {setRoleError('');setShowRoleChangeModal(true);}}
                className="flex-1 text-primary-foreground font-extrabold py-3 rounded-2xl text-xs transition shadow-soft"
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
          <div className="bg-card max-w-md w-full rounded-3xl p-6 md:p-8 shadow-soft border border-border">
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
                  className="mt-5 px-6 py-2.5 bg-accent text-accent-foreground rounded-xl text-xs font-bold"
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
                  if (!reason.success) { setRoleError('יש להזין טקסט רגיל בלבד, עד 2000 תווים'); return; }
                  supabase.from('role_change_requests').insert({ user_id: currentUser.id, current_role: currentUser.role, requested_role: roleChangeData.requestedRole, reason: reason.data })
                    .then(({ error }) => { if (!error) setRoleChangeSuccess(true); else setRoleError(hebrewError(error, 'שליחת הבקשה נכשלה. נסי שוב.')); }, (error: unknown) => setRoleError(hebrewError(error)));
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

                {roleError && <p role="alert" className="text-right text-sm text-destructive">{roleError}</p>}
                <Button
                  type="submit"
                  className="w-full hover: hover: text-primary-foreground font-extrabold py-3 rounded-xl text-xs transition shadow-soft"
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