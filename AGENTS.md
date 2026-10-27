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
- New story, feed, profile and trade images use authenticated Cloudinary uploads through active-account server functions; persisted unsigned optimized URLs are resolved to image bytes through RLS-checked server requests, never permanent delivery signatures, to preserve privacy. Legacy storage images retain signed URLs and health signatures remain owner/admin-only.
- Signature capture uses dynamically imported signature_pad after hydration; tool saves report success only after database confirmation.

- User-facing failures pass through the Hebrew error mapper; form validation is intercepted centrally to avoid browser-locale messages, while technical logs remain separate.
- Password inputs share PasswordField and password-policy so visibility controls and minimum-length validation stay consistent without client complexity scoring.

- RegistrationForm owns signup presentation while NailHubApp retains real auth/profile handlers; no benefit claims or mocked supplier approval are imported from demo uploads.
- Owner-authored policy pages are standalone public routes without auth-dependent loaders or HubShell, so legal information remains accessible before signup.
- Permanent bans use the central is_account_banned predicate with restrictive application/storage policies and active-account AI middleware; the UI checks on load, focus and periodically to deny existing sessions too.
- Admin-only email lookup verifies has_role before importing the privileged client; supplier credit set/add uses a serialized database function so concurrent updates cannot overwrite balances.
- Story editor layers use a fixed 9:16 frame and percentage text widths; export rasterizes the same DOM layout to JPEG so browser Hebrew wrapping and fonts stay consistent. Admin stickers are private blobs to avoid cross-origin canvas taint.
- Story mentions persist stable member IDs with normalized image hit areas; community discovery uses the authenticated narrow community_members projection, never full private profiles, so contact information stays protected.
- Prebundle the router, query and story export dependencies with React in Vite to avoid mixed dependency generations; keep react-start out of prebundling because its server boundaries require the framework transform.
