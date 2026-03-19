CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(128) NOT NULL,
	`preferredGenre` varchar(64),
	`preferredVoice` varchar(64),
	`preferredAspectRatio` varchar(16),
	`preferredSceneCount` int DEFAULT 5,
	`preferredStyle` varchar(64),
	`preferredDuration` varchar(16),
	`totalProductions` int NOT NULL DEFAULT 0,
	`genreHistory` json,
	`voiceHistory` json,
	`domainHistory` json,
	`lastProductionAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_userId_unique` UNIQUE(`userId`)
);
