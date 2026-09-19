CREATE TABLE `sales_call_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesClientId` int NOT NULL,
	`salesTeamMemberId` int NOT NULL,
	`callType` enum('inbound','outbound','meeting','whatsapp','other') NOT NULL DEFAULT 'outbound',
	`outcome` text NOT NULL,
	`interestLevel` enum('not_interested','low','medium','high','very_high') NOT NULL DEFAULT 'medium',
	`interestSubject` varchar(500),
	`nextCallAt` timestamp,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_call_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sales_call_inventory_company_client_idx` ON `sales_call_inventory` (`companyId`,`salesClientId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_call_inventory_member_idx` ON `sales_call_inventory` (`salesTeamMemberId`,`createdAt`);