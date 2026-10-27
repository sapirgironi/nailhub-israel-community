import {createServerFn} from '@tanstack/react-start';
import {setResponseHeader} from '@tanstack/react-start/server';
import {requireActiveAccount} from './account-access';
import {hasActivePremium} from './feed-post';
import {validateImage} from './cloudinary';
import {plainText} from './input-security';
export const getFeedPremiumAccess=createServerFn({method:'POST'}).middleware([requireActiveAccount]).handler(async({context})=>{
 setResponseHeader('Cache-Control','private, no-store');
 const {data,error}=await context.supabase.from('premium_subscriptions').select('status,expires_at').eq('user_id',context.userId).maybeSingle();
 if(error)throw new Error('בדיקת המנוי נכשלה');return {active:hasActivePremium(data)};
});
export const upgradeFeedCaption=createServerFn({method:'POST'}).middleware([requireActiveAccount]).inputValidator((v:FormData)=>{
 if(!(v instanceof FormData))throw new Error('בחרי תמונה');const file=v.get('file');if(!(file instanceof File))throw new Error('בחרי תמונה');validateImage(file);plainText(2000).parse(v.get('caption')??'');return v;
}).handler(async({context,data})=>{
 setResponseHeader('Cache-Control','private, no-store');
 const {data:subscription,error}=await context.supabase.from('premium_subscriptions').select('status,expires_at').eq('user_id',context.userId).maybeSingle();
 if(error||!hasActivePremium(subscription))return {suggestions:[],error:'שדרוג ניסוח עם תמונה זמין רק לחברות בעלות מנוי פרימיום פעיל.'};
 const file=data.get('file');if(!(file instanceof File))throw new Error('בחרי תמונה');
 const bytes=new Uint8Array(await file.arrayBuffer());const header=bytes.slice(0,12);
 const valid=file.type==='image/jpeg'?header[0]===255&&header[1]===216&&header[2]===255:file.type==='image/png'?[137,80,78,71,13,10,26,10].every((b,i)=>header[i]===b):new TextDecoder().decode(header.slice(0,4))==='RIFF'&&new TextDecoder().decode(header.slice(8,12))==='WEBP';
 if(!valid)throw new Error('קובץ התמונה אינו תקין');
 const key=process.env['OPENAI_API_KEY'];if(!key)return {suggestions:[],error:'שירות הניסוח אינו מוגדר כרגע'};
 const {suggestFeedCaptions}=await import('./feed-ai.server');
 try{return {suggestions:await suggestFeedCaptions(key,bytes,file.type,plainText(2000).parse(data.get('caption')??'')),error:null};}catch(e){return {suggestions:[],error:e instanceof Error?e.message:'שדרוג הניסוח נכשל'};}
});