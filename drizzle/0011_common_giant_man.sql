CREATE TABLE `platform_cost_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code','khayal','mousa_main','shared') NOT NULL,
	`category` enum('manus_hosting','sub_platform_hosting','llm_api','tts_api','stt_api','storage','database','stripe_fees','domain','email_service','other') NOT NULL,
	`monthlyBudgetCents` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_cost_budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_cost_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` enum('fada','raqaba','harara','maskan','code','khayal','mousa_main','shared') NOT NULL DEFAULT 'shared',
	`category` enum('manus_hosting','sub_platform_hosting','llm_api','tts_api','stt_api','storage','database','stripe_fees','domain','email_service','other') NOT NULL,
	`amountCents` int NOT NULL,
	`description` text,
	`periodStart` varchar(10) NOT NULL,
	`periodEnd` varchar(10) NOT NULL,
	`invoiceRef` varchar(255),
	`loggedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_cost_logs_id` PRIMARY KEY(`id`)
);
