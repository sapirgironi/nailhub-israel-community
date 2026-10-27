import {describe,it,expect} from 'vitest';
import {groupStories} from '@/lib/story-groups';
const s=(user_id:string,created_at:string)=>({user_id,created_at,id:user_id+created_at});
describe('groupStories',()=>{
 it('gives each user exactly one group with all their stories in order',()=>{
  const g=groupStories([s('a','3'),s('b','2'),s('a','1')],'me');
  expect(g.map(x=>x.userId)).toEqual(['a','b']);
  expect(g[0]!.items.map(x=>x.created_at)).toEqual(['1','3']);
 });
 it('puts own stories first',()=>{expect(groupStories([s('a','9'),s('me','1')],'me')[0]!.userId).toBe('me');});
});
