CREATE TABLE `ai_learning_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(32) NOT NULL,
	`interactionType` enum('query','report','calculation','search','recommendation') NOT NULL DEFAULT 'query',
	`inputSummary` text,
	`quality` enum('good','bad','neutral') NOT NULL DEFAULT 'neutral',
	`qualityReason` text,
	`responseTimeMs` int,
	`tokensUsed` int,
	`usedLocalKnowledge` boolean NOT NULL DEFAULT false,
	`usedLLM` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_learning_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(32) NOT NULL,
	`title` varchar(512),
	`summary` text,
	`status` enum('active','archived','completed') NOT NULL DEFAULT 'active',
	`messageCount` int NOT NULL DEFAULT 0,
	`totalCreditsUsed` int NOT NULL DEFAULT 0,
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_knowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(32) NOT NULL,
	`knowledgeType` enum('faq','case_study','template','rule','definition','procedure') NOT NULL DEFAULT 'faq',
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`keywords` json,
	`source` enum('ai_generated','expert_verified','official_doc','user_feedback') NOT NULL DEFAULT 'ai_generated',
	`useCount` int NOT NULL DEFAULT 0,
	`qualityScore` int NOT NULL DEFAULT 50,
	`isVerified` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`language` varchar(8) NOT NULL DEFAULT 'ar',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_knowledge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sub_platform_sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(32) NOT NULL,
	`operation` enum('verify_token','check_balance','deduct_credits','pricing_update','report_session') NOT NULL,
	`userId` int,
	`success` boolean NOT NULL,
	`creditsDeducted` int,
	`errorMessage` text,
	`responseTimeMs` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sub_platform_sync_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thread_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`creditsUsed` int NOT NULL DEFAULT 0,
	`isHelpful` boolean,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thread_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`summary` text,
	`profession` varchar(255),
	`location` varchar(255),
	`expertiseLevel` enum('beginner','intermediate','expert') DEFAULT 'beginner',
	`preferredPlatforms` json,
	`projectTypes` json,
	`interests` json,
	`customData` json,
	`totalSessions` int NOT NULL DEFAULT 0,
	`totalReports` int NOT NULL DEFAULT 0,
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_memory_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_memory_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`language` varchar(8) NOT NULL DEFAULT 'ar',
	`responseStyle` enum('detailed','concise','technical','simple') DEFAULT 'detailed',
	`units` enum('metric','imperial') DEFAULT 'metric',
	`timezone` varchar(64) DEFAULT 'Asia/Dubai',
	`emailNotifications` boolean NOT NULL DEFAULT true,
	`weeklyDigest` boolean NOT NULL DEFAULT false,
	`customSettings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`platform` varchar(32) NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text NOT NULL,
	`summary` text,
	`reportType` enum('analysis','recommendation','inspection','calculation','search','design','other') NOT NULL DEFAULT 'other',
	`creditsUsed` int NOT NULL DEFAULT 0,
	`userRating` int,
	`exportedPdf` boolean NOT NULL DEFAULT false,
	`inputData` json,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_reports_id` PRIMARY KEY(`id`)
);
