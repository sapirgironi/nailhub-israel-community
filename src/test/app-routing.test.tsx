import { QueryClient } from "@tanstack/react-query";
import { rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { getRouter } from "@/router";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("keeps the clinic and its real tools addressable", () => {
    const router = getRouter();
    for (const [path, routeId] of [
      ["/clinic", "/clinic"],
      ["/clinic/profit", "/clinic/profit"],
      ["/calculator", "/calculator"],
      ["/academy", "/academy/"],
      ["/academy/courses", "/academy/courses"],
      ["/academy/syllabus", "/academy/syllabus"],
      ["/academy/calculator", "/academy/calculator"],
      ["/academy-pricing", "/academy-pricing"],
      ["/c/9ba7b810-9dad-41f0-8b2a-0b2f6d5f5e54", "/c/$courseId"],
      ["/request/9ba7b810-9dad-41f0-8b2a-0b2f6d5f5e54", "/request/$techId"],
      ["/health", "/health"],
      ["/pricelist", "/pricelist"],
      ["/draft", "/draft"],
      ["/oauth", "/oauth"],
      ["/auth/callback", "/auth/callback"],
    ] as const) {
      expect(router.matchRoutes(path).at(-1)?.routeId).toBe(routeId);
    }
  });
  it("routes the tilde OAuth callback to its handler", () => {
    const router = getRouter();
    expect(router.matchRoutes("/~oauth").at(-1)?.routeId).toBe("/~oauth");
  });
  it("exposes /terms publicly without an auth guard or loader", () => {
    const router = getRouter();
    const matches = router.matchRoutes("/terms");
    expect(matches.at(-1)?.routeId).toBe("/terms");
    for (const match of matches) {
      const route = router.routesById[match.routeId];
      expect(route?.options.beforeLoad).toBeUndefined();
      expect(route?.options.loader).toBeUndefined();
    }
  });
  it("exposes the client request page publicly without an auth guard or loader", () => {
    const router = getRouter();
    const matches = router.matchRoutes("/request/9ba7b810-9dad-41f0-8b2a-0b2f6d5f5e54");
    expect(matches.at(-1)?.routeId).toBe("/request/$techId");
    for (const match of matches) {
      const route = router.routesById[match.routeId];
      expect(route?.options.beforeLoad).toBeUndefined();
      expect(route?.options.loader).toBeUndefined();
    }
  });
  it("matches a page for / instead of falling back to not found", () => {
    const router = getRouter();

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
