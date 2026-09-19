CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`buildingId` int,
	`category` varchar(100) NOT NULL,
	`description` varchar(255) NOT NULL,
	`amountIls` int NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`status` enum('planned','approved','paid') NOT NULL DEFAULT 'planned',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurring_charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`unitId` int,
	`tenantId` int,
	`description` varchar(255) NOT NULL,
	`amountIls` int NOT NULL,
	`dueDay` int NOT NULL DEFAULT 1,
	`status` enum('active','paused','ended') NOT NULL DEFAULT 'active',
	`nextDueAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurring_charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `expenses_company_date_idx` ON `expenses` (`companyId`,`expenseDate`);--> statement-breakpoint
CREATE INDEX `expenses_building_idx` ON `expenses` (`buildingId`);--> statement-breakpoint
CREATE INDEX `recurring_charges_company_idx` ON `recurring_charges` (`companyId`,`status`);--> statement-breakpoint
CREATE INDEX `recurring_charges_unit_idx` ON `recurring_charges` (`unitId`);