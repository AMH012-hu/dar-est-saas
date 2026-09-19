CREATE TABLE `fulfillment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerEventId` varchar(255) NOT NULL,
	`source` enum('stripe','owner_test','owner_manual') NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`planCode` varchar(32) NOT NULL,
	`stripeCheckoutSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fulfillment_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `fulfillment_events_providerEventId_unique` UNIQUE(`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `license_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyValue` varchar(56) NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `license_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `license_keys_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `license_keys_keyValue_unique` UNIQUE(`keyValue`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planCode` varchar(32) NOT NULL,
	`status` enum('active','canceled','expired') NOT NULL DEFAULT 'active',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`canceledAt` timestamp,
	`stripeCheckoutSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`isTest` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `subscriptions_stripeCheckoutSessionId_unique` UNIQUE(`stripeCheckoutSessionId`),
	CONSTRAINT `subscriptions_stripePaymentIntentId_unique` UNIQUE(`stripePaymentIntentId`),
	CONSTRAINT `subscriptions_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_stripeCustomerId_unique` UNIQUE(`stripeCustomerId`);--> statement-breakpoint
CREATE INDEX `fulfillment_events_user_idx` ON `fulfillment_events` (`userId`,`processedAt`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_ends_idx` ON `subscriptions` (`status`,`endsAt`);