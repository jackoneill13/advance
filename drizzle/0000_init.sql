CREATE TABLE `advances` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`artist_id` text NOT NULL,
	`rider_id` text,
	`title` text NOT NULL,
	`show_date` text,
	`doors_time` text,
	`status` text DEFAULT 'open' NOT NULL,
	`share_token` text NOT NULL,
	`fit` text,
	`scope_message` text,
	`match_model` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rider_id`) REFERENCES `riders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`agency` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`id` text PRIMARY KEY NOT NULL,
	`advance_id` text NOT NULL,
	`act_name` text NOT NULL,
	`name` text NOT NULL,
	`plus_ones` integer DEFAULT 0 NOT NULL,
	`note` text,
	`added_by` text NOT NULL,
	`source` text DEFAULT 'venue' NOT NULL,
	`late` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`advance_id`) REFERENCES `advances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`advance_id` text NOT NULL,
	`idx` integer NOT NULL,
	`category` text NOT NULL,
	`text` text NOT NULL,
	`quantity` text,
	`spec` text,
	`requirement` text NOT NULL,
	`page` integer,
	`confidence` text NOT NULL,
	`state` text NOT NULL,
	`reason` text NOT NULL,
	`suggested_substitute` text,
	`question_for_artist` text,
	`cost_note` text,
	`decision` text,
	`decision_note` text,
	`decided_by` text,
	`decided_at` text,
	`artist_answer` text,
	`answered_at` text,
	`tm_approval_required` integer DEFAULT false NOT NULL,
	`tm_approved` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`advance_id`) REFERENCES `advances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`advance_id` text NOT NULL,
	`channel` text NOT NULL,
	`direction` text NOT NULL,
	`party` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`advance_id`) REFERENCES `advances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `party_members` (
	`id` text PRIMARY KEY NOT NULL,
	`advance_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`phone` text,
	`email` text,
	`dietary` text,
	`arrival` text,
	`pass_type` text,
	`source` text DEFAULT 'venue' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`advance_id`) REFERENCES `advances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `riders` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`filenames` text NOT NULL,
	`storage_paths` text NOT NULL,
	`parsed` text,
	`parsed_at` text,
	`parse_model` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`advance_id` text NOT NULL,
	`kind` text NOT NULL,
	`plate` text,
	`driver` text,
	`phone` text,
	`arrival` text,
	`note` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`advance_id`) REFERENCES `advances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text,
	`capacity` integer DEFAULT 300 NOT NULL,
	`spec_pack` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
