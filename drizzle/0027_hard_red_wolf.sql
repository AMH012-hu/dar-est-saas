CREATE TABLE `building_amenities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`buildingId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` enum('security','utilities','recreation','accessibility','services','other') NOT NULL DEFAULT 'other',
	`status` enum('active','maintenance','inactive') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `building_amenities_id` PRIMARY KEY(`id`),
	CONSTRAINT `building_amenities_building_name_unique` UNIQUE(`buildingId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `building_floors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`buildingId` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`floorNumber` int,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `building_floors_id` PRIMARY KEY(`id`),
	CONSTRAINT `building_floors_building_label_unique` UNIQUE(`buildingId`,`label`)
);
--> statement-breakpoint
CREATE TABLE `building_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`buildingId` int NOT NULL,
	`floorId` int,
	`label` varchar(120) NOT NULL,
	`roomType` enum('common','storage','parking','amenity','office','retail','other') NOT NULL DEFAULT 'common',
	`areaSqm` int,
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `building_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `building_rooms_building_label_unique` UNIQUE(`buildingId`,`label`)
);
--> statement-breakpoint
CREATE INDEX `building_amenities_company_building_idx` ON `building_amenities` (`companyId`,`buildingId`,`status`);--> statement-breakpoint
CREATE INDEX `building_floors_company_building_idx` ON `building_floors` (`companyId`,`buildingId`,`floorNumber`);--> statement-breakpoint
CREATE INDEX `building_rooms_company_building_idx` ON `building_rooms` (`companyId`,`buildingId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `building_rooms_floor_idx` ON `building_rooms` (`floorId`);