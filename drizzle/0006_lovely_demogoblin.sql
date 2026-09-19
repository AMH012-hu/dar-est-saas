CREATE TABLE `payment_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerEventId` varchar(255) NOT NULL,
	`providerPaymentId` varchar(255),
	`providerOrderId` varchar(255),
	`source` enum('stripe','paypal','bit','owner_test','owner_manual') NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`planCode` varchar(32) NOT NULL,
	`amountIls` int NOT NULL,
	`invoiceId` int,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_ledger_providerEventId_unique` UNIQUE(`providerEventId`),
	CONSTRAINT `payment_ledger_providerPaymentId_unique` UNIQUE(`providerPaymentId`)
);
--> statement-breakpoint
CREATE INDEX `payment_ledger_user_idx` ON `payment_ledger` (`userId`,`recordedAt`);