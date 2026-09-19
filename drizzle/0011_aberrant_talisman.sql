CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`ownerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `companies_ownerUserId_unique` UNIQUE(`ownerUserId`)
);
--> statement-breakpoint
CREATE TABLE `company_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','manager','member','viewer') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `companies_owner_idx` ON `companies` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `company_members_company_idx` ON `company_members` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `company_members_user_idx` ON `company_members` (`userId`);--> statement-breakpoint
CREATE INDEX `company_members_company_user_idx` ON `company_members` (`companyId`,`userId`);