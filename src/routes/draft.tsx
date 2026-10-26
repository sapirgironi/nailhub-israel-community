import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/draft')({head:()=>({meta:[{title:'כתיבת פוסט חכמה — NailHub'},{name:'description',content:'כתיבת פוסט חכמה לקהילת הציפורניים של ישראל'},{property:'og:title',content:'כתיבת פוסט חכמה — NailHub'},{property:'og:description',content:'כתיבת פוסט חכמה לקהילת הציפורניים של ישראל'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="draft"/>});
