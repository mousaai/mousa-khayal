CREATE TABLE `session_credit_refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int NOT NULL,
	`platform` varchar(32) NOT NULL,
	`creditsToRefund` int NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `session_credit_refunds_id` PRIMARY KEY(`id`)
);
