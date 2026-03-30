CREATE TABLE `user_project_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code') NOT NULL,
	`projectName` varchar(255),
	`location` varchar(255),
	`projectType` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_project_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_sessions` ADD `summary` text;