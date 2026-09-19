import type { subscriptions } from "../drizzle/schema";

type SubscriptionRecord = typeof subscriptions.$inferSelect;

type Clock = Date;

export function cancelActiveSubscription(subscription: SubscriptionRecord, now: Clock = new Date()): SubscriptionRecord {
  if (subscription.status !== "active") {
    throw new Error("Only an active subscription can be canceled.");
  }
  return {
    ...subscription,
    status: "canceled",
    canceledAt: now,
    updatedAt: now,
  };
}

export function extendActiveSubscription(
  subscription: SubscriptionRecord,
  days: number,
  now: Clock = new Date(),
): SubscriptionRecord {
  if (!Number.isInteger(days) || days < 1 || days > 3660) {
    throw new Error("Extension must be between 1 and 3660 whole days.");
  }
  if (subscription.status !== "active") {
    throw new Error("Only an active subscription can be extended.");
  }
  if (subscription.endsAt.getTime() <= now.getTime()) {
    throw new Error("Expired subscriptions cannot be extended.");
  }
  return {
    ...subscription,
    status: "active",
    endsAt: new Date(subscription.endsAt.getTime() + days * 24 * 60 * 60 * 1000),
    canceledAt: null,
    updatedAt: now,
  };
}
