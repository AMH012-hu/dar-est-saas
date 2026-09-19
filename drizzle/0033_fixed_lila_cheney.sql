CREATE TABLE `company_resource_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`resourceType` varchar(64) NOT NULL,
	`resourceId` varchar(128) NOT NULL,
	`revisionNumber` int NOT NULL,
	`operation` enum('created','updated','deleted','replaced') NOT NULL,
	`summary` varchar(255) NOT NULL,
	`beforeSnapshot` text,
	`afterSnapshot` text,
	`metadata` text,
	`actorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_resource_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_resource_revisions_unique` UNIQUE(`companyId`,`resourceType`,`resourceId`,`revisionNumber`)
);
--> statement-breakpoint
CREATE INDEX `company_resource_revisions_resource_idx` ON `company_resource_revisions` (`companyId`,`resourceType`,`resourceId`,`revisionNumber`);--> statement-breakpoint
CREATE INDEX `company_resource_revisions_actor_idx` ON `company_resource_revisions` (`companyId`,`actorUserId`,`createdAt`);