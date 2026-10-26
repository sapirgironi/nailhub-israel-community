export type AccountRole = 'nail_tech' | 'instructor' | 'supplier' | 'client' | 'model';

export interface RoleConfig {
  id: AccountRole;
  label: string;
  badgeStyle: string;
  iconName: string;
  actionText: string;
}

export const ROLE_DEFINITIONS: Record<AccountRole, RoleConfig> = {
  nail_tech: {
    id: 'nail_tech',
    label: 'בונת ציפורניים ומניקוריסטית',
    badgeStyle: 'bg-rose-50 text-rose-600 border-rose-200 shadow-rose-50',
    iconName: 'Sparkles',
    actionText: 'קביעת תור בוואטסאפ'
  },
  instructor: {
    id: 'instructor',
    label: 'מדריכה מוסמכת & אקדמיה',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-50',
    iconName: 'Crown',
    actionText: 'קביעת תור / הרשמה בוואטסאפ'
  },
  supplier: {
    id: 'supplier',
    label: 'ספק / מותג מורשה',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200 shadow-blue-50',
    iconName: 'Gem',
    actionText: 'בקשת הצעת מחיר בוואטסאפ'
  },
  client: {
    id: 'client',
    label: 'לקוחה',
    badgeStyle: 'bg-stone-100 text-stone-700 border-stone-200 shadow-stone-50',
    iconName: 'User',
    actionText: 'הודעה בוואטסאפ'
  },
  model: {
    id: 'model',
    label: 'מודליסטית',
    badgeStyle: 'bg-pink-50 text-pink-600 border-pink-200 shadow-pink-50',
    iconName: 'Heart',
    actionText: 'פנייה למודליסטית בוואטסאפ'
  }
};

export const ALL_SERVICES = {
  BASE: ['לק ג\'ל על טבעיות', 'מבנה אנטומי', 'מבנה אדריכלי', 'דיפ פאוודר'],
  EXTENSIONS: ['בנייה חדשה בג\'ל', 'בנייה חדשה באקריל', 'בנייה בטיפסים הפוכים', 'מילוי ג\'ל', 'מילוי אקריל', 'דיפ פאוודר הארכה'],
  STYLES: ['פרנץ\' מדויק', 'אומברה', 'ציורים בג\'ל', 'אקסטרים', 'אפקט אקווריום'],
  ADDITIONS: ['צ\'ארמים וקריסטלים', 'הסרת דיפ וחידוש', 'השלמת ציפורן שבורה']
};

export const ADDITIONAL_BEAUTY_SERVICES = [
  'פדיקור קוסמטי',
  'פדיקור רפואי / טיפולי',
  'לק ג\'ל רגליים',
  'עיצוב ושיקום גבות',
  'הרמת גבות (Brow Lift)',
  'הרמת ריסים',
  'שזירת ריסים',
  'איפור קבוע / מיקרובליידינג',
  'טיפולי פנים וזוהר',
  'הסרת שיער / שעוות'
];