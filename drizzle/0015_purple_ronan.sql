CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`attendanceDate` varchar(10) NOT NULL,
	`status` enum('present','absent','late','leave') NOT NULL DEFAULT 'present',
	`checkIn` varchar(5),
	`checkOut` varchar(5),
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_company_user_date_unique` UNIQUE(`companyId`,`userId`,`attendanceDate`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`tenantId` int,
	`propertyId` int,
	`title` varchar(180) NOT NULL,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`rentAmountIls` int NOT NULL DEFAULT 0,
	`status` enum('active','expired','terminated') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`propertyId` int,
	`title` varchar(180) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`scheduledAt` timestamp,
	`costIls` int NOT NULL DEFAULT 0,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`tenantId` int,
	`contractId` int,
	`amountIls` int NOT NULL,
	`method` enum('cash','bank','card','transfer') NOT NULL DEFAULT 'bank',
	`status` enum('paid','pending','overdue') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`email` varchar(320),
	`phone` varchar(40),
	`propertyId` int,
	`status` enum('active','late','ended') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `attendance_company_date_idx` ON `attendance` (`companyId`,`attendanceDate`);--> statement-breakpoint
CREATE INDEX `contracts_company_idx` ON `contracts` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `contracts_end_idx` ON `contracts` (`endAt`);--> statement-breakpoint
CREATE INDEX `maintenance_company_idx` ON `maintenance` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `maintenance_status_idx` ON `maintenance` (`status`);--> statement-breakpoint
CREATE INDEX `operational_payments_company_idx` ON `operational_payments` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `operational_payments_status_idx` ON `operational_payments` (`status`);--> statement-breakpoint
CREATE INDEX `tenants_company_idx` ON `tenants` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tenants_property_idx` ON `tenants` (`propertyId`);