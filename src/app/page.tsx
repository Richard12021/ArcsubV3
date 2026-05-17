
"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { TurnkeyButton } from "@/components/ui/turnkey-button";

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };

    okxwallet?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
  }
}

const CONTRACT_ADDRESS =
  "0xab5BD669D057042eeA9460D3cC5f15c275f3fBF4";

const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000";

const ERC20_ABI = [
  "function approve(address spender,uint256 amount) external returns (bool)",
];

const ARCSUB_ABI = [
  "function planCount() external view returns (uint256)",
  "function createPlan(string name,string description,uint256 price,address token,uint8 interval,uint256 trialDays,uint256 gracePeriodDays) external",
  "function plans(uint256) external view returns (uint256 id,address merchant,string name,string description,uint256 price,address token,uint8 interval,uint256 trialDays,uint256 gracePeriodDays,bool active,uint256 createdAt,uint256 totalSubscribers,uint256 totalRevenue)",
  "function subscribe(uint256 planId) external",
  "function pay(uint256 planId,string couponCode) external",
];

type Plan = {
  id: string;
  merchant: string;
  name: string;
  description: string;
  price: string;
  token: string;
  interval: string;
  active: boolean;
  subscribers: string;
  revenue: string;
};

const intervalLabels: Record<string, string> = {
  "0": "Weekly",
  "1": "Monthly",
  "2": "Yearly",
};

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [planCount, setPlanCount] = useState("0");
  const [plans, setPlans] = useState<Plan[]>([]);

  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planInterval, setPlanInterval] = useState("1");

  const totalRevenue = plans.reduce(
    (sum, plan) => sum + Number(plan.revenue),
    0
  );

  const totalSubscribers = plans.reduce(
    (sum, plan) => sum + Number(plan.subscribers),
    0
  );

  const activePlans = plans.filter((plan) => plan.active).length;

  const averagePlanPrice =
    plans.length > 0
      ? plans.reduce((sum, plan) => sum + Number(plan.price), 0) / plans.length
      : 0;

  async function connectWallet() {
    const walletProvider =
  window.okxwallet ||
  window.ethereum;

if (!walletProvider) {
  alert("Please install MetaMask or OKX Wallet");
  return;
}

    const ARC_CHAIN_ID = "0x4CEF52";

    const ARC_TESTNET = {
      chainId: ARC_CHAIN_ID,
      chainName: "Arc Testnet",
      nativeCurrency: {
        name: "USDC",
        symbol: "USDC",
        decimals: 18,
      },
      rpcUrls: ["https://rpc.testnet.arc.network"],
      blockExplorerUrls: ["https://testnet.arcscan.app"],
    };

    try {
      const currentChain = await walletProvider.request({
        method: "eth_chainId",
      });

      if (currentChain !== ARC_CHAIN_ID) {
        try {
          await walletProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: ARC_CHAIN_ID }],
          });
        } catch (switchError: unknown) {
          const error = switchError as { code?: number };

          if (error.code === 4902) {
            await walletProvider.request({
              method: "wallet_addEthereumChain",
              params: [ARC_TESTNET],
            });

            await walletProvider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: ARC_CHAIN_ID }],
            });
          } else {
            alert("Please switch to Arc Testnet.");
            return;
          }
        }
      }

      const accounts = await walletProvider.request({
        method: "eth_requestAccounts",
      });

      const address = Array.isArray(accounts)
        ? String(accounts[0])
        : "";

      if (address) {
        setWalletAddress(address);
      }
    } catch (err) {
      console.error(err);
      alert("Wallet connection failed.");
    }
  }

  async function getContract(withSigner = false) {
    if (!window.ethereum) {
      throw new Error("Wallet not found");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    if (withSigner) {
      const signer = await provider.getSigner();

      return new ethers.Contract(
        CONTRACT_ADDRESS,
        ARCSUB_ABI,
        signer
      );
    }

    return new ethers.Contract(
      CONTRACT_ADDRESS,
      ARCSUB_ABI,
      provider
    );
  }

  async function loadPlans() {
    try {
      const contract = await getContract(false);
      const totalPlans = await contract.planCount();

      setPlanCount(totalPlans.toString());

      const loadedPlans: Plan[] = [];

      for (let i = 1; i <= Number(totalPlans); i++) {
        const plan = await contract.plans(i);

        loadedPlans.push({
          id: plan.id.toString(),
          merchant: plan.merchant,
          name: plan.name,
          description: plan.description,
          price: ethers.formatUnits(plan.price, 6),
          token: plan.token,
          interval: plan.interval.toString(),
          active: plan.active,
          subscribers: plan.totalSubscribers.toString(),
          revenue: ethers.formatUnits(plan.totalRevenue, 6),
        });
      }

      setPlans(loadedPlans);
    } catch (err) {
      console.error(err);
      alert("Failed to load plans");
    }
  }

  async function createPlan() {
    if (!planName || !planDescription || !planPrice) {
      alert("Please fill in plan name, description, and price.");
      return;
    }

    try {
      const contract = await getContract(true);

      const tx = await contract.createPlan(
        planName,
        planDescription,
        ethers.parseUnits(planPrice, 6),
        USDC_ADDRESS,
        Number(planInterval),
        0,
        3
      );

      alert("Create plan transaction submitted");

      await tx.wait();

      alert("Plan created successfully");

      setPlanName("");
      setPlanDescription("");
      setPlanPrice("");
      setPlanInterval("1");

      loadPlans();
    } catch (err) {
      console.error(err);
      alert("Create plan failed");
    }
  }

  async function approveUSDC() {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const usdc = new ethers.Contract(
        USDC_ADDRESS,
        ERC20_ABI,
        signer
      );

      const tx = await usdc.approve(
        CONTRACT_ADDRESS,
        ethers.MaxUint256
      );

      alert("Approve transaction submitted");

      await tx.wait();

      alert("USDC approved successfully");
    } catch (err) {
      console.error(err);
      alert("Approve USDC failed");
    }
  }

  async function subscribe(planId: string) {
    try {
      const contract = await getContract(true);

      const tx = await contract.subscribe(planId);

      alert("Subscribe transaction submitted");

      await tx.wait();

      alert("Subscribed successfully");

      loadPlans();
    } catch (err) {
      console.error(err);
      alert("Subscribe failed");
    }
  }

  async function pay(planId: string) {
    try {
      const contract = await getContract(true);

      const tx = await contract.pay(planId, "");

      alert("Payment transaction submitted");

      await tx.wait();

      alert("Payment successful");

      loadPlans();
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">
            ArcSub V3
          </h1>

          <button
            onClick={connectWallet}
            className="rounded-xl bg-white px-4 py-2 text-black transition hover:opacity-80"
          >
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Enterprise Stablecoin Subscriptions
          </p>

          <h2 className="text-6xl font-bold leading-tight">
            Recurring USDC Payments
            for the Arc Ecosystem
          </h2>

          <p className="mt-6 text-xl text-zinc-400">
            ArcSub V3 enables modern subscription
            infrastructure powered by USDC,
            account abstraction,
            embedded wallets,
            and automated recurring payments.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
  <button
    onClick={loadPlans}
    className="rounded-2xl bg-white px-6 py-3 font-medium text-black transition hover:opacity-80"
  >
    Load Plans
  </button>

  <TurnkeyButton />

  <button
    onClick={approveUSDC}
    className="rounded-2xl border border-green-400/30 px-6 py-3 text-green-400 transition hover:bg-green-400/10"
  >
    Approve USDC
  </button>

  <div className="flex items-center rounded-2xl border border-white/20 px-6 py-3">
    Total Plans: {planCount}
  </div>
</div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-zinc-400">
              Total Revenue
            </p>

            <h3 className="mt-3 text-3xl font-bold">
              {totalRevenue.toFixed(2)} USDC
            </h3>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-zinc-400">
              Total Subscribers
            </p>

            <h3 className="mt-3 text-3xl font-bold">
              {totalSubscribers}
            </h3>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-zinc-400">
              Active Plans
            </p>

            <h3 className="mt-3 text-3xl font-bold">
              {activePlans}
            </h3>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-zinc-400">
              Avg Plan Price
            </p>

            <h3 className="mt-3 text-3xl font-bold">
              {averagePlanPrice.toFixed(2)} USDC
            </h3>
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-2xl font-semibold">
            Create Subscription Plan
          </h3>

          <p className="mt-2 text-zinc-400">
            Create a real on-chain subscription plan for your business.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Plan name"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              placeholder="Description"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={planPrice}
              onChange={(e) => setPlanPrice(e.target.value)}
              placeholder="Price in USDC"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <select
              value={planInterval}
              onChange={(e) => setPlanInterval(e.target.value)}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            >
              <option value="0">Weekly</option>
              <option value="1">Monthly</option>
              <option value="2">Yearly</option>
            </select>
          </div>

          <button
            onClick={createPlan}
            className="mt-6 rounded-2xl bg-white px-6 py-3 font-medium text-black transition hover:opacity-80"
          >
            Create Plan
          </button>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-zinc-400">
                  Plan #{plan.id}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    plan.active
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {plan.active ? "Active" : "Inactive"}
                </span>
              </div>

              <h3 className="text-xl font-semibold">
                {plan.name}
              </h3>

              <p className="mt-2 text-zinc-400">
                {plan.description}
              </p>

              <div className="mt-6 space-y-2 text-sm text-zinc-300">
                <p>
                  Price:{" "}
                  <span className="text-white">
                    {plan.price} USDC /{" "}
                    {intervalLabels[plan.interval] ?? "Cycle"}
                  </span>
                </p>

                <p>
                  Subscribers:{" "}
                  <span className="text-white">
                    {plan.subscribers}
                  </span>
                </p>

                <p>
                  Revenue:{" "}
                  <span className="text-white">
                    {plan.revenue} USDC
                  </span>
                </p>

                <p className="truncate">
                  Merchant:{" "}
                  <span className="text-white">
                    {plan.merchant}
                  </span>
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => subscribe(plan.id)}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-80"
                >
                  Subscribe
                </button>

                <button
                  onClick={() => pay(plan.id)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10"
                >
                  Pay
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}