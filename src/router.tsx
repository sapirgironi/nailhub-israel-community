import { QueryClient } from "@tanstack/react-query";
import { createRoute, createRouter, type AnyRoute } from "@tanstack/react-router";
import { OAuthCallback } from "./components/OAuthCallback";
import { routeTree } from "./routeTree.gen";

const TildeOAuthRoute = createRoute({
  getParentRoute: () => routeTree,
  path: "/~oauth",
  component: OAuthCallback,
});

// addChildren mutates and replaces the root's children, so keep the generated
// children and register the extra route exactly once at module load.
const routeTreeWithOAuth = routeTree.addChildren([
  ...(Object.values(routeTree.children ?? {}) as AnyRoute[]),
  TildeOAuthRoute,
]);

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree: routeTreeWithOAuth,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
