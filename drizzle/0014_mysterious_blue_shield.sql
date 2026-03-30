CREATE TABLE `discount_code_uses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeId` int NOT NULL,
	`userId` int NOT NULL,
	`paymentId` int,
	`discountApplied` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discount_code_uses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` text,
	`discountType` enum('percent','credits') NOT NULL DEFAULT 'credits',
	`discountValue` int NOT NULL,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`maxUsesPerUser` int DEFAULT 1,
	`minAmountCents` int,
	`applicablePackages` json,
	`isActive` int NOT NULL DEFAULT 1,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discount_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `discount_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referral_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`totalReferrals` int NOT NULL DEFAULT 0,
	`totalCreditsEarned` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_codes_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `referral_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`refereeId` int NOT NULL,
	`status` enum('pending','rewarded') NOT NULL DEFAULT 'pending',
	`referrerCredits` int NOT NULL DEFAULT 0,
	`refereeCredits` int NOT NULL DEFAULT 0,
	`rewardedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_refereeId_unique` UNIQUE(`refereeId`)
);
