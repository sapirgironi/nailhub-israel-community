import { createFileRoute } from "@tanstack/react-router";
import { OAuthCallback } from "@/components/OAuthCallback";

export const Route = createFileRoute("/auth/callback")({
  component: OAuthCallback,
});
