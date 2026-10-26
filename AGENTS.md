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
