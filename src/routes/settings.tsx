import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/settings')({head:()=>({meta:[{title:'הגדרות חשבון — NailHub'},{name:'description',content:'פרטי החשבון וניהול תפקיד בקהילת NailHub'},{property:'og:title',content:'הגדרות חשבון — NailHub'},{property:'og:description',content:'פרטי החשבון וניהול תפקיד בקהילת NailHub'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="profile"/>});
