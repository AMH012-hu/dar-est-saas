CREATE TABLE `lease_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`leaseId` int NOT NULL,
	`unitId` int NOT NULL,
	`tenantId` int NOT NULL,
	`periodLabel` varchar(80) NOT NULL,
	`dueAt` timestamp NOT NULL,
	`amountDueIls` int NOT NULL,
	`amountReceivedIls` int NOT NULL DEFAULT 0,
	`status` enum('scheduled','due','partial','paid','overdue','waived') NOT NULL DEFAULT 'scheduled',
	`paymentMethod` enum('cash','bank','card','transfer','other'),
	`receivedAt` timestamp,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lease_collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `lease_collections_lease_period_unique` UNIQUE(`leaseId`,`periodLabel`)
);
--> statement-breakpoint
CREATE INDEX `lease_collections_company_status_idx` ON `lease_collections` (`companyId`,`status`,`dueAt`);--> statement-breakpoint
CREATE INDEX `lease_collections_lease_idx` ON `lease_collections` (`leaseId`,`dueAt`);--> statement-breakpoint
CREATE INDEX `lease_collections_unit_idx` ON `lease_collections` (`unitId`);