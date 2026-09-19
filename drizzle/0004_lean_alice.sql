CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`manualPaymentRequestId` int,
	`planCode` varchar(32) NOT NULL,
	`amountIls` int NOT NULL,
	`invoiceNumber` varchar(32) NOT NULL,
	`serialCode` varchar(40) NOT NULL,
	`status` enum('issued','pending','paid','rejected') NOT NULL DEFAULT 'pending',
	`proofUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`),
	CONSTRAINT `invoices_serialCode_unique` UNIQUE(`serialCode`)
);
--> statement-breakpoint
CREATE INDEX `invoices_user_idx` ON `invoices` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`,`createdAt`);