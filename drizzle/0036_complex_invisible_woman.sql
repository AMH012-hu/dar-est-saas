CREATE TABLE `property_inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`salesPropertyId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`phone` varchar(48) NOT NULL,
	`email` varchar(320),
	`message` text NOT NULL,
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `property_inquiries_company_idx` ON `property_inquiries` (`companyId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `property_inquiries_property_idx` ON `property_inquiries` (`salesPropertyId`,`createdAt`);