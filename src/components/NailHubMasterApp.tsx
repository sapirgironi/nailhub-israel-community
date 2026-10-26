import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Phone, 
  Crown, 
  Heart, 
  Bookmark, 
  Share2, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Plus, 
  X, 
  Check, 
  ShieldCheck, 
  Upload, 
  MessageCircle, 
  Tag, 
  Filter, 
  ShoppingBag, 
  Layers, 
  FileText,
  BadgeCheck,
  Send,
  Eye,
  Sliders
} from 'lucide-react';
import { ROLE_DEFINITIONS, type AccountRole, ALL_SERVICES, ADDITIONAL_BEAUTY_SERVICES } from '@/lib/roles';

export function NailHubMasterApp() {
  // ניווט מרכזי
  const [activeTab, setActiveTab] = useState<'feed' | 'directory' | 'nailtrade' | 'insurance' | 'saved' | 'profile'>('feed');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // משתמשת מחוברת (ברירת מחדל: בונת ציפורניים מאומתת)
  const [currentUser, setCurrentUser] = useState({
    id: 'user_1',
    displayName: 'ספיר גירוני',
    businessName: 'ספיר גירוני ביוטי & ניילס',
    phone: '0501234567',
    city: 'קריית ביאליק',
    role: 'nail_tech' as AccountRole,
    isVerified: true,
    lightLogoUrl: null as string | null,
    darkLogoUrl: null as string | null,
    watermarkPreference: 'studio_text', // 'light_logo' | 'dark_logo' | 'studio_text' | 'none'
    specialties: ['מבנה אנטומי', 'דיפ פאוודר', 'פרנץ\' מדויק'],
    additionalServices: ['פדיקור קוסמטי', 'עיצוב ושיקום גבות']
  });

  // הודעת טוסט
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ----------------------------------------------------
  // חלק 1: ניהול פוסטים בפיד (יחס טבעי, לייקים, שמורים, מחיקה ועריכה)
  // ----------------------------------------------------
  const [posts, setPosts] = useState([
    {
      id: 'post_101',
      authorId: 'user_1',
      authorName: 'ספיר גירוני',
      authorBusiness: 'ספיר גירוני ביוטי & ניילס',
      authorRole: 'nail_tech' as AccountRole,
      authorCity: 'קריית ביאליק',
      isVerified: true,
      imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=1000&auto=format&fit=crop',
      caption: 'מבנה אנטומי מושלם עם פרנץ חיוך עדין וטבילת דיפ פאוודר ✨ מה אומרות על הדיוק בקטיקולה?',
      serviceTags: ['מבנה אנטומי', 'פרנץ\' מדויק', 'דיפ פאוודר'],
      priceNis: 180,
      likesCount: 38,
      isLiked: false,
      isSaved: false,
      createdAt: 'לפני שעתיים'
    },
    {
      id: 'post_102',
      authorId: 'user_2',
      authorName: 'ליליאן שיין',
      authorBusiness: 'Lili Academy',
      authorRole: 'instructor' as AccountRole,
      authorCity: 'חיפה',
      isVerified: true,
      imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=1000&auto=format&fit=crop',
      caption: 'הדגמה מתוך השתלמות טכניקות מילוי ג\'ל ודיפ פאוודר לבנות מקצועיות 💅',
      serviceTags: ['מילוי ג\'ל', 'דיפ פאוודר'],
      priceNis: 220,
      likesCount: 54,
      isLiked: false,
      isSaved: true,
      createdAt: 'אתמול'
    }
  ]);

  const [activeFeedTag, setActiveFeedTag] = useState<string>('all');
  const [feedSearch, setFeedSearch] = useState('');

  // מודאל עריכת פוסט
  const [editingPost, setEditingPost] = useState<any | null>(null);
  // מודאל מחיקת פוסט
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // מודאל יצירת פוסט חדש + מנוע חותמת מים חי
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPostData, setNewPostData] = useState({
    caption: '',
    imageFile: null as string | null,
    serviceTags: [] as string[],
    priceNis: '',
    watermarkType: 'studio_text', // 'light_logo' | 'dark_logo' | 'studio_text' | 'none'
    watermarkPosition: 'bottom_left', // 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center'
    watermarkSize: 'md', // 'sm' | 'md' | 'lg'
    watermarkOpacity: 90
  });

  // פעולות פוסט
  const handleToggleLike = (id: string) => {
    setPosts(posts.map(p => p.id === id ? { 
      ...p, 
      isLiked: !p.isLiked, 
      likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 
    } : p));
  };

  const handleToggleSave = (id: string) => {
    setPosts(posts.map(p => {
      if (p.id === id) {
        const nextState = !p.isSaved;
        showToast(nextState ? 'נשמר בהצלחה בתיקיית השמורים שלך 💖' : 'הוסר מהשמורים');
        return { ...p, isSaved: nextState };
      }
      return p;
    }));
  };

  const handleSharePost = (post: any) => {
    const postUrl = `https://nailhub.app/post/${post.id}`;
    const text = `ראיתי את העבודה המושלמת הזו ב-NailHub! צפי כאן: ${postUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = (postId: string) => {
    navigator.clipboard.writeText(`https://nailhub.app/post/${postId}`);
    showToast('קישור ישיר הועתק ללוח!');
  };

  const handleDeletePostConfirm = () => {
    if (!deletingPostId) return;
    setPosts(posts.filter(p => p.id !== deletingPostId));
    setDeletingPostId(null);
    showToast('הפוסט נמחק לצמיתות מהפיד');
  };

  const handleSaveEditedPost = (e: React.FormEvent) => {
    e.preventDefault();
    setPosts(posts.map(p => p.id === editingPost.id ? {
      ...p,
      caption: editingPost.caption,
      serviceTags: editingPost.serviceTags,
      priceNis: Number(editingPost.priceNis) || p.priceNis
    } : p));
    setEditingPost(null);
    showToast('הפוסט עודכן בהצלחה');
  };

  // סינון הפיד לפי תגיות וחיפוש
  const filteredPosts = posts.filter(p => {
    const matchTag = activeFeedTag === 'all' || p.serviceTags.includes(activeFeedTag);
    const matchSearch = p.caption.includes(feedSearch) || 
      p.authorName.includes(feedSearch) || 
      p.authorCity.includes(feedSearch) ||
      p.serviceTags.some(t => t.includes(feedSearch));
    return matchTag && matchSearch;
  });

  // ----------------------------------------------------
  // חלק 2: NailTrade - שוק ציוד יד שנייה
  // ----------------------------------------------------
  const [tradeItems, setTradeItems] = useState([
    {
      id: 'trade_1',
      sellerId: 'user_1',
      sellerName: 'ספיר גירוני',
      sellerPhone: '0501234567',
      title: 'מכונת שיוף Marathon 3 Champion מקורית',
      category: 'מכונות שיוף ושואבים',
      condition: 'משומש במצב מצוין',
      priceNis: 550,
      isFlexible: true,
      deliveryType: 'איסוף עצמי או משלוח',
      city: 'קריית ביאליק (צפון)',
      photos: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=500&auto=format&fit=crop'],
      description: 'הייתה בשימוש קל בלבד כגיבוי בקליניקה. מגיעה עם דוושה וידית מקורית ושקטה לחלוטין.',
      status: 'available' // 'available' | 'reserved' | 'sold'
    },
    {
      id: 'trade_2',
      sellerId: 'user_3',
      sellerName: 'שירן כהן',
      sellerPhone: '0528889900',
      title: 'סטוק 35 לקים מותגים במצב חדש',
      category: 'סטוקים של לקים וחומרים',
      condition: 'כמו חדש באריזה',
      priceNis: 700,
      isFlexible: false,
      deliveryType: 'איסוף עצמי בלבד',
      city: 'תל אביב (מרכז)',
      photos: ['https://images.unsplash.com/photo-1599940824399-b87987ceb72a?q=80&w=500&auto=format&fit=crop'],
      description: 'חלקם לא נפתחו מעולם, גוונים קייציים מהממים נמכרים עקב מעבר למותג בלעדי.',
      status: 'available'
    }
  ]);

  const [tradeCategoryFilter, setTradeCategoryFilter] = useState('all');
  const [hideSoldItems, setHideSoldItems] = useState(true);
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);

  const [newTradeItem, setNewTradeItem] = useState({
    title: '',
    category: 'מכונות שיוף ושואבים',
    condition: 'משומש במצב מצוין',
    priceNis: '',
    isFlexible: true,
    deliveryType: 'איסוף עצמי בלבד',
    city: 'קריית ביאליק',
    description: '',
    phone: '0501234567'
  });

  const handleCreateTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const item = {
      id: `trade_${Date.now()}`,
      sellerId: currentUser.id,
      sellerName: currentUser.displayName,
      sellerPhone: newTradeItem.phone,
      title: newTradeItem.title,
      category: newTradeItem.category,
      condition: newTradeItem.condition,
      priceNis: Number(newTradeItem.priceNis) || 0,
      isFlexible: newTradeItem.isFlexible,
      deliveryType: newTradeItem.deliveryType,
      city: newTradeItem.city,
      photos: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=500&auto=format&fit=crop'],
      description: newTradeItem.description,
      status: 'available'
    };
    setTradeItems([item, ...tradeItems]);
    setShowAddTradeModal(false);
    showToast('הפריט פורסם ב-NailTrade בהצלחה!');
  };

  // ----------------------------------------------------
  // חלק 3: שאלון ביטוח מקצועי עם ניתוב ישיר לוואטסאפ
  // ----------------------------------------------------
  const [insuranceForm, setInsuranceForm] = useState({
    fullName: currentUser.displayName,
    idNumber: '',
    phone: currentUser.phone,
    email: '',
    cityStreet: 'קריית ביאליק',
    entityType: 'עוסק פטור',
    clinicLocation: 'עובדת מחדר ייעודי בבית',
    treatments: ['בנייה ומבנה אנטומי לק גל'],
    staffStatus: 'עובדת לבד ללא עובדות',
    employeesCount: 0,
    equipmentValueNis: '35000',
    highValueMachines: ['מכונות שיוף ושואבים מקצועיים מעל 5000 שח'],
    coverages: ['אחריות מקצועית תביעות רשלנות ופגיעה בלקוחה', 'צד שלישי החלקה או נפילה של לקוחה בקליניקה'],
    existingStatus: 'אין לי ביטוח כרגע',
    notes: '',
    consent: true
  });
  const [insuranceSubmitted, setInsuranceSubmitted] = useState(false);

  const handleInsuranceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insuranceForm.idNumber || !insuranceForm.phone) {
      return alert('נא למלא תעודת זהות וטלפון');
    }

    // הודעה מובנית בעברית לסוכנת הביטוח
    const text = `שלום, הגשתי שאלון התאמת ביטוח דרך אפליקציית NailHub ✨
📋 פרטים אישיים:
שם: ${insuranceForm.fullName}
ת.ז / עוסק: ${insuranceForm.idNumber}
טלפון: ${insuranceForm.phone}
מייל: ${insuranceForm.email}
עיר וכתובת: ${insuranceForm.cityStreet}
סוג עוסק: ${insuranceForm.entityType} | מיקום: ${insuranceForm.clinicLocation}

💅 תחומי טיפול: ${insuranceForm.treatments.join(', ')}
👥 עובדות בעסק: ${insuranceForm.staffStatus} (${insuranceForm.employeesCount} עובדות)
⚡ מכשור וציוד: שווי מוערך ${insuranceForm.equipmentValueNis} ₪ (${insuranceForm.highValueMachines.join(', ')})
🛡️ כיסויים מבוקשים: ${insuranceForm.coverages.join(', ')}
📄 ביטוח קיים: ${insuranceForm.existingStatus}
📝 הערות: ${insuranceForm.notes || 'אין'}`;

    const waLink = `https://wa.me/972523425266?text=${encodeURIComponent(text)}`;
    window.open(waLink, '_blank');
    setInsuranceSubmitted(true);
    showToast('הפרטים נשמרו ונפתח חלון וואטסאפ לשליחה ישירה לסוכנת!');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-right text-stone-800" dir="rtl">
      
      {/* התראת Toast צפה */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 border border-rose-400/40 animate-fade-in">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* סרגל עליון ראשי */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-rose-100/70 px-4 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 text-white rounded-2xl flex items-center justify-center shadow-md shadow-rose-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-400 bg-clip-text text-transparent block leading-tight">
                NailHub
              </span>
              <span className="text-[10px] text-stone-400 font-bold">הקהילה והכלים המקצועיים שלך</span>
            </div>
          </div>

          {/* כפתורי ניווט עליונים */}
          <div className="flex items-center gap-1 bg-rose-50/70 p-1 rounded-2xl border border-rose-100 text-xs font-bold">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'feed' ? 'bg-white text-rose-600 shadow-xs' : 'text-stone-500'}`}
            >
              הפיד ✨
            </button>
            <button
              onClick={() => setActiveTab('nailtrade')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'nailtrade' ? 'bg-white text-rose-600 shadow-xs' : 'text-stone-500'}`}
            >
              NailTrade 💎
            </button>
            <button
              onClick={() => setActiveTab('insurance')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition ${activeTab === 'insurance' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs' : 'text-stone-600'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ביטוח מקצועי</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'saved' ? 'bg-white text-rose-600 shadow-xs' : 'text-stone-500'}`}
            >
              שמורים 💖
            </button>
          </div>
        </div>
      </header>

      {/* גוף האפליקציה */}
      <main className="max-w-4xl mx-auto p-4 md:p-6 pb-20">

        {/* ---------------------------------------------------- */}
        {/* טאב 1: הפיד החברתי המקצועי                            */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            
            {/* באנר הוספת פוסט וחיפוש */}
            <div className="bg-white rounded-3xl p-4 md:p-5 border border-rose-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={feedSearch}
                    onChange={(e) => setFeedSearch(e.target.value)}
                    placeholder="חיפוש עיצובים, סגנונות או מניקוריסטיות..."
                    className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-rose-100 text-xs outline-none bg-rose-50/20 focus:ring-2 focus:ring-rose-400"
                  />
                  <Search className="w-4 h-4 text-rose-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>

                {currentUser.role === 'nail_tech' && (
                  <button
                    onClick={() => setShowCreatePostModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-black rounded-2xl shadow-md shadow-rose-200 flex items-center gap-1.5 shrink-0 hover:scale-[1.02] transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>פרסום עבודה +</span>
                  </button>
                )}
              </div>

              {/* סרגל תגיות אופקי גליל */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setActiveFeedTag('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                    activeFeedTag === 'all' ? 'bg-stone-900 text-white' : 'bg-rose-50/60 text-stone-600'
                  }`}
                >
                  הכול
                </button>
                {ALL_SERVICES.BASE.concat(ALL_SERVICES.STYLES).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveFeedTag(tag)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                      activeFeedTag === tag ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs' : 'bg-white border border-rose-100 text-stone-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* רשימת פוסטים בפיד - תמונות טבעיות בלבד ללא עיוות */}
            <div className="space-y-6">
              {filteredPosts.map((post) => {
                const roleConfig = ROLE_DEFINITIONS[post.authorRole];
                return (
                  <article key={post.id} className="bg-white rounded-3xl border border-rose-100 shadow-xs overflow-hidden">
                    
                    {/* כותרת הפוסט - מחבר/ת ותג תפקיד בודד */}
                    <div className="p-4 flex items-center justify-between border-b border-rose-50">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-400 to-pink-400 text-white flex items-center justify-center font-black text-sm shadow-xs">
                          {post.authorName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-stone-900 text-sm hover:underline cursor-pointer">
                              {post.authorName}
                            </span>
                            {post.isVerified && <BadgeCheck className="w-4 h-4 text-rose-500 fill-rose-100" />}
                          </div>
                          
                          {/* תגית יחידה אחת בלבד ללא כפילות */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${roleConfig.badgeStyle}`}>
                              {roleConfig.label}
                            </span>
                            <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-rose-400" />
                              {post.authorCity}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* תפריט 3 נקודות לעריכה ומחיקה (למחברת הפוסט בלבד) */}
                      {post.authorId === currentUser.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingPost(post)}
                            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-50"
                            title="עריכת פוסט"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingPostId(post.id)}
                            className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50"
                            title="מחיקת פוסט"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* תמונת העבודה - ללא עיוות, ללא מריחה, יחס טבעי מלא ברזולוציה גבוהה */}
                    <div className="w-full bg-stone-950/5 flex items-center justify-center overflow-hidden">
                      <img 
                        src={post.imageUrl} 
                        alt="עבודת ציפורניים"
                        className="w-full h-auto max-h-[580px] object-contain block select-none"
                        loading="lazy"
                      />
                    </div>

                    {/* כפתורי אינטראקציה חברתית */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleToggleLike(post.id)}
                            className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-rose-600 transition"
                          >
                            <Heart className={`w-5 h-5 ${post.isLiked ? 'text-rose-500 fill-rose-500' : 'text-stone-400'}`} />
                            <span>{post.likesCount}</span>
                          </button>

                          <button 
                            onClick={() => handleSharePost(post)}
                            className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                            title="שיתוף בוואטסאפ"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>

                          <button 
                            onClick={() => handleCopyLink(post.id)}
                            className="text-[11px] text-stone-400 hover:text-stone-700 font-medium"
                          >
                            העתקת קישור
                          </button>
                        </div>

                        <button 
                          onClick={() => handleToggleSave(post.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-500 transition"
                          title="שמירה באפליקציה"
                        >
                          <Bookmark className={`w-5 h-5 ${post.isSaved ? 'text-rose-500 fill-rose-500' : 'text-stone-400'}`} />
                        </button>
                      </div>

                      {/* תגיות שירות קליקביליות ומחיר הטיפול */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap gap-1.5">
                          {post.serviceTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => setActiveFeedTag(tag)}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100/70 transition"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>

                        {post.priceNis && (
                          <div className="text-xs font-black text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                            מחיר טיפול: {post.priceNis} ₪
                          </div>
                        )}
                      </div>

                      {/* כיתוב הפוסט */}
                      <p className="text-xs text-stone-700 leading-relaxed font-medium">
                        {post.caption}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* טאב 2: שוק יד שנייה NailTrade                        */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'nailtrade' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 rounded-3xl p-6 text-white shadow-lg shadow-rose-200/50">
              <span className="bg-white/20 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
                NailTrade • מתחם פרטי
              </span>
              <h2 className="text-2xl font-black mb-1">שוק ציוד יד שנייה בין מניקוריסטיות</h2>
              <p className="text-xs text-rose-100">
                למכירה פרטית בלבד! לא לחנויות, ספקים או עסקים מסחריים.
              </p>
            </div>

            {/* סרגל כפתור פרסום וסינונים */}
            <div className="bg-white p-4 rounded-3xl border border-rose-100 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  value={tradeCategoryFilter}
                  onChange={(e) => setTradeCategoryFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-100 bg-rose-50/20 text-stone-700 outline-none"
                >
                  <option value="all">כל הקטגוריות</option>
                  <option value="מכונות שיוף ושואבים">מכונות שיוף ושואבים</option>
                  <option value="מנורות ייבוש">מנורות ייבוש</option>
                  <option value="עמדות ריהוט וכיסאות">עמדות ריהוט וכיסאות</option>
                  <option value="סטוקים של לקים וחומרים">סטוקים של לקים וחומרים</option>
                </select>

                <label className="flex items-center gap-1.5 text-xs font-bold text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideSoldItems}
                    onChange={(e) => setHideSoldItems(e.target.checked)}
                    className="accent-rose-500"
                  />
                  <span>הסתר פריטים שנמכרו</span>
                </label>
              </div>

              <button
                onClick={() => setShowAddTradeModal(true)}
                className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-black rounded-2xl shadow-md shadow-rose-200 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>פרסום פריט ב-NailTrade</span>
              </button>
            </div>

            {/* כרטיסי פריטים בלוח יד שנייה */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tradeItems
                .filter(i => (tradeCategoryFilter === 'all' || i.category === tradeCategoryFilter))
                .filter(i => hideSoldItems ? i.status !== 'sold' : true)
                .map((item) => (
                  <div key={item.id} className="bg-white rounded-3xl border border-rose-100 p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="relative rounded-2xl overflow-hidden mb-3 bg-stone-100 h-48">
                        <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover" />
                        <span className="absolute top-3 right-3 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                          {item.condition}
                        </span>
                        {item.status === 'sold' && (
                          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center text-white font-black text-base">
                            נמכר בהצלחה ✓
                          </div>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-extrabold text-stone-900 text-sm leading-tight">{item.title}</h3>
                        <div className="text