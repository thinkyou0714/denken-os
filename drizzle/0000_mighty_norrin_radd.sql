CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_owner_expiry` ON `assets` (`owner`,`expires_at`);--> statement-breakpoint
CREATE TABLE `attempts` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`problem_id` text NOT NULL,
	`revision` text NOT NULL,
	`family` text NOT NULL,
	`mode` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_identity` ON `attempts` (`owner`,`id`);--> statement-breakpoint
CREATE INDEX `attempts_owner_created` ON `attempts` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_created` ON `audit` (`created_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`created_at` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_owner` ON `members` (`role`) WHERE "members"."role" = 'owner';--> statement-breakpoint
CREATE TABLE `records` (
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`body` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `records_identity` ON `records` (`owner`,`kind`,`id`);--> statement-breakpoint
CREATE INDEX `records_owner_kind_updated` ON `records` (`owner`,`kind`,`updated_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`target` text NOT NULL,
	`fingerprint` text NOT NULL,
	`decision` text NOT NULL,
	`reviewer` text NOT NULL,
	`reason` text NOT NULL,
	`cases` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_target_time` ON `reviews` (`target`,`created_at`);--> statement-breakpoint
CREATE TABLE `usage` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`kind` text NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`in_flight` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usage_identity` ON `usage` (`owner`,`day`,`kind`);