CREATE TABLE `suspended_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`suspendedAt` bigint NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suspended_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `suspended_users_userId_unique` UNIQUE(`userId`)
);
