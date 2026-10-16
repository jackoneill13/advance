CREATE TABLE `venue_staff` (
	`id` text PRIMARY KEY NOT NULL,
	`advance_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`phone` text,
	`call_time` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`advance_id`) REFERENCES `advances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `advances` ADD `schedule` text;--> statement-breakpoint
ALTER TABLE `advances` ADD `schedule_confirmed_at` text;--> statement-breakpoint
ALTER TABLE `advances` ADD `dos_notes` text;