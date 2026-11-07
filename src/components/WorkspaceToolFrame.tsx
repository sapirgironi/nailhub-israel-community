import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

export function WorkspaceToolFrame({
  destination,
  children,
}: {
  destination: "clinic" | "academy";
  children: ReactNode;
}) {
  const isAcademy = destination === "academy";

  return (
    <div className="-mx-4 -mt-4 md:-mx-8 md:-mt-8">
      <header className="sticky top-14 z-20 border-b border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur md:px-8">
        <Button
          asChild
          variant="outline"
          className="h-12 min-h-12 w-full justify-center rounded-xl text-base font-bold sm:w-fit"
        >
          <Link to={isAcademy ? "/academy" : "/clinic"}>
            <ArrowLeft aria-hidden="true" />
            {isAcademy ? "חזרה לאקדמיה שלי" : "חזרה לקליניקה שלי"}
          </Link>
        </Button>
      </header>
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
