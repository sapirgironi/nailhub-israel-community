import React, { useEffect, useRef, useState } from 'react';
import {useInfiniteQuery} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {Database} from '@/integrations/supabase/types';
import { HubShell, type HubSection } from './HubShell';
import { HubWorkspace } from './HubWorkspace';
import {PhotoImage} from './PhotoImage';
import { AdminPanel } from './AdminPanel';
import { SupportForm } from './SupportForm';
import { Link,useNavigate } from '@tanstack/react-router';
import {RegistrationForm} from './RegistrationForm';
import { Button } from './ui/button';
import {uploadPhoto} from '@/lib/media';
import {ImageUploadStatus} from './ImageUploadStatus';
import {HebrewPhotoInput} from './HebrewPhotoInput';
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
  GraduationCap,
  Heart, 
  Users, 
  User, 
  ArrowRight,
  Check, 
  X,
  ShoppingBag,
  Award,
  Flame,
  BadgeCheck,
  LoaderCircle
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
    icon: GraduationCap
  },
  SUPPLIER: { 
    id: 'supplier', 
    label: 'ספקית & מותג מורשה', 
    badge: 'bg-accent text-primary border-border shadow-soft',
    icon: ShoppingBag
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
  'עיצוב גבות',
  'שעוות והסרת שיער',
  'הסרת שיער בלייזר',
  'פדיקור',
  'פדיקור רפואי',
  'הרמת ריסים',
  'הרמת גבות',
  'הלחמת ריסים',
  'קוסמטיקה',
  'איפור קבוע',
  'הגעה לבית הלקוחה (VIP)',
  'מקלחון שיזוף',
  'ועוד...'
];

const SPECIALTIES_LIST = [
  'מבנה אנטומי',
  'מבנה אדריכלי',
  'דיפ פאוודר',
  'מניקור יסודי',
  'שיקום ציפורניים טבעיות',
  'כוססות',
  'בנייה באקריל',
  'בנייה בג\'ל',
  'בנייה בפוליג\'ל',
  'מילוי באקריל',
  'מילוי בג\'ל',
  'מילוי בפוליג\'ל',
  'אקסטרים',
  'אקווריום',
  'ציורים וקישוטים',
  'תוספות מיוחדות',
  'פרנץ\'',
  'אומברה',
  'טיפסים הפוכים',
  'ציפורניים ארוכות',
  'ג\'לי טיפס',
  'ג\'ל X',
  'לק ג\'ל רגליים'
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
  avatar?: string | undefined;
}
type DirectoryCursor={displayName:string;id:string};
type ProfileRow=Database['public']['Tables']['profiles']['Row'];

