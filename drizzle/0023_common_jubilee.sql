ALTER TABLE `leases` ADD `renewalDecision` enum('not_requested','offered','accepted','declined') DEFAULT 'not_requested' NOT NULL;--> statement-breakpoint
ALTER TABLE `leases` ADD `renewedFromLeaseId` int;--> statement-breakpoint
ALTER TABLE `leases` ADD `moveInStatus` enum('pending','ready','completed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `leases` ADD `moveOutStatus` enum('not_started','scheduled','completed') DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `leases` ADD `moveOutAt` timestamp;--> statement-breakpoint
ALTER TABLE `leases` ADD `depositReturnedIls` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leases` ADD `handoverNotes` text;