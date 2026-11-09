import { QueryClient } from "@tanstack/react-query";
import { createRoute, createRouter } from "@tanstack/react-router";
import { OAuthCallback } from "./components/OAuthCallback";
import { routeTree } from "./routeTree.gen";

const TildeOAuthRoute = createRoute({
  getParentRoute: () => routeTree,
  path: "/~oauth",
  component: OAuthCallback,
});

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree: routeTree.addChildren([TildeOAuthRoute]),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
