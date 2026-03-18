CREATE TABLE `content_violations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`textSnippet` varchar(200) NOT NULL,
	`category` varchar(50) NOT NULL,
	`checkType` enum('pattern','ai') NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `content_violations_id` PRIMARY KEY(`id`)
);
