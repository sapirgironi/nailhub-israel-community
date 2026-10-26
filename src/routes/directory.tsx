import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/directory')({head:()=>({meta:[{title:'אינדקס וחיפוש — NailHub'},{name:'description',content:'אינדקס וחיפוש לקהילת הציפורניים של ישראל'},{property:'og:title',content:'אינדקס וחיפוש — NailHub'},{property:'og:description',content:'אינדקס וחיפוש לקהילת הציפורניים של ישראל'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="directory"/>});
