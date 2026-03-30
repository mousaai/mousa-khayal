CREATE TABLE `ai_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code') NOT NULL,
	`title` varchar(255),
	`status` enum('active','completed','failed') NOT NULL DEFAULT 'active',
	`creditsUsed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('welcome_bonus','purchase','usage','admin_grant','admin_deduct','refund') NOT NULL,
	`platform` varchar(32),
	`description` text,
	`balanceAfter` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`totalEarned` int NOT NULL DEFAULT 0,
	`totalSpent` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_wallets_userId_unique` UNIQUE(`userId`)
);
