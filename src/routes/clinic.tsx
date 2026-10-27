import { createFileRoute } from '@tanstack/react-router';
import { NailHubApp } from '@/components/NailHubApp';

export const Route = createFileRoute('/clinic')({
  head: () => ({ meta: [
    { title: 'הקליניקה שלי — NailHub' },
    { name: 'description', content: 'כלי ניהול הקליניקה: מחשבון תמחור, הצהרת בריאות, מחירון ועוזרת בינה מלאכותית.' },
    { property: 'og:title', content: 'הקליניקה שלי — NailHub' },
    { property: 'og:description', content: 'כלי ניהול הקליניקה: מחשבון תמחור, הצהרת בריאות, מחירון ועוזרת בינה מלאכותית.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: () => <NailHubApp section="clinic" />,
});