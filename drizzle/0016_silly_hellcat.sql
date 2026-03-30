CREATE TABLE `platform_pricing_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(32) NOT NULL,
	`baseCost` int NOT NULL DEFAULT 5,
	`minCost` int NOT NULL DEFAULT 5,
	`maxCost` int NOT NULL DEFAULT 100,
	`factorWeights` json NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_pricing_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_pricing_rules_platform_unique` UNIQUE(`platform`)
);
