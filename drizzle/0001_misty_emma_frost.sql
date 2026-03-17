CREATE TABLE `khayal_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`title` varchar(255),
	`description` text,
	`inputType` enum('text','file','url','mixed') NOT NULL DEFAULT 'text',
	`scenarioType` enum('design','develop','deteriorate','compare','imagine') NOT NULL DEFAULT 'imagine',
	`inputData` json,
	`status` enum('pending','processing','done','error') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `khayal_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `khayal_scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneType` varchar(64),
	`sceneLabel` varchar(255),
	`imageUrl` text,
	`prompt` text,
	`order` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `khayal_scenes_id` PRIMARY KEY(`id`)
);
