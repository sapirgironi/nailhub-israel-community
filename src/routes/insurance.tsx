import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/insurance')({head:()=>({meta:[{title:'ביטוח מקצועי — NailHub'},{name:'description',content:'ביטוח מקצועי לקהילת הציפורניים של ישראל'},{property:'og:title',content:'ביטוח מקצועי — NailHub'},{property:'og:description',content:'ביטוח מקצועי לקהילת הציפורניים של ישראל'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="insurance"/>});
