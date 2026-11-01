<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Profiles are created by the `handle_new_user` signup trigger from auth metadata; client never inserts profiles directly (keeps role/status trusted).
- Admin rights live only in `user_roles` + `has_role()`; never add admin flags to `profiles` (prevents self-escalation).
- AI calls run server-side in `*.server.ts`, exposed via authenticated `*.functions.ts` server functions (keeps the AI key off the browser).
- Comment moderation uses the shared request-scoped direct OpenAI provider; other AI features retain their existing provider to keep migrations scoped.
- Comments publish exclusively through the authenticated moderation server function; direct client inserts are revoked to prevent bypassing safety checks.
- Personal-record tables are owner/admin scoped; legacy rows without an owner remain admin-only because ownership must never be guessed.
- Free text uses shared plain-text schemas and database validation triggers; React renders it as text, never HTML, to prevent executable markup.
- Contact links are reconstructed from validated phone numbers and exact WhatsApp hosts, never arbitrary caller URLs.
- Hub content sections have individual routes with shared HubShell navigation; mobile uses five fixed actions and desktop uses a sidebar so links remain addressable.
- The clinic hub links to existing real tool routes, and publication uses the shared HubShell creation sheet on both mobile and desktop, preventing duplicated controls or demo-tool substitutions.
- New story, feed, profile and trade images use authenticated Cloudinary uploads through active-account server functions; persisted unsigned optimized URLs are resolved to image bytes through RLS-checked server requests, never permanent delivery signatures, to preserve privacy. Legacy storage images retain signed URLs and health signatures remain owner/admin-only.
- Signature capture uses dynamically imported signature_pad after hydration; tool saves report success only after database confirmation.

- User-facing failures pass through the Hebrew error mapper; form validation is intercepted centrally to avoid browser-locale messages, while technical logs remain separate.
- Password inputs share PasswordField and password-policy so visibility controls and minimum-length validation stay consistent without client complexity scoring.

- RegistrationForm owns signup presentation while NailHubApp retains real auth/profile handlers; no benefit claims or mocked supplier approval are imported from demo uploads.
- Owner-authored policy pages are standalone public routes without auth-dependent loaders or HubShell, so legal information remains accessible before signup.
- Permanent bans use the central is_account_banned predicate with restrictive application/storage policies and active-account AI middleware; the UI checks on load, focus and periodically to deny existing sessions too.
- Admin-only email lookup verifies has_role before importing the privileged client; supplier credit set/add uses a serialized database function so concurrent updates cannot overwrite balances.
- Story text uses pixel-width wrappers and natural word wrapping; resizing never changes font size, and text size is slider-controlled without transform scaling. Background pan/scale and text bounds are canvas-relative; export rasterizes the same transformed DOM to JPEG. Admin stickers are private blobs to avoid cross-origin canvas taint.
- Story controls share one translucent bottom drawer that collapses independently of layer selection; the mobile canvas fills editor width at 9:16 and background cover geometry is shared with pan bounds/export.
- Story text has one inline editable source; its compact toolbar follows visualViewport keyboard bounds without resizing the capture canvas, and explicit confirmation/background dismissal exits typing while native control focus preserves editing.
- Story background and overlays share explicit z-order and lock-checked gestures; photo frames use inline SVG masks with embedded image bytes in the same captured DOM, preserving preview/publication geometry without external image dependencies.
- Story editing uses independently memoized background/canvas/layers, frame-scheduled local gesture previews and single release commits; trash-hover state changes only at boundary crossings, and a bounded editing bitmap is replaced with the original only during publication to keep mobile work light without degrading export.
- Story mentions persist stable member IDs with normalized image hit areas; community discovery uses the authenticated narrow community_members projection, never full private profiles, so contact information stays protected.
- Prebundle the router, query and story export dependencies with React in Vite to avoid mixed dependency generations; keep react-start out of prebundling because its server boundaries require the framework transform.
- Feed composition is isolated in FeedPostComposer; tags use posts.service_tags and mentions store validated member IDs plus labels so rendering never trusts caller URLs.
- Feed photo-assisted writing uses request-scoped direct OpenAI GPT-4o; premium_subscriptions is owner-readable and admin-managed, and active unexpired access is rechecked server-side before every AI call, without admin bypass or automatic subscription grants.
- Plans and functional prototype routes use an isolated demo shell and demo-only session storage; never pass the demo selection to authentication, real AI, roles, verification, subscriptions or payments. Existing private health and pricelist tools remain separate because fictional previews must never mutate real records.
- Plan upgrade buttons check the signed-in account's persisted professional category independently of demo selection; nonprofessionals submit existing role-change requests, and credits remain display-only until billing exists, to prevent fictitious upgrades or grants.
