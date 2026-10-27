import {describe,it,expect} from 'vitest';
import {POST_TAGS,tagSchema,matchesPostSearch,livePostMentions,readPostMentions,hasActivePremium} from '../lib/feed-post';
describe('feed tags and mentions',()=>{
 it('includes the requested nine professional and regional tags',()=>{expect(POST_TAGS).toEqual(['מבנה_אנטומי',"לק_ג'ל",'בנייה_באקריל','נייל_ארט','השתלמויות','מניקור_מכשירי','אזור_הצפון','אזור_המרכז','אזור_הדרום']);});
 it('normalizes custom tags and rejects executable markup',()=>{expect(tagSchema.parse('#עיצוב עדין')).toBe('עיצוב_עדין');expect(tagSchema.safeParse('<script>').success).toBe(false);});
 it('searches persisted tags with or without a hash',()=>{const p={caption:'עבודה חדשה',service_tags:['מבנה_אנטומי']};expect(matchesPostSearch(p,'#מבנה_אנטומי')).toBe(true);expect(matchesPostSearch(p,'מבנה אנטומי')).toBe(true);expect(matchesPostSearch(p,'#אקריל')).toBe(false);});
 it('drops deleted mentions and rejects invalid profile targets',()=>{const m={userId:'00000000-0000-4000-8000-000000000001',label:'@ספיר_גירוני'};expect(livePostMentions('היי @ספיר_גירוני',[m])).toEqual([m]);expect(livePostMentions('היי',[m])).toEqual([]);expect(readPostMentions([{...m,userId:'javascript:alert(1)'}])).toEqual([]);});
});
describe('premium access',()=>{
 const now=Date.parse('2026-10-27T20:28:00Z');
 it('allows only an active unexpired subscription',()=>{expect(hasActivePremium({status:'active',expires_at:'2026-10-28T00:00:00Z'},now)).toBe(true);});
 it('denies ordinary members',()=>{expect(hasActivePremium(null,now)).toBe(false);});
 it('denies cancelled subscriptions even before expiry',()=>{expect(hasActivePremium({status:'cancelled',expires_at:'2026-10-28T00:00:00Z'},now)).toBe(false);});
 it('denies expired active subscriptions',()=>{expect(hasActivePremium({status:'active',expires_at:'2026-10-27T20:28:00Z'},now)).toBe(false);});
});