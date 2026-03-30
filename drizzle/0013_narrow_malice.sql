CREATE TABLE `error_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`platform` varchar(64) NOT NULL DEFAULT 'general',
	`errorType` enum('ui','api','voice','payment','performance','other') NOT NULL DEFAULT 'other',
	`errorMessage` text,
	`userDescription` text,
	`pageUrl` varchar(512),
	`stackTrace` text,
	`status` enum('open','investigating','resolved','closed') NOT NULL DEFAULT 'open',
	`adminNote` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `error_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`platform` varchar(64) NOT NULL DEFAULT 'general',
	`sessionId` int,
	`rating` int NOT NULL,
	`feedbackType` enum('session','general','feature','bug') NOT NULL DEFAULT 'general',
	`comment` text,
	`isReviewed` boolean NOT NULL DEFAULT false,
	`adminReply` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `user_feedback_id` PRIMARY KEY(`id`)
);
