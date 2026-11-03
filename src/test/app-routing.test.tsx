import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("keeps the clinic and its real tools addressable", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const [path, routeId] of [
      ["/clinic", "/clinic"],
      ["/calculator", "/calculator"],
      ["/academy", "/academy/"],
      ["/academy/calculator", "/academy/calculator"],
      ["/academy-pricing", "/academy-pricing"],
      ["/c/9ba7b810-9dad-41f0-8b2a-0b2f6d5f5e54", "/c/$courseId"],
      ["/health", "/health"],
      ["/pricelist", "/pricelist"],
      ["/draft", "/draft"],
    ] as const) {
      expect(router.matchRoutes(path).at(-1)?.routeId).toBe(routeId);
    }
  });
  it("exposes /terms publicly without an auth guard or loader", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/terms");
    expect(matches.at(-1)?.routeId).toBe("/terms");
    for (const match of matches) {
      const route = router.routesById[match.routeId];
      expect(route?.options.beforeLoad).toBeUndefined();
      expect(route?.options.loader).toBeUndefined();
    }
  });
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
