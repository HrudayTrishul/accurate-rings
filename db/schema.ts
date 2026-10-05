import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const demoWorkspaces = sqliteTable('demo_workspaces', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  role: text('role').notNull(),
  state: text('state').notNull(),
  version: integer('version').notNull().default(1),
  expiresAt: integer('expires_at').notNull(),
}, (table) => [index('demo_expiry_idx').on(table.expiresAt)]);
