ALTER TABLE `collection_payment_events` ADD COLUMN `reversedPaymentEventId` int;
ALTER TABLE `collection_payment_events` ADD CONSTRAINT `collection_payment_events_reversal_unique` UNIQUE(`reversedPaymentEventId`);
