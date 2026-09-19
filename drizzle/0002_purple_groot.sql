ALTER TABLE `fulfillment_events` MODIFY COLUMN `source` enum('stripe','paypal','bit','owner_test','owner_manual') NOT NULL;--> statement-breakpoint
ALTER TABLE `fulfillment_events` ADD `providerOrderId` varchar(255);--> statement-breakpoint
ALTER TABLE `fulfillment_events` ADD `providerPaymentId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `paymentProvider` enum('paypal','bit','owner_test','owner_manual');--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `providerOrderId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `providerPaymentId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_providerOrderId_unique` UNIQUE(`providerOrderId`);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_providerPaymentId_unique` UNIQUE(`providerPaymentId`);