CREATE TABLE `company_notification_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`notificationKey` varchar(160) NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_notification_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_notification_reads_unique` UNIQUE(`companyId`,`userId`,`notificationKey`)
);
--> statement-breakpoint
CREATE INDEX `company_notification_reads_member_idx` ON `company_notification_reads` (`companyId`,`userId`,`readAt`);