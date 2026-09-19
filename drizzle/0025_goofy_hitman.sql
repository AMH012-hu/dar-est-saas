ALTER TABLE `audit_logs` ADD `requestId` varchar(64);--> statement-breakpoint
CREATE INDEX `audit_logs_request_idx` ON `audit_logs` (`requestId`,`createdAt`);