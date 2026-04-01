CREATE TABLE `architectural_designs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(128) NOT NULL,
	`prompt` text NOT NULL,
	`style` enum('modern','islamic','gulf','contemporary') NOT NULL DEFAULT 'modern',
	`type` enum('exterior','interior','floor_plan') NOT NULL DEFAULT 'exterior',
	`imageUrl` text NOT NULL,
	`imageKey` varchar(512),
	`referenceImageUrl` text,
	`creditsCost` int NOT NULL DEFAULT 50,
	`shareToken` varchar(64),
	`isPublic` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `architectural_designs_id` PRIMARY KEY(`id`),
	CONSTRAINT `architectural_designs_shareToken_unique` UNIQUE(`shareToken`)
);
