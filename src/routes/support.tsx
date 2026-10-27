import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/support')({head:()=>({meta:[{title:'צרי קשר — NailHub'},{name:'description',content:'פנייה להנהלת קהילת NailHub'},{property:'og:title',content:'צרי קשר — NailHub'},{property:'og:description',content:'פנייה להנהלת קהילת NailHub'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:()=> <NailHubApp section="support"/>});
