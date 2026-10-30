import {describe,it,expect} from 'vitest';
import {activeMention,insertMention,resizedTextWidth,readMentions,storyTextLines} from '../lib/story-layout';
describe('story text width and mentions',()=>{
 it('preserves manual Enter line breaks when tagging',()=>{expect(insertMention('שלום\n@ספ\nתודה',{start:5,end:8},'ספיר גירוני').text).toBe('שלום\n@ספיר_גירוני \nתודה');});
 it('finds the mention at the caret rather than at the end of the text',()=>{expect(activeMention('שלום @ספ\nתודה',8)).toEqual({start:5,end:8,query:'ספ'});});
 it('changes width with either side without changing text size and honors 92% maximum',()=>{expect(resizedTextWidth(60,30,0,0,1,300,1)).toBe(80);expect(resizedTextWidth(60,-30,0,0,1,300,-1)).toBe(80);expect(resizedTextWidth(60,300,0,0,1,300,1)).toBe(92);});
 it('keeps all words on one line unless the author inserts Enter',()=>{expect(storyTextLines('כל המילים נשארות בשורה אחת')).toEqual(['כל המילים נשארות בשורה אחת']);expect(storyTextLines('שורה ראשונה\n\nשורה שלישית')).toEqual(['שורה ראשונה','','שורה שלישית']);});
 it('accounts for rotation and pinch scale when resizing on touch',()=>{expect(resizedTextWidth(60,0,60,90,2,300,1)).toBe(80);});
 it('ignores malformed persisted link targets',()=>{expect(readMentions([{userId:'javascript:alert(1)',label:'x',x:0,y:0,width:50,height:20}])).toEqual([]);});
});