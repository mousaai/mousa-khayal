CREATE TABLE `refund_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`paymentId` int,
	`stripePaymentIntentId` varchar(128),
	`stripeRefundId` varchar(128),
	`amountCents` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'usd',
	`creditsToDeduct` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','approved','rejected','refunded') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refund_requests_id` PRIMARY KEY(`id`)
);
