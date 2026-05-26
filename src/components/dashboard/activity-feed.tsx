"use client";

type ActivityPlan = {
  id: string;
  name: string;
  merchant: string;
  price: string;
  subscribers: string;
  revenue: string;
};

export function ActivityFeed({ plans }: { plans: ActivityPlan[] }) {
  const activities = plans
    .filter((plan) => Number(plan.subscribers) > 0 || Number(plan.revenue) > 0)
    .map((plan) => ({
      title: `${plan.name} received subscription activity`,
      subtitle: `${plan.subscribers} subscriber(s) • ${Number(plan.revenue).toFixed(
        2
      )} USDC revenue`,
      merchant: `${plan.merchant.slice(0, 6)}...${plan.merchant.slice(-4)}`,
    }));

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">Live Activity</p>
          <h3 className="mt-2 text-2xl font-bold">Subscription Feed</h3>
        </div>

        <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">
          Onchain
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-500">
          No subscription activity yet.
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <p className="font-medium">{activity.title}</p>

              <p className="mt-1 text-sm text-zinc-400">
                {activity.subtitle}
              </p>

              <p className="mt-2 text-xs text-green-400">
                Merchant {activity.merchant}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}