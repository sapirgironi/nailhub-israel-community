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
- Personal-record tables are owner/admin scoped; legacy rows without an owner remain admin-only because ownership must never be guessed.
- Free text uses shared plain-text schemas and database validation triggers; React renders it as text, never HTML, to prevent executable markup.
- Contact links are reconstructed from validated phone numbers and exact WhatsApp hosts, never arbitrary caller URLs.
- Hub content sections have individual routes with shared HubShell navigation; mobile uses five fixed actions and desktop uses a sidebar so links remain addressable.
- Work photos use private owner-uploaded storage and authenticated signed URLs; health signatures remain in owner/admin-only records to protect personal information.
- Signature capture uses dynamically imported signature_pad after hydration; tool saves report success only after database confirmation.

- User-facing failures pass through the Hebrew error mapper; form validation is intercepted centrally to avoid browser-locale messages, while technical logs remain separate.
- Password inputs share PasswordField and password-policy so visibility controls and minimum-length validation stay consistent without client complexity scoring.

- RegistrationForm owns signup presentation while NailHubApp retains real auth/profile handlers; no benefit claims or mocked supplier approval are imported from demo uploads.
