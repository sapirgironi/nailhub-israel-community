import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/saved')({head:()=>({meta:[{title:'השמורים שלי — NailHub'},{name:'description',content:'השמורים שלי לקהילת הציפורניים של ישראל'},{property:'og:title',content:'השמורים שלי — NailHub'},{property:'og:description',content:'השמורים שלי לקהילת הציפורניים של ישראל'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:()=> <NailHubApp section="saved"/>});
