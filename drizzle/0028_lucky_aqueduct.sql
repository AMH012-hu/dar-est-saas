CREATE TABLE `sales_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`importBatchId` int,
	`externalId` varchar(160),
	`name` varchar(220) NOT NULL,
	`email` varchar(320),
	`phone` varchar(48),
	`identityNumber` varchar(120),
	`attributesJson` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesPropertyId` int NOT NULL,
	`salesClientId` int NOT NULL,
	`contractNumber` varchar(80) NOT NULL,
	`status` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
	`listPriceIls` int NOT NULL,
	`discountKind` enum('none','fixed','percentage') NOT NULL DEFAULT 'none',
	`discountValue` int NOT NULL DEFAULT 0,
	`discountAmountIls` int NOT NULL DEFAULT 0,
	`netPriceIls` int NOT NULL,
	`depositIls` int NOT NULL DEFAULT 0,
	`balanceIls` int NOT NULL,
	`paymentFrequency` enum('quarterly','semiannual','annual') NOT NULL DEFAULT 'quarterly',
	`termYears` int NOT NULL,
	`installmentCount` int NOT NULL,
	`installmentAmountIls` int NOT NULL,
	`firstInstallmentAt` timestamp,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_contracts_company_number_unique` UNIQUE(`companyId`,`contractNumber`)
);
--> statement-breakpoint
CREATE TABLE `sales_import_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`kind` enum('properties','clients') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`rowCount` int NOT NULL DEFAULT 0,
	`status` enum('completed','failed') NOT NULL DEFAULT 'completed',
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_import_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_installments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesContractId` int NOT NULL,
	`sequenceNumber` int NOT NULL,
	`dueAt` timestamp NOT NULL,
	`amountIls` int NOT NULL,
	`status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_installments_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_installments_contract_sequence_unique` UNIQUE(`salesContractId`,`sequenceNumber`)
);
--> statement-breakpoint
CREATE TABLE `sales_properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`importBatchId` int,
	`externalId` varchar(160),
	`name` varchar(220) NOT NULL,
	`address` varchar(320),
	`propertyType` varchar(120),
	`status` enum('available','reserved','sold','inactive') NOT NULL DEFAULT 'available',
	`areaSqm` int,
	`listPriceIls` int,
	`attributesJson` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sales_clients_company_idx` ON `sales_clients` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_clients_batch_idx` ON `sales_clients` (`importBatchId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_contracts_company_status_idx` ON `sales_contracts` (`companyId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_contracts_property_idx` ON `sales_contracts` (`salesPropertyId`);--> statement-breakpoint
CREATE INDEX `sales_contracts_client_idx` ON `sales_contracts` (`salesClientId`);--> statement-breakpoint
CREATE INDEX `sales_import_batches_company_idx` ON `sales_import_batches` (`companyId`,`kind`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_installments_company_due_idx` ON `sales_installments` (`companyId`,`status`,`dueAt`);--> statement-breakpoint
CREATE INDEX `sales_properties_company_idx` ON `sales_properties` (`companyId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_properties_batch_idx` ON `sales_properties` (`importBatchId`,`createdAt`);