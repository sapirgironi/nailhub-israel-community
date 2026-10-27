import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ ai: vi.fn(), rewrite: vi.fn(), insert: vi.fn(), words: [] as {word:string}[] }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (handler: unknown) => handler };
  return builder;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('../lib/account-access', () => ({ requireActiveAccount: {} }));
vi.mock('../lib/moderation.server', () => ({ moderateCommentText: mocks.ai, rephraseCommentText: mocks.rewrite, ModerationServiceError: class extends Error {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {from: () => ({insert:mocks.insert})} }));
import { moderateComment, publishComment } from '../lib/moderation.functions';

function context() {
  return {userId:'owner',supabase:{from:(table:string)=>{
    const q = {select:()=>q,eq:()=>q,or:()=>q,limit:async()=>({data:[],error:null}),single:async()=>({data:{id:'post',author_id:'owner',status:'approved'},error:null}),then:(resolve:(x:unknown)=>void)=>resolve({data:table==='blocked_words'?mocks.words:[],error:null})};
    return q;
  }}};
}
const review=moderateComment as unknown as (input:unknown)=>Promise<{ok:boolean;flagged:string[];suggestion:string;error:string|null}>;
const publish=publishComment as unknown as typeof review;
beforeEach(()=>{vi.clearAllMocks();mocks.words=[];mocks.insert.mockResolvedValue({error:null});});
describe('AI comment publication rules',()=>{
  it('blocks offensive wording and returns the exact flagged words and alternative',async()=>{
    mocks.ai.mockResolvedValue({toxic:true,flagged:['מטומטמת'],suggestion:'אני לא מסכימה עם שיטת העבודה'});
    const result=await publish({data:{body:'את מטומטמת',postId:'post'},context:context()});
    expect(result.ok).toBe(false);expect(result.flagged).toEqual(['מטומטמת']);expect(result.suggestion).toBe('אני לא מסכימה עם שיטת העבודה');
    expect(mocks.insert).not.toHaveBeenCalledWith(expect.objectContaining({post_id:'post'}));
  });
  it('never publishes if the AI check is unavailable',async()=>{
    mocks.ai.mockRejectedValue(new Error('unavailable'));
    const result=await publish({data:{body:'תגובה לבדיקה',postId:'post'},context:context()});
    expect(result.ok).toBe(false);expect(result.error).not.toBeNull();expect(mocks.insert).not.toHaveBeenCalledWith(expect.objectContaining({post_id:'post'}));
  });
  it('rechecks and publishes respectful alternative only under the authenticated author',async()=>{
    mocks.ai.mockResolvedValue({toxic:false,flagged:[],suggestion:''});
    const result=await publish({data:{body:'אני לא מסכימה עם שיטת העבודה',postId:'post'},context:context()});
    expect(mocks.ai).toHaveBeenCalledWith('אני לא מסכימה עם שיטת העבודה');expect(result.ok).toBe(true);
    expect(mocks.insert).toHaveBeenCalledWith({user_id:'owner',post_id:'post',body:'אני לא מסכימה עם שיטת העבודה'});
  });
  it('uses a dedicated rewrite for manually blocked words',async()=>{
    mocks.words=[{word:'מטומטמת'}];mocks.rewrite.mockResolvedValue('אני לא מסכימה');
    const result=await review({data:{body:'את מטומטמת'},context:context()});
    expect(result.ok).toBe(false);expect(result.suggestion).toBe('אני לא מסכימה');expect(mocks.rewrite).toHaveBeenCalledWith('את מטומטמת',['מטומטמת']);
  });
});