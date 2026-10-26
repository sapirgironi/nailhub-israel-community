import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/pricelist')({head:()=>({meta:[{title:'מחירון דיגיטלי — NailHub'},{name:'description',content:'מחירון דיגיטלי לקהילת הציפורניים של ישראל'},{property:'og:title',content:'מחירון דיגיטלי — NailHub'},{property:'og:description',content:'מחירון דיגיטלי לקהילת הציפורניים של ישראל'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="pricelist"/>});
