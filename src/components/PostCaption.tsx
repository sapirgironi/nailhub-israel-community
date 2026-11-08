import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { readPostMentions } from "@/lib/feed-post";
export function PostCaption({
  text,
  mentions,
  className,
  inline = false,
}: {
  text: string | null;
  mentions: unknown;
  className?: string;
  inline?: boolean;
}) {
  const members = readPostMentions(mentions);
  const content = (text ?? "").split(/(\s+)/).map((part, i) => {
    const member = members.find(
      (m) => part === m.label || part.replace(/[.,!?;:]+$/, "") === m.label,
    );
    return member ? (
      <Fragment key={i}>
        <Link
          className="text-primary font-bold underline underline-offset-2"
          to="/members/$memberId"
          params={{ memberId: member.userId }}
        >
          {member.label}
        </Link>
        {part.slice(member.label.length)}
      </Fragment>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    );
  });
  return inline ? (
    <span className={className}>{content}</span>
  ) : (
    <p className={className ?? "text-sm whitespace-pre-wrap break-words mb-4"}>{content}</p>
  );
}
