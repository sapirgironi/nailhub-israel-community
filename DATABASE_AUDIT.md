# DATABASE_AUDIT.md

## Project

- Supabase project ref: `xharmtpftxebhwvmokxt`
- Database: PostgreSQL 17.11.0.018 (eu-west-1)
- Status: `ACTIVE_HEALTHY`
- Migration strategy: 27 original Drizzle migrations applied in 4 tracked batches.

## Applied Migrations

| Batch | Migration name | Version | Original migrations covered |
| --- | --- | --- | --- |
| 1 | `batch_0000_0004` | `20261107071141` | 0000–0004 |
| 2 | `batch_0005_0009` | `20261107071158` | 0005–0009 |
| 3 | `batch_0010_0014` | `20261107071222` | 0010–0019 |
| 4 | `batch_0020_0026` | `20261107071240` | 0020–0026 |

Status: all 4 batches reported `Migration applied successfully`; no SQL errors were returned during application.

## Tables and RLS Status

All 29 public tables exist and have RLS enabled (`rowsecurity = true`).

| Table | RLS enabled | Notes |
| --- | --- | --- |
| `ai_questionnaires` | Yes | Deprecated by user; authenticated access revoked |
| `announcements` | Yes | Admin-managed |
| `blocked_words` | Yes | Admin-managed |
| `collab_offers` | Yes | Sender/post-author scoped |
| `comment_moderation_events` | Yes | Admin read only |
| `community_activity` | Yes | Deprecated by user; authenticated access revoked |
| `community_credit_ledger` | Yes | Supplier credits; written via `manage_supplier_credits` |
| `health_declarations` | Yes | Owner/admin scoped; tool validation triggers |
| `insurance_leads` | Yes | Owner/admin scoped; tool validation triggers |
| `job_posts` | Yes | Owner scoped |
| `model_calls` | Yes | WhatsApp contact validation |
| `nail_trade_items` | Yes | Approved items public; pending review |
| `notifications` | Yes | Recipient scoped |
| `post_comments` | Yes | Readable; insert via moderation function only |
| `post_likes` | Yes | Own like scoped |
| `posts` | Yes | Author scoped; admin moderation policies |
| `premium_subscriptions` | Yes | Owner/admin readable |
| `price_list_items` | Yes | Owner/admin scoped |
| `profiles` | Yes | Sensitive fields protected by trigger |
| `reports` | Yes | Reporter/admin scoped |
| `role_change_requests` | Yes | User/admin scoped |
| `saved_posts` | Yes | Owner scoped |
| `stories` | Yes | 24h visibility; owner/admin delete |
| `story_stickers` | Yes | Admin-managed stickers |
| `story_views` | Yes | Story owner/admin read |
| `support_tickets` | Yes | Owner/admin scoped |
| `user_quotas` | Yes | Admin-managed |
| `user_roles` | Yes | Admin read via `has_role` |
| `user_sanctions` | Yes | Own/admin read; admin write |

## Functions, Triggers and Policies

- Core helper functions created: `has_role`, `is_account_banned`, `handle_new_user`, `prevent_sensitive_profile_updates`, `validate_application_text`, `validate_tool_inputs`, `validate_feed_metadata`, `validate_story_mentions`, `community_members`, `post_comment_counts`, `manage_supplier_credits`, `guard_trade_approval`, `guard_comment_author`, `enforce_post_rules`, `sync_post_likes_count`.
- Permanent-ban restrictive policies were applied to every RLS-enabled public table and to `storage.objects`.
- Safe-text and tool-input validation triggers were installed on the relevant tables.
- Indexes for paged feed, stories, comments and notifications were created.

## Warnings / Notes

- Several tables are marked `DEPRECATED` (`ai_questionnaires`, `community_activity`, `community_credit_ledger` partially) per product decisions; access was revoked accordingly.
- Storage buckets (`community-work`, `story-stickers`) are referenced by policies but bucket creation is outside SQL migrations; verify they exist in Supabase Storage before relying on uploads.
- The `handle_new_user` trigger depends on `auth.users`; it will activate on new signups.
- No seed/admin role was inserted; an initial admin must be assigned manually in `user_roles` if needed.
- All tables are empty (0 rows) after migration.

## Open Issues / Recommendations

- Create/verify Supabase Storage buckets `community-work` and `story-stickers` and their public/private settings.
- Assign at least one admin role in `user_roles` for initial management.
- Run the application against the new project and verify auth signup, RLS reads/writes, and storage uploads.
- Consider adding automated migration tracking per original file if future partial reruns are needed.
- Review `ai_questionnaires` and deprecated ledgers before exposing any related UI.
