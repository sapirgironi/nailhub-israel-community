import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/health')({head:()=>({meta:[{title:'הצהרת בריאות — NailHub'},{name:'description',content:'הצהרת בריאות לקהילת הציפורניים של ישראל'},{property:'og:title',content:'הצהרת בריאות — NailHub'},{property:'og:description',content:'הצהרת בריאות לקהילת הציפורניים של ישראל'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="health_form"/>});
