CREATE TABLE `buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`portfolioId` int NOT NULL,
	`propertyId` int,
	`name` varchar(180) NOT NULL,
	`address` varchar(255),
	`totalUnits` int NOT NULL DEFAULT 0,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buildings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`buildingId` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`floor` varchar(40),
	`bedrooms` int NOT NULL DEFAULT 0,
	`areaSqm` int,
	`status` enum('vacant','occupied','reserved','maintenance') NOT NULL DEFAULT 'vacant',
	`askingRentIls` int NOT NULL DEFAULT 0,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`),
	CONSTRAINT `units_building_label_unique` UNIQUE(`buildingId`,`label`)
);
--> statement-breakpoint
CREATE INDEX `buildings_company_portfolio_idx` ON `buildings` (`companyId`,`portfolioId`);--> statement-breakpoint
CREATE INDEX `buildings_property_idx` ON `buildings` (`propertyId`);--> statement-breakpoint
CREATE INDEX `portfolios_company_idx` ON `portfolios` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `units_company_building_idx` ON `units` (`companyId`,`buildingId`);