CREATE TABLE `demo_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`role` text NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_workspaces_token_hash_unique` ON `demo_workspaces` (`token_hash`);--> statement-breakpoint
CREATE INDEX `demo_expiry_idx` ON `demo_workspaces` (`expires_at`);