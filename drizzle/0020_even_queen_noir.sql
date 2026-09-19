CREATE TABLE `leases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`unitId` int NOT NULL,
	`tenantId` int NOT NULL,
	`reference` varchar(80) NOT NULL,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`monthlyRentIls` int NOT NULL,
	`securityDepositIls` int NOT NULL DEFAULT 0,
	`paymentDueDay` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','notice','ended','terminated') NOT NULL DEFAULT 'draft',
	`renewalNoticeAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leases_id` PRIMARY KEY(`id`),
	CONSTRAINT `leases_company_reference_unique` UNIQUE(`companyId`,`reference`)
);
--> statement-breakpoint
CREATE INDEX `leases_company_status_idx` ON `leases` (`companyId`,`status`);--> statement-breakpoint
CREATE INDEX `leases_unit_idx` ON `leases` (`unitId`);--> statement-breakpoint
CREATE INDEX `leases_tenant_idx` ON `leases` (`tenantId`);