CREATE TABLE `scene_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` varchar(64) NOT NULL,
	`sceneIndex` int NOT NULL,
	`imageUrl` text NOT NULL,
	`prompt` text,
	`revisionNote` text,
	`version` int NOT NULL DEFAULT 1,
	`isActive` int NOT NULL DEFAULT 1,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scene_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `share_links` (
	`id` varchar(32) NOT NULL,
	`jobId` varchar(64) NOT NULL,
	`videoUrl` text NOT NULL,
	`title` varchar(255),
	`description` text,
	`genre` varchar(64),
	`genreLabel` varchar(64),
	`genreEmoji` varchar(8),
	`thumbnailUrl` text,
	`viewCount` int NOT NULL DEFAULT 0,
	`userId` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `share_links_id` PRIMARY KEY(`id`)
);
