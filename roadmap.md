# NailHub roadmap

- [ ] Integrate complete upload: Lilac/Mauve navigation, real feed/saved/trade, insurance, calculator, signed health form and digital pricelist; preserve real auth and private records

- [x] Dependency security: lockfile resolves source-map-js 1.2.2, js-yaml 4.3.2, zod 4.6.7; production dependency scan clean, regression tests and automatic build passed

- [x] Security: owner/admin RLS, database plain-text validation, validated WhatsApp destinations; unit tests and signed-out browser check passed, repeat database scan has no PII exposure
- [ ] Security: signed-in owner/admin end-to-end verification — blocked until user signs in to preview; session mint cannot match requester, query tool cannot impersonate authenticated role
- [x] Review complete master-app upload without replacing live authentication — file is complete but contains demo-only data and simulated persistence

- [x] Health declarations table (submit-only)
- [x] Pink luxury restyle from uploaded file (superseded by Phase 1 palette)
- [ ] Phase 1: cream/rose design system (#FAFAF8, #FFFFFF, #C59B8B, #E8D3CE, #2D2B2A), Hebrew RTL
- [ ] Phase 1: bottom bar (mobile) / sidebar (desktop) with tabs פיד, כלים, לוחות, פרופיל
- [x] Phase 1: email/password auth + profiles (Instagram field + student role still to add to form)
- [x] Phase 4: boards (/boards) — models + jobs, WhatsApp buttons
- [ ] Phase 1: visual feed (grid/list + search) — waiting on rest of spec (message was cut off)
- [x] Home page replaced with user code (pink/rose-gold)
- [x] Community database (profiles, posts, saved, trade, insurance, role requests) from uploaded SQL
- [x] Shared role/service lists (src/lib/roles.ts)
- [x] Boards: studio name + materials amount, new styling
- [x] Real email/password sign-up + login, profiles saved
- [ ] Main app (feed/NailTrade/insurance/saved) integration — user chose integration with existing live app, not a demo replacement
- [x] AI post draft writer (Hebrew)
