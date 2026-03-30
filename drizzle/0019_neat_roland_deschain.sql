CREATE TABLE `oauth_transfer_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`sessionToken` text NOT NULL,
	`returnPath` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_transfer_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_transfer_tokens_token_unique` UNIQUE(`token`)
);