export function NailHubApp({section = 'feed'}: {section?: HubSection}) {
  const [currentStep, setCurrentStep] = useState<'gate' | 'login' | 'onboarding' | 'app'>('login');
  const activeTab = section;
  const navigate=useNavigate();

  
  const [currentUser, setCurrentUser] = useState<Member | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: 'קריית ביאליק',
    businessName: '',
    role: 'nail_tech',
    specialties: ['מבנה אנטומי', 'ציורים וקישוטים'],
    additionalServices: ['פדיקור']
  });

  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState({ requestedRole: 'instructor', reason: '' });
  const [roleChangeSuccess, setRoleChangeSuccess] = useState(false);
  const [roleError,setRoleError]=useState('');

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'request' | 'otp' | 'password'>('none');
  const [recoveryChannel, setRecoveryChannel] = useState<'email' | 'sms'>('email');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const recoveryPending = useRef(false);
  const [profileCompletion, setProfileCompletion] = useState(false);
  const [profileCompletionUserId, setProfileCompletionUserId] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [photoBusy,setPhotoBusy]=useState(false);
  const saveAvatar=async(file:File|null)=>{if(!file||!currentUser||photoBusy)return;setPhotoBusy(true);setAuthError('');try{const avatar_url=await uploadPhoto(file);const {data,error}=await supabase.from('profiles').update({avatar_url}).eq('id',currentUser.id).select('id').single();if(error||!data)throw new Error('save');await loadData(currentUser.id);}catch{setAuthError('שמירת תמונת הפרופיל נכשלה. נסי שוב.');}finally{setPhotoBusy(false);}};
  const [blocked, setBlocked] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const checkAccess = async (userId: string) => {
    const { data, error } = await supabase.rpc('is_account_banned', { target_user: userId });
    if (error || data !== false) {
      setBlocked(true); setCurrentUser(null); setIsAdmin(false);
      setAuthError(error ? 'בדיקת הגישה נכשלה. נסי שוב.' : 'החשבון נחסם לצמיתות. אין אפשרות להיכנס לאפליקציה.');
      setAccessChecked(true);
      return false;
    }
    setBlocked(false); setAccessChecked(true); return true;
  };

  const toMember = (p: ProfileRow): Member => ({
    id: p.id, fullName: p.display_name, businessName: p.business_name || p.display_name, role: p.account_role,
    city: p.city || '', specialties: p.specialties || [], additionalServices: p.additional_services || [],
    phone: p.hide_phone ? '' : p.phone, isVerified: !!p.is_verified,
  });

  const loadData = async (userId: string) => {
    if (!await checkAccess(userId)) return;
    const { data: authData, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !authData.user) {
      setAuthError(hebrewError(authUserError, 'לא ניתן לטעון את החשבון. התחברי שוב.'));
      return;
    }
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) { setAuthError('טעינת הפרופיל נכשלה. נסי להתחבר שוב.'); return; }
    const provider = authData.user.app_metadata.provider;
    if ((provider === 'google' || provider === 'apple') && (!profile || !profile.business_name?.trim())) {
      const metadataName = authData.user.user_metadata['full_name'] ?? authData.user.user_metadata['name'];
      setFormData((previous) => ({
        ...previous,
        fullName: profile?.display_name || (typeof metadataName === 'string' ? metadataName : '') || authData.user.email?.split('@')[0] || '',
        businessName: profile?.business_name ?? '',
        phone: profile?.phone ?? '',
        city: profile?.city || previous.city,
        role: Object.values(ROLES).find((role) => role.id === profile?.account_role)?.id ?? 'nail_tech',
        specialties: profile?.specialties ?? previous.specialties,
        additionalServices: profile?.additional_services ?? previous.additionalServices,
      }));
      setProfileCompletion(true);
      setProfileCompletionUserId(userId);
      setCurrentUser(null);
      setCurrentStep('onboarding');
      return;
    }
    const signedInMember = profile ? {...toMember(profile),avatar:profile.avatar_url||undefined} : null;
    if (!signedInMember) {
      setCurrentUser(null);
      setCurrentStep('login');
      setAuthError('לא נמצא פרופיל לחשבון. התחברי שוב או פני לתמיכה.');
      return;
    }
    setProfileCompletion(false);
    setProfileCompletionUserId(null);
    setCurrentUser(signedInMember);
    const { data: adminCheck } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    setIsAdmin(adminCheck === true);
    setCurrentStep('app');
  };

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      recoveryPending.current = true;
      setRecoveryMode('password');
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recoveryPending.current) void loadData(data.session.user.id);
      else setAccessChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryPending.current = true;
        setRecoveryMode('password');
        setRecoveryNotice('');
        setCurrentStep('login');
        setAccessChecked(true);
      }
      if (event === 'SIGNED_IN' && session && !recoveryPending.current) void loadData(session.user.id);
      if (event === 'SIGNED_OUT') {
        recoveryPending.current = false;
        setCurrentUser(null); setIsAdmin(false); setProfileCompletion(false); setProfileCompletionUserId(null);
        setRecoveryMode('none'); setCurrentStep('login');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const refreshAccess = () => { void checkAccess(currentUser.id); };
    const timer = window.setInterval(refreshAccess, 15000);
    window.addEventListener('focus', refreshAccess);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshAccess); };
  }, [currentUser?.id]);

  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [directorySearch,setDirectorySearch]=useState('');
  useEffect(()=>{const timer=window.setTimeout(()=>setDirectorySearch(searchQuery.trim()),250);return()=>window.clearTimeout(timer);},[searchQuery]);
  const directory=useInfiniteQuery({
    queryKey:['community-directory',currentUser?.id,directorySearch,filterRole],
    enabled:activeTab==='directory'&&Boolean(currentUser),
    initialPageParam:null as DirectoryCursor|null,
    queryFn:async({pageParam})=>{
      const {data,error}=await supabase.rpc('community_members',{
        search_text:directorySearch,
        role_filter:filterRole==='all'?'':filterRole,
        after_name:pageParam?.displayName??null,
        after_id:pageParam?.id??null,
        page_size:24,
      });
      if(error)throw error;
      const last=data.at(-1);
      return {rows:data,nextCursor:data.length===24&&last?{displayName:last.display_name,id:last.id}:null};
    },
    getNextPageParam:lastPage=>lastPage.nextCursor??undefined,
  });

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileCompletion) {
      if (!profileCompletionUserId || ![formData.fullName, formData.businessName].every(value => plainText(150).safeParse(value).success) || !Object.values(ROLES).some(role => role.id === formData.role)) {
        setAuthError('יש להזין שם ושם עסק תקינים ולבחור תפקיד.');
        return;
      }
      setAuthError('');
      setAuthLoading(true);
      try {
        const { data, error } = await supabase.from('profiles').update({
          display_name: formData.fullName.trim(),
          business_name: formData.businessName.trim(),
          account_role: formData.role,
        }).eq('id', profileCompletionUserId).select('id').maybeSingle();
        if (error) {
          setAuthError(hebrewError(error, 'שמירת הפרופיל נכשלה. נסי שוב.'));
          return;
        }
        if (!data) {
          setAuthError('לא נמצא פרופיל קיים להשלמה. נסי להתחבר שוב או פני לתמיכה.');
          return;
        }
        setProfileCompletion(false);
        setProfileCompletionUserId(null);
        await loadData(data.id);
        await navigate({to:'/feed',search:{compose:false}});
      } catch (error) {
        setAuthError(hebrewError(error, 'שמירת הפרופיל נכשלה. נסי שוב.'));
      } finally {
        setAuthLoading(false);
      }
      return;
    }
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
    const identifier = authEmail.trim();
    const credentials = identifier.includes('@')
      ? { email: identifier, password: authPassword }
      : { phone: identifier, password: authPassword };
    const {data,error} = await supabase.auth.signInWithPassword(credentials);
    if (error) setAuthError(hebrewError(error));
    else if(data.session){await loadData(data.session.user.id);await navigate({to:'/feed',search:{compose:false}});}
    } catch(error) {setAuthError(hebrewError(error));} finally {setAuthLoading(false);}
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + '/feed' });
      if (result.error) {
        setAuthError(hebrewError(result.error, 'לא ניתן להתחבר כרגע. נסי שוב.'));
        return;
      }
      if (!result.redirected) await navigate({to:'/feed',search:{compose:false}});
    } catch (error) {
      setAuthError(hebrewError(error, 'לא ניתן להתחבר כרגע. נסי שוב.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setRecoveryNotice('');
    setAuthLoading(true);
    try {
      if (recoveryMode === 'request' && recoveryChannel === 'email') {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setRecoveryNotice('אם הכתובת משויכת לחשבון, נשלח אליה קישור מאובטח לאיפוס הסיסמה.');
      } else if (recoveryMode === 'request') {
        const phone = authEmail.trim();
        if (!phoneText.safeParse(phone).success) {
          setAuthError('יש להזין מספר טלפון תקין.');
          return;
        }
        const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
        if (error) throw error;
        setRecoveryMode('otp');
        setRecoveryNotice('אם קיים חשבון עם מספר זה המאומת ב-Supabase Auth, נשלח אליו קוד חד-פעמי.');
      } else if (recoveryMode === 'otp') {
        recoveryPending.current = true;
        const { data, error } = await supabase.auth.verifyOtp({ phone: authEmail.trim(), token: recoveryOtp.trim(), type: 'sms' });
        if (error) {
          recoveryPending.current = false;
          throw error;
        }
        if (!data.session) {
          recoveryPending.current = false;
          throw new Error('No recovery session was created');
        }
        setRecoveryMode('password');
        setRecoveryNotice('המספר אומת. בחרי סיסמה חדשה לחשבון.');
      } else if (recoveryMode === 'password') {
        if (!isPasswordAllowed(recoveryPassword)) {
          setAuthError(PASSWORD_LENGTH_MESSAGE);
          return;
        }
        if (recoveryPassword !== recoveryPasswordConfirm) {
          setAuthError('הסיסמאות אינן תואמות.');
          return;
        }
        const { data, error } = await supabase.auth.updateUser({ password: recoveryPassword });
        if (error) throw error;
        if (!data.user) throw new Error('Password update returned no user');
        recoveryPending.current = false;
        setRecoveryMode('none');
        setRecoveryNotice('');
        setRecoveryOtp('');
        setRecoveryPassword('');
        setRecoveryPasswordConfirm('');
        await loadData(data.user.id);
        await navigate({to:'/feed',search:{compose:false}});
      }
    } catch (error) {
      setAuthError(hebrewError(error, recoveryMode === 'request' && recoveryChannel === 'sms'
        ? 'לא ניתן לשלוח קוד למספר הזה. בדקי שהטלפון מאומת בחשבון או השתמשי באימייל.'
        : 'לא ניתן להשלים את איפוס הסיסמה. נסי שוב.'));
    } finally {
      setAuthLoading(false);
    }
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
  if (!accessChecked) return <div dir="rtl" className="min-h-screen grid place-items-center text-muted-foreground">בודקת גישה...</div>;
  if (blocked) return <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center p-6 gap-4 text-right"><h1 className="text-xl font-bold">אין גישה לאפליקציה</h1><p role="alert" className="text-destructive">{authError}</p><Button variant="outline" onClick={() => { setBlocked(false); void handleSignOut(); }}>התנתקות</Button></div>;
  if (currentStep === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans text-right" dir="rtl">
        <div className="max-w-md w-full bg-card backdrop-blur-xl rounded-3xl shadow-soft p-8 md:p-10 border border-border">
          <div className="text-right mb-6">
            <h1 className="text-2xl font-black text-foreground">היי, כיף שחזרת! 💖</h1>
            <p className="text-xs text-foreground mt-1">{recoveryMode === 'none' ? 'התחברי לקהילה המקצועית שלך' : 'איפוס מאובטח של סיסמת החשבון'}</p>
          </div>

          {recoveryMode === 'none' ? <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" disabled={authLoading} className="rounded-2xl text-sm font-bold" onClick={() => void handleOAuthLogin('google')}>
                <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.5a12 12 0 0 1 0-7V15H5.8a20 20 0 0 0 0 18l6.8-5.5Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.5C14.2 15.7 18.7 12.1 24 12.1Z"/></svg>
                התחברי באמצעות Google
              </Button>
              <Button type="button" variant="outline" disabled={authLoading} className="rounded-2xl text-sm font-bold" onClick={() => void handleOAuthLogin('apple')}>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M16.37 12.67c.02 2.2 1.93 2.93 1.95 2.94-.02.05-.3 1.03-1 2.04-.6.87-1.23 1.74-2.22 1.76-.97.02-1.28-.57-2.38-.57-1.1 0-1.45.55-2.37.59-.95.04-1.67-.94-2.27-1.8-1.23-1.78-2.17-5.03-.9-7.22.63-1.09 1.76-1.78 2.99-1.8.93-.02 1.8.63 2.38.63.57 0 1.64-.78 2.76-.66.47.02 1.8.19 2.65 1.43-.07.04-1.58.92-1.57 2.66ZM14.55 6.8c.5-.6.84-1.44.75-2.28-.72.03-1.59.48-2.1 1.08-.46.53-.87 1.38-.76 2.2.8.06 1.61-.41 2.11-1Z"/></svg>
                התחברי באמצעות Apple
              </Button>
            </div>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border"/>
              <span>או באמצעות פרטי גישה</span>
              <span className="h-px flex-1 bg-border"/>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-identifier" className="block text-xs font-bold text-foreground mb-1.5">אימייל או טלפון *</label>
                <input id="login-identifier" type="text" required autoComplete="username" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent" dir="rtl" />
              </div>
              <PasswordField value={authPassword} onChange={setAuthPassword} autoComplete="current-password"/>
              <div className="text-left">
                <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => {setAuthError('');setRecoveryNotice('');setRecoveryMode('request');}}>
                  שכחת סיסמה?
                </Button>
              </div>
              {authError && <p role="alert" className="text-xs text-destructive bg-accent rounded-xl p-2 text-right">{authError}</p>}
              <Button type="submit" disabled={authLoading} className="w-full bg-rose-glam hover:opacity-90 text-primary-foreground font-bold py-3.5 rounded-2xl transition shadow-md text-sm">
                {authLoading ? <><LoaderCircle className="animate-spin" aria-hidden="true"/>מתחברת...</> : 'התחברי לחשבון'}
              </Button>
            </form>
            <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
              עדיין אין לך חשבון?{' '}
              <Button type="button" variant="link" className="h-auto p-0 font-bold text-primary transition-colors" onClick={() => {setAuthError('');setProfileCompletion(false);setCurrentStep('onboarding');}}>
                להרשמה לחצי כאן
              </Button>
            </div>
          </> : <form onSubmit={handlePasswordRecovery} className="space-y-4">
            {recoveryMode === 'request' && <>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="בחירת דרך איפוס">
                <Button type="button" variant={recoveryChannel === 'email' ? 'secondary' : 'outline'} aria-pressed={recoveryChannel === 'email'} onClick={() => {setRecoveryChannel('email');setRecoveryNotice('');}}>אימייל</Button>
                <Button type="button" variant={recoveryChannel === 'sms' ? 'secondary' : 'outline'} aria-pressed={recoveryChannel === 'sms'} onClick={() => {setRecoveryChannel('sms');setRecoveryNotice('');}}>קוד SMS</Button>
              </div>
              <label htmlFor="recovery-identifier" className="block text-xs font-bold text-foreground">{recoveryChannel === 'email' ? 'כתובת אימייל' : 'מספר טלפון נייד'}</label>
              <input id="recovery-identifier" required type={recoveryChannel === 'email' ? 'email' : 'tel'} autoComplete={recoveryChannel === 'email' ? 'email' : 'tel'} value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent" dir="rtl"/>
            </>}
            {recoveryMode === 'otp' && <label className="block text-xs font-bold text-foreground">קוד חד-פעמי שנשלח ב-SMS
              <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,10}" maxLength={10} value={recoveryOtp} onChange={(e) => setRecoveryOtp(e.target.value)} className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent"/>
            </label>}
            {recoveryMode === 'password' && <>
              <PasswordField value={recoveryPassword} onChange={setRecoveryPassword} autoComplete="new-password"/>
              <label className="block text-xs font-bold text-foreground">אימות סיסמה חדשה
                <input type="password" required minLength={6} autoComplete="new-password" value={recoveryPasswordConfirm} onChange={(e) => setRecoveryPasswordConfirm(e.target.value)} className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-border focus:ring-2 focus:ring-ring outline-none text-right text-sm bg-accent" dir="rtl"/>
              </label>
            </>}
            {recoveryNotice && <p role="status" className="text-xs text-muted-foreground bg-accent rounded-xl p-2">{recoveryNotice}</p>}
            {authError && <p role="alert" className="text-xs text-destructive bg-accent rounded-xl p-2 text-right">{authError}</p>}
            <Button type="submit" disabled={authLoading} className="w-full bg-rose-glam hover:opacity-90 text-primary-foreground font-bold py-3.5 rounded-2xl transition shadow-md text-sm">
              {authLoading ? <><LoaderCircle className="animate-spin" aria-hidden="true"/>בודקת...</> : recoveryMode === 'request' ? (recoveryChannel === 'email' ? 'שליחת קישור איפוס' : 'שליחת קוד חד-פעמי') : recoveryMode === 'otp' ? 'אימות קוד' : 'שמירת סיסמה חדשה'}
            </Button>
            {recoveryMode !== 'password' && <Button type="button" variant="link" className="w-full" onClick={() => {setRecoveryMode('none');setRecoveryNotice('');setAuthError('');recoveryPending.current=false;}}>חזרה להתחברות</Button>}
          </form>}
        </div>
      </div>
    );
  }

  // ==========================================
  // מסך 3: אונבורדינג והרשמה מהממת
  if(profileCompletion&&currentStep==='onboarding'){return <RegistrationForm details={formData} onChange={setFormData} email={authEmail} onEmail={setAuthEmail} password={authPassword} onPassword={setAuthPassword} onSubmit={handleCompleteRegistration} onLogin={()=>{}} busy={authLoading} error={authError} specialties={SPECIALTIES_LIST} services={ADDITIONAL_SERVICES_LIST} profileCompletion/>;}
  // ==========================================
  if(currentStep==='onboarding'){return <RegistrationForm details={formData} onChange={setFormData} email={authEmail} onEmail={setAuthEmail} password={authPassword} onPassword={setAuthPassword} onSubmit={handleCompleteRegistration} onLogin={()=>{setAuthError('');setCurrentStep('login');}} busy={authLoading} error={authError} specialties={SPECIALTIES_LIST} services={ADDITIONAL_SERVICES_LIST}/>;}

  // ==========================================
  // מסך 4: אפליקציה ראשית (יוקרתית, נשית ואלגנטית)
  // ==========================================
  const filteredMembers = (directory.data?.pages.flatMap(page=>page.rows)??[]).map(member=>({
    id:member.id,
    fullName:member.display_name,
    businessName:member.business_name,
    role:member.account_role,
    city:member.city,
    specialties:member.specialties,
    additionalServices:member.additional_services,
    phone:'',
    isVerified:member.is_verified,
    avatar:member.avatar_url??undefined,
  }));

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
                    הכול
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
            {directory.isPending&&<p role="status" className="text-center text-sm text-muted-foreground py-8">טוענת את חברות הקהילה...</p>}
            {directory.isError&&<p role="alert" className="text-center text-sm text-destructive py-8">טעינת חברות הקהילה נכשלה. נסי שוב.</p>}
            {directory.data&&filteredMembers.length===0&&<p className="text-center text-sm text-muted-foreground py-8">לא נמצאו חברות מתאימות.</p>}
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
                            <>{m.avatar&&<PhotoImage src={m.avatar} alt="תמונת פרופיל" className="size-10 rounded-full object-cover shrink-0"/>}</><h3 className="font-extrabold text-foreground text-base">{m.fullName}</h3>
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
                    <div className="pt-3.5 border-t border-border flex justify-end">
                      <Button asChild className="text-[11px] text-primary hover:text-primary font-bold">
                        <Link to="/members/$memberId" params={{memberId:m.id}}>כרטיס מלא ←</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {directory.hasNextPage&&<Button type="button" variant="outline" className="w-full" disabled={directory.isFetchingNextPage} onClick={()=>void directory.fetchNextPage()}>{directory.isFetchingNextPage?'טוענת חברות...':'טעינת חברות נוספות'}</Button>}
          </div>
        )}

        {/* תוכן עמוד פרופיל אישי */}
        {!['directory', 'profile', 'admin', 'support'].includes(activeTab) && currentUser && <HubWorkspace section={section} user={currentUser} />}

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-xl mx-auto bg-card backdrop-blur-xl rounded-3xl border border-border p-6 md:p-8 shadow-soft space-y-6">
            <div className="space-y-3">{currentUser.avatar&&<PhotoImage src={currentUser.avatar} alt="תמונת הפרופיל שלי" className="size-24 rounded-full object-cover"/>}<HebrewPhotoInput label="תמונת פרופיל" onChange={f=>void saveAvatar(f)}/>{photoBusy&&<ImageUploadStatus/>}</div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h2 className="text-2xl font-black text-foreground">{currentUser.fullName}</h2>
                <p className="text-xs text-primary font-semibold">{currentUser.businessName} • {currentUser.city}</p>
              </div>
              <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${getRoleDetails(currentUser.role).badge}`}>
                {getRoleDetails(currentUser.role).label}
              </span>
            </div>

{isAdmin&&<Button asChild className="w-full"><Link to="/admin">ניהול מערכת</Link></Button>}
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