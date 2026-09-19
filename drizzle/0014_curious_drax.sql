CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`email` varchar(320),
	`phone` varchar(40),
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`address` varchar(255),
	`status` enum('active','vacant','maintenance') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`status` enum('todo','in_progress','done') NOT NULL DEFAULT 'todo',
	`dueAt` timestamp,
	`assignedToUserId` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `clients_company_idx` ON `clients` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `properties_company_idx` ON `properties` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tasks_company_idx` ON `tasks` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`assignedToUserId`);