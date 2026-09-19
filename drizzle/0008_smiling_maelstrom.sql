CREATE TABLE `activation_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`keyHint` varchar(12) NOT NULL,
	`planCode` varchar(32) NOT NULL,
	`status` enum('available','redeemed','revoked') NOT NULL DEFAULT 'available',
	`redeemedByUserId` int,
	`redeemedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activation_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `activation_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE INDEX `activation_keys_status_plan_idx` ON `activation_keys` (`status`,`planCode`);--> statement-breakpoint
CREATE INDEX `activation_keys_redeemed_user_idx` ON `activation_keys` (`redeemedByUserId`);