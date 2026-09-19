CREATE TABLE `company_activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`resourceType` varchar(64) NOT NULL,
	`resourceId` varchar(128),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','manager','member','viewer') NOT NULL DEFAULT 'member',
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`invitedByUserId` int NOT NULL,
	`acceptedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_invitations_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `company_activity_company_idx` ON `company_activity_logs` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `company_activity_actor_idx` ON `company_activity_logs` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `company_invitations_company_idx` ON `company_invitations` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `company_invitations_email_idx` ON `company_invitations` (`email`,`status`);