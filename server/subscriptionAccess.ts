export type SubscriptionAccessRecord = {
  status: "active" | "canceled" | "expired";
  endsAt: Date;
};

export function hasActiveSubscription(
  subscription: SubscriptionAccessRecord | null | undefined,
  now: Date = new Date(),
) {
  return Boolean(
    subscription &&
      subscription.status === "active" &&
      subscription.endsAt.getTime() > now.getTime(),
  );
}

export function requireActiveSubscription(
  subscription: SubscriptionAccessRecord | null | undefined,
  now: Date = new Date(),
) {
  if (!hasActiveSubscription(subscription, now)) {
    throw new Error("ACTIVE_SUBSCRIPTION_REQUIRED");
  }
  return subscription;
}
