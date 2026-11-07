import { Link } from "@tanstack/react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";

type DashboardPath =
  | "/clinic/profit"
  | "/calculator"
  | "/health"
  | "/pricelist"
  | "/draft"
  | "/academy/courses"
  | "/academy/syllabus"
  | "/academy/calculator";

type DashboardToolCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  to?: DashboardPath;
  badge?: string;
};

const cardClass =
  "group flex min-h-44 flex-col rounded-3xl border border-border bg-card p-5 text-right shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DashboardToolCard({
  title,
  description,
  icon: Icon,
  to,
  badge,
}: DashboardToolCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        {badge ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            {badge}
          </span>
        ) : (
          <ArrowLeft
            aria-hidden="true"
            className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1"
          />
        )}
      </div>
      <div className="mt-4 flex-1">
        <h2 className="text-base font-extrabold leading-snug">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {!badge && (
        <span className="mt-4 inline-flex h-10 items-center gap-2 self-start rounded-xl border border-primary/20 bg-primary/5 px-4 text-sm font-bold text-primary transition-colors group-hover:bg-primary/10">
          כניסה לכלי
          <ArrowLeft aria-hidden="true" className="size-4" />
        </span>
      )}
    </>
  );

  if (!to) {
    return (
      <div className={`${cardClass} cursor-not-allowed opacity-75`} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link to={to} className={cardClass}>
      {content}
    </Link>
  );
}
