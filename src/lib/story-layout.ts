export type StoryMention = {userId:string;label:string;x:number;y:number;width:number;height:number};
export type MentionMember = {id:string;display_name:string;business_name:string|null;avatar_url:string|null;city:string|null;account_role:string};
export function mentionLabel(name:string){return '@'+name.trim().replace(/\s+/g,'_');}
export function activeMention(text:string,caret:number){const before=text.slice(0,caret);const token=/(?:^|\s)(@[^\s@]*)$/.exec(before)?.[1];return token?{start:caret-token.length,end:caret,query:token.slice(1).replace(/_/g,' ')}:null;}
export function insertMention(text:string,range:{start:number;end:number},name:string){const label=mentionLabel(name);return {text:text.slice(0,range.start)+label+' '+text.slice(range.end),caret:range.start+label.length+1,label};}
<<<<<<< HEAD
export function resizedTextWidth(width:number,dx:number,dy:number,rotation:number,scale:number,frameWidth:number,side:1|-1){const a=rotation*Math.PI/180;return Math.min(90,Math.max(15,width+side*(dx*Math.cos(a)+dy*Math.sin(a))*2/scale/frameWidth*100));}
export function maxTextLayerWidth(x:number,scale:number,frameWidth:number){if(frameWidth<=0)return 90;const halfSpace=Math.min(x,100-x)*frameWidth/100-18;return Math.min(90,Math.max(15,halfSpace*2/(frameWidth*Math.max(.4,scale))*100));}
export function clampTextLayerX(x:number,scale:number,width:number,frameWidth:number){if(frameWidth<=0)return Math.min(97,Math.max(3,x));const maxWidth=maxTextLayerWidth(50,scale,frameWidth);const effectiveWidth=Math.min(width,maxWidth);const centerLimit=effectiveWidth*scale/2+18/frameWidth*100;return Math.min(100-centerLimit,Math.max(centerLimit,x));}
=======
export function storyTextLines(text:string){return text.split(/\r\n|\n|\r/);}
export function resizedTextWidth(width:number,dx:number,dy:number,rotation:number,scale:number,frameWidth:number,side:1|-1){const a=rotation*Math.PI/180;return Math.min(95,Math.max(15,width+side*(dx*Math.cos(a)+dy*Math.sin(a))*2/scale/frameWidth*100));}
export function fittedStoryFont(base:number,naturalWidth:number,availableWidth:number){return Math.min(base,base*Math.max(1,availableWidth)/Math.max(1,naturalWidth));}
>>>>>>> 2a4dada9553e879ce071105c0051eb621f45180a
export function readMentions(value:unknown):StoryMention[]{if(!Array.isArray(value))return [];return value.filter((m):m is StoryMention=>!!m&&typeof m==='object'&&typeof m.userId==='string'&&/^[0-9a-f-]{36}$/i.test(m.userId)&&typeof m.label==='string'&&['x','y','width','height'].every(k=>typeof m[k]==='number'&&Number.isFinite(m[k])&&m[k]>=0&&m[k]<=100));}