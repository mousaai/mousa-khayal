CREATE TABLE `owner_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incidentId` int,
	`alertType` enum('immediate','summary','decision','info') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`sent` boolean DEFAULT false,
	`sentAt` timestamp,
	`ownerResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(32) NOT NULL,
	`lastSessionSummary` text,
	`lastQuery` text,
	`lastResponse` text,
	`lastProjectContext` json,
	`totalSessions` int DEFAULT 0,
	`totalCreditsUsed` int DEFAULT 0,
	`extractedPreferences` json,
	`lastSessionAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `session_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_auto_fixes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incidentId` int NOT NULL,
	`fixType` enum('retry_request','refresh_token','fallback_direct_url','clear_cache','restart_service','update_config','notify_platform','requeue_failed_jobs') NOT NULL,
	`success` boolean NOT NULL,
	`actionTaken` text NOT NULL,
	`durationMs` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_auto_fixes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_health_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target` varchar(64) NOT NULL,
	`checkType` enum('platform_reachability','token_generation','token_verification','credit_deduction','database_connectivity','llm_availability','payment_gateway','email_service') NOT NULL,
	`status` enum('healthy','degraded','failed','unknown') NOT NULL,
	`responseTimeMs` int,
	`httpStatus` int,
	`errorMessage` text,
	`details` json,
	`autoFixed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_health_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target` varchar(64) NOT NULL,
	`incidentType` enum('platform_down','token_auth_failure','credit_sync_failure','high_error_rate','slow_response','payment_failure','llm_unavailable','database_error','config_drift','security_anomaly') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`status` enum('detected','auto_fixing','auto_fixed','escalated','owner_notified','resolved','ignored') NOT NULL DEFAULT 'detected',
	`description` text NOT NULL,
	`canAutoFix` boolean DEFAULT false,
	`autoFixAttempts` int DEFAULT 0,
	`detectedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`metadata` json,
	`ownerDecision` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_incidents_id` PRIMARY KEY(`id`)
);
