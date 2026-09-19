CREATE TABLE `manual_payment_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planCode` varchar(32) NOT NULL,
	`provider` enum('bit','paypal') NOT NULL,
	`reference` varchar(255) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`ownerNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manual_payment_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `manual_payment_requests_user_idx` ON `manual_payment_requests` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `manual_payment_requests_status_idx` ON `manual_payment_requests` (`status`,`createdAt`);