import {useEffect,useState} from 'react';
import {hebrewValidation} from '@/lib/hebrew-errors';
import {Button} from './ui/button';
import {X} from 'lucide-react';

export function HebrewSystemMessages(){
  const [message,setMessage]=useState('');
  useEffect(()=>{
    const invalid=(event:Event)=>{
      const input=event.target;
      if(!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement))return;
      event.preventDefault();
      setMessage(hebrewValidation(input));
      const form=input.form;
      const first=form?.querySelector(':invalid');
      if(first instanceof HTMLElement)first.focus();
    };
    document.addEventListener('invalid',invalid,true);
    return()=>document.removeEventListener('invalid',invalid,true);
  },[]);
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),8000);return()=>clearTimeout(timer);},[message]);
  return message?<div dir="rtl" role="alert" className="fixed z-[100] top-4 right-4 left-4 sm:left-auto sm:max-w-md border border-border bg-card shadow-soft rounded-lg p-4 flex items-start gap-3 text-right text-sm"><span className="flex-1">{message}</span><Button size="icon" variant="ghost" aria-label="סגירת הודעה" onClick={()=>setMessage('')}><X/></Button></div>:null;
}