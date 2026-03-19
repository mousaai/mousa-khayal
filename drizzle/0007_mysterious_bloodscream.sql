ALTER TABLE `video_jobs` ADD `sceneStates` json;--> statement-breakpoint
ALTER TABLE `video_jobs` ADD `scriptData` json;--> statement-breakpoint
ALTER TABLE `video_jobs` ADD `optionsData` json;--> statement-breakpoint
ALTER TABLE `video_jobs` ADD `retryCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `video_jobs` ADD `lastHeartbeat` timestamp DEFAULT (now());