CREATE TABLE `sales_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesTeamMemberId` int NOT NULL,
	`salesPropertyId` int,
	`salesClientId` int,
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`notes` text,
	`assignedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_daily_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesTeamMemberId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`taskDate` varchar(10) NOT NULL,
	`targetContacts` int NOT NULL DEFAULT 0,
	`completedContacts` int NOT NULL DEFAULT 0,
	`status` enum('todo','in_progress','done','cancelled') NOT NULL DEFAULT 'todo',
	`salesPropertyId` int,
	`salesClientId` int,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_daily_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`scope` enum('team','direct') NOT NULL DEFAULT 'team',
	`senderUserId` int NOT NULL,
	`recipientUserId` int,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_team_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('manager','supervisor','representative') NOT NULL DEFAULT 'representative',
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`invitedByUserId` int NOT NULL,
	`acceptedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_team_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_team_invitations_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `sales_team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('manager','supervisor','representative') NOT NULL DEFAULT 'representative',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_team_members_company_user_unique` UNIQUE(`companyId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `sales_assignments_company_member_idx` ON `sales_assignments` (`companyId`,`salesTeamMemberId`,`status`);--> statement-breakpoint
CREATE INDEX `sales_assignments_property_idx` ON `sales_assignments` (`salesPropertyId`);--> statement-breakpoint
CREATE INDEX `sales_assignments_client_idx` ON `sales_assignments` (`salesClientId`);--> statement-breakpoint
CREATE INDEX `sales_daily_tasks_company_date_idx` ON `sales_daily_tasks` (`companyId`,`taskDate`,`status`);--> statement-breakpoint
CREATE INDEX `sales_daily_tasks_member_date_idx` ON `sales_daily_tasks` (`salesTeamMemberId`,`taskDate`,`status`);--> statement-breakpoint
CREATE INDEX `sales_messages_company_created_idx` ON `sales_messages` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_messages_recipient_read_idx` ON `sales_messages` (`recipientUserId`,`readAt`);--> statement-breakpoint
CREATE INDEX `sales_team_invites_company_status_idx` ON `sales_team_invitations` (`companyId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_team_invites_email_status_idx` ON `sales_team_invitations` (`email`,`status`);--> statement-breakpoint
CREATE INDEX `sales_team_members_company_role_idx` ON `sales_team_members` (`companyId`,`role`,`status`);