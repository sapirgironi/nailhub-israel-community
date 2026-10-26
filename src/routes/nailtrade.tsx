import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/nailtrade')({head:()=>({meta:[{title:'ציוד יד שנייה — NailHub'},{name:'description',content:'ציוד יד שנייה לקהילת הציפורניים של ישראל'},{property:'og:title',content:'ציוד יד שנייה — NailHub'},{property:'og:description',content:'ציוד יד שנייה לקהילת הציפורניים של ישראל'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="nailtrade"/>});
