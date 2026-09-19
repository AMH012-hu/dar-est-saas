CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`resourceType` varchar(64) NOT NULL,
	`resourceId` varchar(128),
	`targetUserId` int,
	`success` boolean NOT NULL DEFAULT true,
	`errorCode` varchar(128),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','manager','support','analyst') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`,`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_target_idx` ON `audit_logs` (`targetUserId`,`createdAt`);