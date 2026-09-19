CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`phone` varchar(40),
	`email` varchar(255),
	`specialty` varchar(120),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`buildingId` int,
	`unitId` int,
	`vendorId` int,
	`title` varchar(255) NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('open','assigned','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`slaHours` int NOT NULL DEFAULT 48,
	`dueAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `vendors_company_idx` ON `vendors` (`companyId`,`status`);--> statement-breakpoint
CREATE INDEX `work_orders_company_status_idx` ON `work_orders` (`companyId`,`status`);--> statement-breakpoint
CREATE INDEX `work_orders_vendor_idx` ON `work_orders` (`vendorId`);