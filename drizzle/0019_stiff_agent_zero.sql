CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`propertyId` int,
	`unitId` int,
	`title` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(700) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`versionNumber` int NOT NULL DEFAULT 1,
	`expiresAt` timestamp,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `documents_company_idx` ON `documents` (`companyId`,`category`);--> statement-breakpoint
CREATE INDEX `documents_expiry_idx` ON `documents` (`expiresAt`);