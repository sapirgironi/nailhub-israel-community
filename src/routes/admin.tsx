import {createFileRoute} from '@tanstack/react-router';
import {NailHubApp} from '@/components/NailHubApp';
export const Route=createFileRoute('/admin')({head:()=>({meta:[{title:'פאנל ניהול — NailHub'},{name:'description',content:'ניהול קהילת NailHub'},{property:'og:title',content:'פאנל ניהול — NailHub'},{property:'og:description',content:'ניהול קהילת NailHub'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:()=> <NailHubApp section="admin"/>});
