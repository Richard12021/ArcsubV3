"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type ChartPlan = {
  id: string;
  name: string;
  revenue: string;
  subscribers: string;
};

export function RevenueChart({ plans }: { plans: ChartPlan[] }) {
  const data = plans.map((plan) => ({
    name: plan.name || `Plan #${plan.id}`,
    revenue: Number(plan.revenue),
    subscribers: Number(plan.subscribers),
  }));

  const totalRevenue = data.reduce(
    (sum, plan) => sum + plan.revenue,
    0
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">Onchain Revenue Overview</p>
          <h3 className="mt-2 text-3xl font-bold">
            {totalRevenue.toFixed(2)} USDC
          </h3>
        </div>

        <div className="rounded-xl border border-green-400/20 bg-green-400/10 px-3 py-2 text-sm text-green-400">
          Live Onchain
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center rounded-2xl border border-white/10 text-zinc-500">
          No merchant revenue yet
        </div>
      ) : (
        <BarChart width={820} height={280} data={data}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#a1a1aa" />
          <YAxis stroke="#a1a1aa" />
          <Tooltip />
<Bar
  dataKey="revenue"
  fill="#22c55e"
  radius={[10, 10, 0, 0]}
  maxBarSize={56}
/>        </BarChart>
      )}
    </div>
  );
}