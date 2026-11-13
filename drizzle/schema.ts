import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const clientRequestRateEvents = pgTable(
  "client_request_rate_events",
  {
    sourceHash: text("source_hash").notNull(),
    fingerprint: text("fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("client_request_rate_source_created_idx").on(table.sourceHash, table.createdAt),
    index("client_request_rate_created_idx").on(table.createdAt),
    check("client_request_rate_source_hash_valid", sql`${table.sourceHash} ~ '^[0-9a-f]{64}$'`),
    check("client_request_rate_fingerprint_valid", sql`${table.fingerprint} ~ '^[0-9a-f]{64}$'`),
  ],
).enableRLS();
