ALTER TABLE `work_orders` ADD `tenantId` int;--> statement-breakpoint
CREATE INDEX `work_orders_tenant_idx` ON `work_orders` (`tenantId`);