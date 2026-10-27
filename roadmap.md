# NailHub roadmap
- [ ] Connect Cloudinary for story backgrounds/final images, feed, profile and trade; preserve private delivery and legacy images; verify upload and reload.
- [x] Smart pricing calculator: business settings, 14 treatments, length/effects, AI material estimate (live call verified), discount, VAT 18%, save to price list; pricing unit tests pass
- [x] Admin trade photos/seller/date and approval actions, name/email search, supplier approval and atomic set/add credits, permanent application-access ban; authenticated browser verification passed: approval visible on board, 20 + 5 credits persisted as 25, blocked existing session denied UI/data.
- [x] Add public /terms with owner-supplied policy, signup/sidebar links, and back-to-top; routing tests and signed-out/authenticated browser checks passed on mobile and desktop.
- [x] 24-hour stories, feed interactions, notifications, story viewers — verified
- [x] Auth, Hebrew errors, palette, navigation, story editor, Google/Apple sign-in — verified
- [x] Primary admin assignment — sapiryedidia@gmail.com verified via auth-session --self
- [x] Admin panel Phase A: /admin (has_role-gated) with users (verify badge, mute 24h/week, quota override), blocked words, reports, support inbox, insurance leads CSV export, announcement banner, post pinning (max 3); AI comment moderation with blocked-words list + toxicity check + rephrase dialog (use suggestion / edit / cancel); post quota 2 per 24h and supplier feed block enforced by DB trigger; report button on posts; /support contact form. Verified in browser as admin: panel, announcement banner, blocked-word comment blocked with AI rephrase posted and cleaned up
- [x] Saved OpenAI key wired to structured moderation/rephrasing; publication server-enforced and suggestions rechecked; safety unit tests pass
- [ ] Current scope end-to-end verification: blocked by OpenAI account reporting no API credits; no additional provider requests until billing restored
- [x] Story upgrade: one circle per member with per-member progress, layered editor (drag, pinch/slider resize, live text, 7 Hebrew fonts, bold/underline/highlight, colors), admin PNG stickers, AI text helper (verified) and AI alt text
- [ ] Deferred by user: AI questionnaire generator and remaining administration features
- [ ] Remaining: audited support-as-user view, sponsored supplier billing and posts, push notifications (external setup required)
- [ ] Security: cross-user/admin end-to-end verification

## Done 2026-10-27
- Granted admin role to sapiryedidia0@walla.com (data change, user_roles); admin button verified for that account.
