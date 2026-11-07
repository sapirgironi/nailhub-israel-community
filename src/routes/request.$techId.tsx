import { createFileRoute } from "@tanstack/react-router";
import { ClientRequestPage } from "@/components/ClientRequestPage";

export const Route = createFileRoute("/request/$techId")({
  head: () => ({
    meta: [
      { title: "פנייה לטכנאית — NailHub" },
      { name: "description", content: "שליחת בקשה פרטית לתיקון או לתיאום תור." },
    ],
  }),
  component: RequestRoute,
});

function RequestRoute() {
  const { techId } = Route.useParams();
  return <ClientRequestPage techId={techId} />;
}
