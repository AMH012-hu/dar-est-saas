CREATE TABLE `audit_filter_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromDate` varchar(10),
	`toDate` varchar(10),
	`action` varchar(120),
	`actor` varchar(160),
	`search` varchar(160),
	`range` varchar(16) NOT NULL DEFAULT 'custom',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_filter_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_filter_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `audit_filter_preferences_user_idx` ON `audit_filter_preferences` (`userId`);