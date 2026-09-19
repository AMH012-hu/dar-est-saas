CREATE TABLE `crm_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesClientId` int NOT NULL,
	`salesTeamMemberId` int,
	`type` enum('call','whatsapp','meeting','viewing','email','note','other') NOT NULL DEFAULT 'note',
	`subject` varchar(180) NOT NULL,
	`outcome` text,
	`scheduledAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_client_properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesClientId` int NOT NULL,
	`salesPropertyId` int NOT NULL,
	`interestLevel` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_client_properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_client_properties_unique` UNIQUE(`companyId`,`salesClientId`,`salesPropertyId`)
);
--> statement-breakpoint
CREATE TABLE `crm_stage_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesClientId` int NOT NULL,
	`fromStage` varchar(32),
	`toStage` varchar(32) NOT NULL,
	`actorUserId` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_stage_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `leadSource` varchar(100);--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `pipelineStage` enum('new','contacted','qualified','viewing','negotiation','won','lost') DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `budgetMinIls` int;--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `budgetMaxIls` int;--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `preferredPropertyType` varchar(120);--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `preferredLocation` varchar(180);--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `nextFollowUpAt` timestamp;--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `lastContactedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `lostReason` text;--> statement-breakpoint
ALTER TABLE `sales_clients` ADD `assignedSalesTeamMemberId` int;--> statement-breakpoint
CREATE INDEX `crm_activities_client_idx` ON `crm_activities` (`companyId`,`salesClientId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `crm_activities_member_idx` ON `crm_activities` (`companyId`,`salesTeamMemberId`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `crm_activities_schedule_idx` ON `crm_activities` (`companyId`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `crm_client_properties_client_idx` ON `crm_client_properties` (`companyId`,`salesClientId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `crm_client_properties_property_idx` ON `crm_client_properties` (`companyId`,`salesPropertyId`);--> statement-breakpoint
CREATE INDEX `crm_stage_history_client_idx` ON `crm_stage_history` (`companyId`,`salesClientId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `crm_stage_history_stage_idx` ON `crm_stage_history` (`companyId`,`toStage`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_clients_company_stage_idx` ON `sales_clients` (`companyId`,`pipelineStage`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `sales_clients_follow_up_idx` ON `sales_clients` (`companyId`,`nextFollowUpAt`);--> statement-breakpoint
CREATE INDEX `sales_clients_assignee_idx` ON `sales_clients` (`companyId`,`assignedSalesTeamMemberId`);