CREATE TABLE `collection_payment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`collectionId` int NOT NULL,
	`leaseId` int NOT NULL,
	`unitId` int NOT NULL,
	`tenantId` int NOT NULL,
	`eventType` enum('payment','reversal','waiver','adjustment') NOT NULL DEFAULT 'payment',
	`idempotencyKey` varchar(96) NOT NULL,
	`amountIls` int NOT NULL,
	`paymentMethod` enum('cash','bank','card','transfer','other'),
	`effectiveAt` timestamp NOT NULL,
	`recordedByUserId` int NOT NULL,
	`requestId` varchar(64),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_payment_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `collection_payment_events_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `collection_payment_events_company_idx` ON `collection_payment_events` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `collection_payment_events_collection_idx` ON `collection_payment_events` (`collectionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `collection_payment_events_lease_idx` ON `collection_payment_events` (`leaseId`,`effectiveAt`);