export type DemoPlan = 'free' | 'pro' | 'academy' | 'vendor';
export type BillingPeriod = 'monthly' | 'yearly';
export const PLAN_PRICES = {free:{monthly:0,yearly:0},pro:{monthly:29,yearly:290},academy:{monthly:99,yearly:890},vendor:{monthly:149,yearly:1490}} as const;
export const PLAN_NAMES:Record<DemoPlan,string>={free:'חינם',pro:'Pro',academy:'מדריכות',vendor:'ספקים'};
export function demoLimits(plan:DemoPlan){return {photoAi:plan==='free'?3:Infinity,health:plan==='free'?5:Infinity,boosts:plan==='academy'||plan==='vendor'?2:0};}
export const DEMO_STORAGE_KEY='nailhub-prototype-plan';
export function isDemoPlan(value:unknown):value is DemoPlan{return value==='free'||value==='pro'||value==='academy'||value==='vendor';}
export function safeStoreUrl(value:string):string|null{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}