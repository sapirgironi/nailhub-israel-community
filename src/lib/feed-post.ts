import {z} from 'zod';
import {plainText} from './input-security';
export const POST_TAGS=['מבנה_אנטומי',"לק_ג'ל",'בנייה_באקריל','נייל_ארט','השתלמויות','מניקור_מכשירי','אזור_הצפון','אזור_המרכז','אזור_הדרום'];
export const postMentionSchema=z.object({userId:z.string().uuid(),label:z.string().regex(/^@[^\s@<>]{1,100}$/)});
export type PostMention=z.infer<typeof postMentionSchema>;
export function normalizeTag(value:string){return value.trim().replace(/^#+/,'').replace(/\s+/g,'_');}
export const tagSchema=z.string().transform(normalizeTag).pipe(z.string().min(1).max(60).regex(/^[\p{L}\p{N}_'׳״-]+$/u,'התגית אינה תקינה'));
export const postMetadataSchema=z.object({caption:plainText(2000),tags:z.array(tagSchema).max(30),mentions:z.array(postMentionSchema).max(30)});
export function readPostMentions(value:unknown):PostMention[]{const result=z.array(postMentionSchema).safeParse(value);return result.success?result.data:[];}
export function livePostMentions(text:string,mentions:PostMention[]){return mentions.filter(m=>text.split(/\s+/).some(t=>t===m.label||t.replace(/[.,!?;:]+$/,'')===m.label));}
export function matchesPostSearch(post:{caption:string|null;service_tags:string[]|null},search:string){const q=search.trim().toLocaleLowerCase();if(!q)return true;const tag=normalizeTag(q);return (!q.startsWith('#')&&(post.caption??'').toLocaleLowerCase().includes(q))||(post.service_tags??[]).some(t=>normalizeTag(t).toLocaleLowerCase().includes(tag));}
export function hasActivePremium(subscription:{status:string;expires_at:string}|null|undefined,now=Date.now()){return subscription?.status==='active'&&Date.parse(subscription.expires_at)>now;}