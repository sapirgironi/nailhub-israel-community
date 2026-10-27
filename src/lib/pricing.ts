export const VAT_RATE = 0.18;
export const DEFAULT_OVERHEAD = 12;
export const TREATMENTS = [
  ['gel_build','בניה בג׳ל / בילדר ג׳ל',120],['acrylic_build','בניה באקריל',120],['dual_forms','בניה בטיפסים הפוכים (Dual Forms)',110],['polygel','בניה בפוליג׳ל / אקריג׳ל',110],
  ['gel_fill','מילוי ג׳ל',90],['acrylic_fill','מילוי אקריל',90],['rubber','מבנה אנטומי (Rubber Base)',75],['architectural','מבנה אדריכלי',100],
  ['gel_polish','לק ג׳ל על טבעיות',60],['dip','דיפ פאוודר (Dip Powder)',60],['manicure','מניקור בלבד (ללא צבע)',30],['pedicure','לק ג׳ל ברגליים (פדיקור קוסמטי)',60],
  ['removal','הסרת בניה / חומר ישן',30],['repair','תיקון ציפורן בודדת',15],
] as const;
export const LENGTHS = [['natural','טבעי',0,0],['short','קצר',5,2],['medium','מדיום',10,4],['long','ארוך (L)',20,7],['extreme','אקסטרים',35,12]] as const;
export const EFFECTS = [['french','פרנץ׳ (קלאסי / צבעוני / גיאומטרי)',15],['ombre','אומברה (בייבי בומר)',15],['charms','צ׳ארמים ותלת־ממד',10],['stones','שיבוץ אבנים וקריסטלים',15],['handpaint','ציורים בעבודת יד',20],['cateye','עין החתול / כרום מראה',10],['aquarium','אקווריום',25]] as const;
export const EXPERIENCE = [['beginner','מתחילה (0–1 שנים)','בשלב זה מקובל לתמחר בטווח הנמוך של השוק ולבנות תיק עבודות.'],['experienced','מנוסה (2–4 שנים)','ניתן לתמחר בטווח הממוצע של השוק באזורך.'],['master','מאסטר (5+ שנים)','ניסיונך מצדיק תמחור בטווח העליון של השוק.']] as const;
export type LengthId = typeof LENGTHS[number][0];
export type EffectId = typeof EFFECTS[number][0];
export interface PricingInput { hourlyRate:number; minutes:number; length:LengthId; effects:EffectId[]; extraMinutes:number; materials:number; overhead:number; vat:boolean; discountType:'percent'|'nis'; discount:number }
const r2 = (n:number) => Math.round(n*100)/100;
export function calculateTreatment(i: PricingInput) {
  const nums=[i.hourlyRate,i.minutes,i.extraMinutes,i.materials,i.overhead,i.discount];
  if (nums.some(n=>!Number.isFinite(n)||n<0) || i.minutes<=0) throw new Error('invalid');
  const len = LENGTHS.find(l=>l[0]===i.length)!;
  const effectMinutes = i.effects.reduce((s,e)=>s+(EFFECTS.find(x=>x[0]===e)?.[2]??0),0);
  const totalMinutes = i.minutes + len[2] + effectMinutes + i.extraMinutes;
  const labor = r2(i.hourlyRate*totalMinutes/60);
  const materials = r2(i.materials + len[3]);
  const beforeDiscount = labor + materials + i.overhead;
  const discountNis = r2(Math.min(beforeDiscount, i.discountType==='percent' ? beforeDiscount*Math.min(i.discount,100)/100 : i.discount));
  const net = beforeDiscount - discountNis;
  const vat = i.vat ? r2(net*VAT_RATE) : 0;
  return { totalMinutes, labor, materials, overhead:i.overhead, discountNis, vat, price: Math.round(net+vat), profit: r2(net - materials - i.overhead) };
}
