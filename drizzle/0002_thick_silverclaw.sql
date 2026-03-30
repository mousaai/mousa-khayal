CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`stripeSessionId` varchar(128),
	`packageId` varchar(64) NOT NULL,
	`creditsGranted` int NOT NULL,
	`amountCents` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'usd',
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_stripePaymentIntentId_unique` UNIQUE(`stripePaymentIntentId`),
	CONSTRAINT `payments_stripeSessionId_unique` UNIQUE(`stripeSessionId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(64);