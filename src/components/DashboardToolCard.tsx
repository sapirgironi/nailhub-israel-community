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
  "group mb-2.5 flex w-full flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 text-right shadow-soft transition-colors hover:border-primary/25 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DashboardToolCard({
  title,
  description,
  icon: Icon,
  to,
  badge,
}: DashboardToolCardProps) {
  const content = (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent p-1.5 text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold sm:text-base">{title}</h2>
        <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {badge ? (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          {badge}
        </span>
      ) : null}
      {!badge && (
        <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary/10">
          <span className="hidden sm:inline">כניסה לכלי</span>
          <ArrowLeft aria-hidden="true" className="size-4" />
        </span>
      )}
    </div>
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
