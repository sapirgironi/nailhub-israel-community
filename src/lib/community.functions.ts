import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {setResponseHeader} from '@tanstack/react-start/server';
import {requireActiveAccount} from './account-access';
export const findCommunityMembers=createServerFn({method:'POST'}).middleware([requireActiveAccount]).inputValidator((v:unknown)=>z.object({query:z.string().max(80).default(''),memberId:z.string().uuid().optional()}).parse(v)).handler(async({data,context})=>{
 setResponseHeader('Cache-Control','private, no-store');
 const {data:members,error}=await context.supabase.rpc('community_members',{search_text:data.query,...(data.memberId?{member_id:data.memberId}:{})});
 if(error)throw new Error('טעינת חברות הקהילה נכשלה');
 return Promise.all((members??[]).map(async member=>{
  let photo='';
  if(member.avatar_url?.startsWith('https://res.cloudinary.com/')){
   const cloud=process.env['CLOUDINARY_CLOUD_NAME'];const secret=process.env['CLOUDINARY_API_SECRET'];
   if(cloud&&secret)try{const {cloudinaryReference}=await import('./cloudinary');const {fetchOptimizedImage}=await import('./cloudinary.server');photo=await fetchOptimizedImage(cloud,secret,cloudinaryReference(member.avatar_url,cloud).path);}catch{/* Name remains available if the avatar cannot be loaded. */}
  }
  return {...member,avatar_url:photo||null};
 }));
});