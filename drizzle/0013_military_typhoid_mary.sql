ALTER TABLE `users` ADD `mousaUserId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `mousaBalance` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `mousaLastSync` timestamp;