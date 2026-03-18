CREATE TABLE `video_jobs` (
	`id` varchar(64) NOT NULL,
	`userId` int,
	`status` enum('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`currentStep` varchar(512),
	`description` text,
	`videoUrl` text,
	`error` text,
	`metrics` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_jobs_id` PRIMARY KEY(`id`)
);
