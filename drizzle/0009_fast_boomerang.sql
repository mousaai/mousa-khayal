CREATE TABLE `cost_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('llm','image_gen','runway','elevenlabs','storage','other') NOT NULL,
	`operation` varchar(128) NOT NULL,
	`units` int NOT NULL DEFAULT 1,
	`unitType` varchar(32) NOT NULL,
	`costUsd` varchar(20) NOT NULL,
	`userId` int,
	`jobId` varchar(64),
	`projectId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cost_events_id` PRIMARY KEY(`id`)
);
