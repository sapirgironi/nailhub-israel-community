import { Link } from '@tanstack/react-router';
import { BriefcaseBusiness, Calculator, FileSignature, Palette, PenLine, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

const tools = [
  { to: '/calculator', title: 'מחשבון תמחור חכם', icon: Calculator },
  { to: '/health', title: 'הצהרת בריאות דיגיטלית', icon: FileSignature },
  { to: '/pricelist', title: 'מחולל מחירון', icon: Palette },
  { to: '/draft', title: 'עוזרת הבינה המלאכותית', icon: PenLine },
] as const;

export function ClinicHub() {
  return <section aria-labelledby="clinic-title">
    <div className="flex items-center gap-3 mb-8 border-b border-border pb-6">
      <BriefcaseBusiness className="size-7 text-primary shrink-0" />
      <h1 id="clinic-title" className="text-2xl font-black">הקליניקה שלי</h1>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {tools.map(({ to, title, icon: Icon }) => <Button key={to} asChild variant="outline" className="h-auto min-h-28 w-full justify-start gap-4 rounded-2xl bg-card p-5 whitespace-normal text-right shadow-soft hover:bg-accent/50">
        <Link to={to}>
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-6" /></span>
          <span className="min-w-0 flex-1 text-base font-bold">{title}</span>
          <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </Button>)}
    </div>
  </section>;
}