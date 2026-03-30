CREATE TABLE `guest_trials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fingerprint` varchar(128) NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code','khayal') NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`previewContent` text,
	`fullContent` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	CONSTRAINT `guest_trials_id` PRIMARY KEY(`id`)
);
