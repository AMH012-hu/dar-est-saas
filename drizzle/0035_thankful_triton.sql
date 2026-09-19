ALTER TABLE `sales_properties` ADD `isPublished` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sales_properties` ADD `publicDescription` text;--> statement-breakpoint
ALTER TABLE `sales_properties` ADD `publicImagesJson` text;--> statement-breakpoint
ALTER TABLE `sales_properties` ADD `paymentPlanJson` text;