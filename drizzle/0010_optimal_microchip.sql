ALTER TABLE `users` MODIFY COLUMN `openId` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `verifyToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `verifyTokenExpiresAt` timestamp;