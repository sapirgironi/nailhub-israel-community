import {useId,useRef,useState} from 'react';
import {ImagePlus} from 'lucide-react';
import {Button} from './ui/button';
export function HebrewPhotoInput({label,onChange}:{label:string;onChange:(file:File|null)=>void}){
 const id=useId();const ref=useRef<HTMLInputElement>(null);const [name,setName]=useState('');
 return <div className="space-y-2"><input id={id} ref={ref} aria-label={label} type="file" required accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const file=e.target.files?.[0]??null;setName(file?.name??'');onChange(file);}}/><Button type="button" variant="outline" onClick={()=>ref.current?.click()}><ImagePlus/>בחירת תמונה</Button><span className="block text-xs text-muted-foreground break-words text-right">{name||'לא נבחרה תמונה'}</span></div>;
}