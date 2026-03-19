CREATE TABLE `image_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptHash` varchar(64) NOT NULL,
	`prompt` text NOT NULL,
	`imageUrl` text NOT NULL,
	`width` int NOT NULL DEFAULT 1280,
	`height` int NOT NULL DEFAULT 720,
	`hitCount` int NOT NULL DEFAULT 0,
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `image_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `image_cache_promptHash_unique` UNIQUE(`promptHash`)
);
