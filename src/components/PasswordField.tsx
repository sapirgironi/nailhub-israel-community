import {useId,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {Button} from './ui/button';
import {MIN_PASSWORD_LENGTH} from '@/lib/password-policy';

export function PasswordField({value,onChange,autoComplete,compact=false}:{value:string;onChange:(value:string)=>void;autoComplete:'current-password'|'new-password';compact?:boolean}){
  const id=useId();
  const [visible,setVisible]=useState(false);
  const action=visible?'הסתרת סיסמה':'הצגת סיסמה';
  return <div>
    <label htmlFor={id} className={`block ${compact?'text-[11px] font-semibold mb-1':'text-xs font-bold mb-1.5'} text-foreground`}>סיסמה *</label>
    <div className="relative">
      <input id={id} type={visible?'text':'password'} required minLength={MIN_PASSWORD_LENGTH} data-password-field autoComplete={autoComplete} value={value} onChange={e=>onChange(e.target.value)} className={`w-full ${compact?'pl-10 pr-2.5 py-2.5 rounded-xl text-xs':'pl-12 pr-4 py-3 rounded-2xl text-sm'} border border-border focus:ring-2 focus:ring-ring outline-none text-right bg-accent`} dir="rtl"/>
      <Button type="button" size="icon" variant="ghost" aria-label={action} title={action} aria-pressed={visible} aria-controls={id} onClick={()=>setVisible(!visible)} className={`absolute left-2 top-1/2 -translate-y-1/2 text-primary ${compact?'h-7 w-7':'h-8 w-8'}`}>
        {visible?<EyeOff/>:<Eye/>}
      </Button>
    </div>
  </div>;
}