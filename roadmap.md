# NailHub roadmap
- [x] 24-hour stories (upload, auto-advance viewer, owner delete) and feed interactions (double-tap like with heart burst, comments, collab offers with author inbox) on real tables stories/post_likes/post_comments/collab_offers with RLS, grants, likes-count trigger and plain-text validation triggers; verified end-to-end in browser (signup, post, story, like, comment)
- [x] Integrate uploaded registration design with live auth; auto-confirm enabled, HIBP disabled, immediate signup-to-feed and profile persistence verified with six lowercase characters and no runtime errors. Two QA signup accounts remain for verification.
- [ ] Primary admin assignment — requested account was unconfirmed before auto-confirm and requester identity did not match; needs independent ownership verification, not auto-confirmation or a typed email.
- [x] Password visibility toggles and minimum-six-character-only client validation; both forms verified in browser and policy tests passed.
- [x] Hosted simple-password policy — HIBP disabled; real signup accepted six lowercase characters without numbers or symbols. Length/complexity settings not edited via tool, behavior verified end-to-end.
- [x] Replace lilac with Soft Blush/Petal Pink/Rose Gold; powder-white canvas, softer cards, natural work photos and milky mobile navigation. Verified desktop/mobile layout and compose, no horizontal overflow.
- [x] Hebrew-only system/auth errors, guidance and navigation; right-aligned RTL and localized form validation. Verified actual invalid-login response, weak-password and required-field validation in English-locale browser, signed-in pricelist and not-found screen; 11 tests passed.

- [x] Instagram-style mobile navigation: fixed five-icon frosted bottom bar, centered publish, insurance/notifications header, desktop-only sidebar and profile shortcuts; verified at 390px and 1280px

- [x] Integrate complete upload: Lilac/Mauve navigation, real feed/saved/trade, insurance, calculator, signed health form and digital pricelist; preserve real auth and private records. Verified publish/photo/save/delete, signed health readback and price-list persistence; insurance saves privately, no third-party sending

- [x] Dependency security: lockfile resolves source-map-js 1.2.2, js-yaml 4.3.2, zod 4.6.7; production dependency scan clean, regression tests and automatic build passed

- [x] Security: owner/admin RLS, database plain-text validation, validated WhatsApp destinations; unit tests and signed-out browser check passed, repeat database scan has no PII exposure
- [ ] Security: cross-user/admin end-to-end verification — owner session verified via existing sole QA user; separate owner/admin sessions still needed for cross-account proof
- [x] Review complete master-app upload without replacing live authentication — file is complete but contains demo-only data and simulated persistence

- [x] Health declarations table (submit-only)
- [x] Pink luxury restyle from uploaded file (superseded by Phase 1 palette)
- [x] Hebrew RTL design system — replaced by requested Lilac/Mauve palette
- [x] Mobile bottom bar / desktop sidebar — superseded by requested five-action Instagram navigation
- [x] Phase 1: email/password auth + profiles (Instagram field + student role still to add to form)
- [x] Phase 4: boards (/boards) — models + jobs, WhatsApp buttons
- [x] Visual feed with photos, search, posting and saved work from complete upload
- [x] Home page replaced with user code (pink/rose-gold)
- [x] Community database (profiles, posts, saved, trade, insurance, role requests) from uploaded SQL
- [x] Shared role/service lists (src/lib/roles.ts)
- [x] Boards: studio name + materials amount, new styling
- [x] Real email/password sign-up + login, profiles saved
- [x] Main app integration with existing live app, not a demo replacement; newest Instagram upload reviewed, hardcoded admin bypass excluded
- [x] AI post draft writer (Hebrew)
- [x] Story viewers list — story_views table with owner/admin RLS, view recorded on open (own views skipped), Eye button on own story opens viewer list; verified cross-user in browser
- [x] In-app notifications — notifications table (like/comment/collab) with recipient-only RLS, bell with unread badge in header, created on like/comment/collab; verified in browser with real cross-user data
- [x] Story editor (text, stickers, trash) wired to + sheet and feed
- [x] Verify Google/Apple sign-in on mobile lands new users in feed
- [ ] Admin top bar + admin role for sapiryedidia0@walla.com (needs verified ownership)
