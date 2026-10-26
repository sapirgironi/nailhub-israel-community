import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/profile')({head:()=>({meta:[{title:'הפרופיל שלי — NailHub'},{name:'description',content:'הפרופיל שלי לקהילת הציפורניים של ישראל'},{property:'og:title',content:'הפרופיל שלי — NailHub'},{property:'og:description',content:'הפרופיל שלי לקהילת הציפורניים של ישראל'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="profile"/>});
