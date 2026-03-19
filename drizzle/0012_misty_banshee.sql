CREATE TABLE `khayal_failures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`failureType` enum('llm_error','image_error','storage_error','timeout','quality_low','content_blocked','other') NOT NULL,
	`provider` enum('khayal','manus','openai','replicate','runway','elevenlabs') NOT NULL,
	`fallbackProvider` enum('manus','openai','replicate','none'),
	`errorMessage` text,
	`errorCode` varchar(32),
	`operation` varchar(64) NOT NULL,
	`inputSummary` text,
	`promptUsed` text,
	`analysisResult` text,
	`suggestedFix` text,
	`fixApplied` int NOT NULL DEFAULT 0,
	`durationMs` int,
	`retryCount` int NOT NULL DEFAULT 0,
	`userId` int,
	`jobId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `khayal_failures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_improvements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operation` varchar(64) NOT NULL,
	`domain` varchar(64),
	`failureType` varchar(64),
	`originalPrompt` text NOT NULL,
	`improvedPrompt` text NOT NULL,
	`improvementReason` text,
	`successRateBefore` int DEFAULT 0,
	`successRateAfter` int,
	`useCount` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`triggeredByFailureId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompt_improvements_id` PRIMARY KEY(`id`)
);
