"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { TurnkeyButton } from "@/components/ui/turnkey-button";
import { useTurnkeySigner } from "@/lib/use-turnkey-signer";
import { createTurnkeyArcWalletClient } from "@/lib/turnkey-arc-client";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

const CONTRACT_ADDRESS =
  "0x65F8ca69218f95A6cc16F6c079e58892058e1214";

const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000";

const EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

const FAUCET_URL = "https://faucet.circle.com/";

const ERC20_ABI = [
  "function approve(address spender,uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];

const ARCSUB_ABI = [
  "function planCount() external view returns (uint256)",
  "function createPlan(string name,string description,uint256 price,address token,uint8 interval,uint256 trialDays,uint256 gracePeriodDays) external",
  "function plans(uint256) external view returns (uint256 id,address merchant,string name,string description,uint256 price,address token,uint8 interval,uint256 trialDays,uint256 gracePeriodDays,bool active,uint256 createdAt,uint256 totalSubscribers,uint256 totalRevenue)",
  "function subscribe(uint256 planId) external",
  "function pay(uint256 planId,string couponCode) external",
  "function cancel(uint256 planId) external",
  "function isSubscribed(address user,uint256 planId) external view returns (bool)",
  "function getSubscription(address user,uint256 planId) external view returns (uint256 id,address subscriber,uint256 startedAt,uint256 lastPaidAt,uint256 nextPaymentAt,bool active,bool cancelled)",
];

type WalletProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

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

const sidebarItems = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "plans", label: "Plans", icon: "▤" },
  { id: "marketplace", label: "Marketplace", icon: "🛒" },
  { id: "subscribers", label: "Subscribers", icon: "👥" },
  { id: "revenue", label: "Revenue", icon: "📈" },
  { id: "coupons", label: "Coupons", icon: "🎟️" },
  { id: "referrals", label: "Referrals", icon: "🎯" },
  { id: "payouts", label: "Payouts", icon: "💰" },
  { id: "create", label: "Create Plan", icon: "+" },
];

const marketplaceCategories = [
  "All",
  "AI",
  "SaaS",
  "Research",
  "Creator",
  "Gaming",
  "Developer Tools",
];

function getWalletProvider(): WalletProvider | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const browserWindow = window as unknown as {
    ethereum?: WalletProvider;
    okxwallet?: WalletProvider;
  };

  return browserWindow.okxwallet || browserWindow.ethereum;
}

export default function HomePage() {
  const turnkeySigner = useTurnkeySigner();

  const [walletAddress, setWalletAddress] = useState("");
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [eurcBalance, setEurcBalance] = useState("0.00");

  const [planCount, setPlanCount] = useState("0");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscribedPlans, setSubscribedPlans] = useState<string[]>([]);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
const [referralCount, setReferralCount] = useState(0);
  
const [referralCode, setReferralCode] = useState("");const [referralRevenue, setReferralRevenue] = useState(0);
const [activeTab, setActiveTab] = useState("overview");

  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planInterval, setPlanInterval] = useState("1");
const [mounted, setMounted] = useState(false);

  const activeAddress = walletAddress;
  const merchantPlans = activeAddress
    ? plans.filter(
      (plan) =>
        plan.merchant.toLowerCase() === activeAddress.toLowerCase()
    )
    : [];

  const merchantRevenue = merchantPlans.reduce(
    (sum, plan) => sum + Number(plan.revenue),
    0
  );

  const merchantSubscribers = merchantPlans.reduce(
    (sum, plan) => sum + Number(plan.subscribers),
    0
  );

  const merchantActivePlans = merchantPlans.filter(
    (plan) => plan.active
  ).length;

  const merchantAveragePlanPrice =
    merchantPlans.length > 0
      ? merchantPlans.reduce(
        (sum, plan) => sum + Number(plan.price),
        0
      ) / merchantPlans.length
      : 0;

  useEffect(() => {
    const savedWallet = localStorage.getItem("arcsub_wallet_address");

    if (savedWallet) {
      setWalletAddress(savedWallet);
      loadBalances(savedWallet);
      loadPlans(savedWallet);
    }
  }, []);

  useEffect(() => {
  const savedCount = localStorage.getItem("arcsub_referral_count");
  const savedRevenue = localStorage.getItem("arcsub_referral_revenue");

  if (savedCount) setReferralCount(Number(savedCount));
  if (savedRevenue) setReferralRevenue(Number(savedRevenue));
}, []);

  useEffect(() => {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  const ref = params.get("ref");

  if (!ref) return;

  const alreadyTracked = localStorage.getItem(
    `arcsub_ref_${ref}`
  );

  if (!alreadyTracked && walletAddress) {
    localStorage.setItem(`arcsub_ref_${ref}`, "true");

    setReferralCount((prev) => {
  const next = prev + 1;
  localStorage.setItem("arcsub_referral_count", String(next));
  return next;
});

setReferralRevenue((prev) => {
  const next = prev + 5;
  localStorage.setItem("arcsub_referral_revenue", String(next));
  return next;
});

  }
}, [walletAddress]);

useEffect(() => {
  const refAddress = walletAddress || turnkeySigner.address;
if (!refAddress) return;

  const savedCode = localStorage.getItem(
    `arcsub_ref_code_${refAddress}`
  );

  if (savedCode) {
    setReferralCode(savedCode);
    return;
  }

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  localStorage.setItem(`arcsub_ref_code_${refAddress}`, code);

  setReferralCode(code);
}, [walletAddress, turnkeySigner.address]);

useEffect(() => {
  setMounted(true);
}, []);

  async function ensureArcNetwork(walletProvider: WalletProvider) {
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
          throw new Error("Please switch to Arc Testnet.");
        }
      }
    }
  }

  async function connectWallet() {
    const walletProvider = getWalletProvider();

    if (!walletProvider) {
      alert("Please install OKX Wallet or MetaMask");
      return;
    }

    try {
      await ensureArcNetwork(walletProvider);

      const accounts = await walletProvider.request({
        method: "eth_requestAccounts",
      });

      const address = Array.isArray(accounts)
        ? String(accounts[0])
        : "";

      if (address) {
        setWalletAddress(address);
        localStorage.setItem("arcsub_wallet_address", address);
        await loadBalances(address);
        await loadPlans(address);
      }
    } catch (err) {
      console.error(err);
      alert("Wallet connection failed.");
    }
  }

  function disconnectWallet() {
    setWalletAddress("");
    setUsdcBalance("0.00");
    setEurcBalance("0.00");
    setWalletMenuOpen(false);
    setSubscribedPlans([]);
    localStorage.removeItem("arcsub_wallet_address");
  }

  async function copyWalletAddress() {
    if (!walletAddress) return;

    await navigator.clipboard.writeText(walletAddress);
    alert("Wallet address copied");
  }

  async function getContract(withSigner = false) {

    // FALLBACK: OKX / MetaMask
    const walletProvider = getWalletProvider();

    if (!walletProvider) {
      throw new Error("Wallet not found");
    }

    await ensureArcNetwork(walletProvider);

    const provider = new ethers.BrowserProvider(walletProvider);

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

  async function loadBalances(address = walletAddress) {
    const walletProvider = getWalletProvider();

    if (!walletProvider || !address) return;

    try {
      await ensureArcNetwork(walletProvider);

      const provider = new ethers.BrowserProvider(walletProvider);

      const usdc = new ethers.Contract(
        USDC_ADDRESS,
        ERC20_ABI,
        provider
      );

      const eurc = new ethers.Contract(
        EURC_ADDRESS,
        ERC20_ABI,
        provider
      );

      const [usdcRaw, eurcRaw] = await Promise.all([
        usdc.balanceOf(address),
        eurc.balanceOf(address),
      ]);

      setUsdcBalance(Number(ethers.formatUnits(usdcRaw, 6)).toFixed(2));
      setEurcBalance(Number(ethers.formatUnits(eurcRaw, 6)).toFixed(2));
    } catch (err) {
      console.error("Failed to load balances:", err);
    }
  }

  async function loadPlans(address = walletAddress) {
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

      const subscribed: string[] = [];

      if (address) {
        for (const plan of loadedPlans) {
          try {
            const subscribedStatus = await contract.isSubscribed(
              address,
              plan.id
            );

            if (subscribedStatus) {
              subscribed.push(plan.id);
            }
          } catch (err) {
            console.error("Failed to check subscription:", err);
          }
        }
      }

      setSubscribedPlans(subscribed);
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

      await loadPlans(walletAddress);
      await loadBalances();
    } catch (err) {
      console.error(err);
      alert("Create plan failed");
    }
  }

  async function approveUSDC(amount: string) {
    try {
      const walletProvider = getWalletProvider();

      if (!walletProvider) {
        alert("Please connect OKX Wallet or MetaMask first");
        return;
      }

      await ensureArcNetwork(walletProvider);

      const provider = new ethers.BrowserProvider(walletProvider);
      const signer = await provider.getSigner();

      const usdc = new ethers.Contract(
        USDC_ADDRESS,
        ERC20_ABI,
        signer
      );

      const tx = await usdc.approve(
        CONTRACT_ADDRESS,
        ethers.parseUnits(amount, 6)
      );

      alert("Approve transaction submitted");

      await tx.wait();

      alert("USDC approved successfully");
    } catch (err) {
      console.error(err);
      alert("Approve USDC failed");
      throw err;
    }
  }

  async function subscribeAndPay(plan: Plan) {
    try {
      const contract = await getContract(true);

      await approveUSDC(plan.price);

      const subscribeTx = await contract.subscribe(plan.id);

      alert("Subscribe transaction submitted");

      await subscribeTx.wait();

      const payTx = await contract.pay(plan.id, "");

      alert("Payment transaction submitted");

      await payTx.wait();

      alert("Subscribed and paid successfully");

      await loadPlans(walletAddress);
      await loadBalances();
    } catch (err) {
      console.error(err);
      alert("Subscribe and Pay failed");
    }
  }

  async function pay(planId: string) {
    try {
      const contract = await getContract(true);

      const payTx = await contract.pay(planId, "");

      alert("Payment transaction submitted");

      await payTx.wait();

      alert("Payment successful");

      await loadPlans(walletAddress);
      await loadBalances();
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    }
  }

  async function cancelSubscription(planId: string) {
    try {
      const contract = await getContract(true);

      const tx = await contract.cancel(planId);

      alert("Cancel subscription transaction submitted");

      await tx.wait();

      alert("Subscription cancelled");

      await loadPlans(walletAddress);
      await loadBalances();
    } catch (err) {
      console.error(err);
      alert("Cancel subscription failed");
    }
  }

  async function testTurnkeyTransaction() {
    if (!turnkeySigner.isReady) {
      alert("Turnkey wallet is not ready");
      return;
    }

    try {
      alert("Turnkey wallet is ready for signing test");
    } catch (err: unknown) {
      console.error("Turnkey test failed:", err);
      alert("Turnkey test failed");
    }
  }
  async function testRelayRoute() {
    try {
      const response = await fetch("/api/turnkey/relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: turnkeySigner.address,
          action: "test",
        }),
      });

      const text = await response.text();

      console.log("Relay raw response:", text);

      alert(text);
    } catch (err: unknown) {
      console.error("Relay route failed:", err);

      const error = err as { message?: string };

      alert(error.message || "Relay route failed");
    }
  }
  async function testEncodeCreatePlan() {
    try {
      const response = await fetch("/api/turnkey/relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createPlan",
          walletAccountId: turnkeySigner.walletAccountId,
          from: turnkeySigner.address,
          name: "Turnkey Test Plan",
          description: "Created through relay encoder",
          price: "1",
          interval: "1",
        }),
      });

      const relayData = await response.json();

      console.log("Create plan encoded:", relayData);

      alert(relayData.message || "Relay response received");
    } catch (err) {
      console.error(err);
      alert("Create plan encode failed");
    }
  }
  async function testTurnkeyViemClient() {
    if (!turnkeySigner.isReady) {
      alert("Turnkey wallet is not ready");
      return;
    }

    if (!turnkeySigner.httpClient) {
      alert("Turnkey httpClient is not ready");
      return;
    }

    try {
      const walletClient = await createTurnkeyArcWalletClient({
        httpClient: turnkeySigner.httpClient,
        organizationId: turnkeySigner.organizationId,
        signWith: turnkeySigner.address,
      });

      console.log("Turnkey viem wallet client:", walletClient);

      alert("Turnkey viem client created successfully");
    } catch (err: unknown) {
      console.error("Create Turnkey viem client failed:", err);

      const error = err as { message?: string; shortMessage?: string };

      alert(
        error.shortMessage ||
        error.message ||
        "Create Turnkey viem client failed"
      );
    }
  }
  function openFaucet() {
    window.open(FAUCET_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <h1 className="text-2xl font-bold">ArcSub</h1>

          <div className="flex flex-wrap items-center gap-3">
            <TurnkeyButton />

            <button
              onClick={openFaucet}
              className="rounded-xl border border-blue-400/30 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-400/10"
            >
              Get testnet token
            </button>

            {walletAddress ? (
              <div className="relative">
                <button
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
                >
                  <span>
                    {walletAddress.slice(0, 6)}...
                    {walletAddress.slice(-4)}
                  </span>
                  <span className="text-xs text-zinc-400">▼</span>
                </button>

                {walletMenuOpen && (
                  <div className="absolute right-0 top-14 z-50 w-72 rounded-2xl border border-white/10 bg-black p-4 shadow-2xl">
                    <p className="text-sm text-zinc-400">Extension Wallet</p>

                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                      <p>USDC: {usdcBalance}</p>
                      <p className="mt-1">EURC: {eurcBalance}</p>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={copyWalletAddress}
                        className="rounded-xl border border-white/10 px-4 py-2 text-left transition hover:bg-white/10"
                      >
                        Copy Address
                      </button>

                      <button
                        onClick={() =>
                          window.open(
                            `https://testnet.arcscan.app/address/${walletAddress}`,
                            "_blank"
                          )
                        }
                        className="rounded-xl border border-white/10 px-4 py-2 text-left transition hover:bg-white/10"
                      >
                        View on Arcscan
                      </button>

                      <button
                        onClick={disconnectWallet}
                        className="rounded-xl border border-red-400/30 px-4 py-2 text-left text-red-400 transition hover:bg-red-400/10"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Connect OKX / MetaMask
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        <aside className="w-72 shrink-0 border-r border-white/10 bg-black/40">
          <div className="sticky top-0 p-6">
            <p className="mb-6 text-xs uppercase tracking-[0.3em] text-zinc-500">
              Merchant
            </p>

            <div className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                    activeTab === item.id
                      ? "bg-green-400/10 text-green-400"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex-1 px-6 py-20">
          {activeTab === "overview" && (
            <>
              <div className="max-w-3xl">
                <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
                  Merchant Subscription Dashboard
                </p>

                <h2 className="text-6xl font-bold leading-tight">
                  Manage Stablecoin Subscriptions on Arc
                </h2>

                <p className="mt-6 text-xl text-zinc-400">
                  Create plans, track subscribers, monitor merchant revenue,
                  and manage recurring USDC payments from one dashboard.
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                  <button
                    onClick={() => loadPlans(activeAddress)}
                    className="rounded-2xl bg-white px-6 py-3 font-medium text-black transition hover:opacity-80"
                  >
                    Load Plans
                  </button>

                  <div className="flex items-center rounded-2xl border border-white/20 px-6 py-3">
                    Total Plans: {planCount}
                  </div>

                  <div className="flex items-center rounded-2xl border border-green-400/20 px-6 py-3 text-green-400">
                    My Plans: {merchantPlans.length}
                  </div>
                </div>
              </div>

              <div className="mt-16 grid gap-6 lg:grid-cols-[2fr_1fr]">
                <RevenueChart plans={merchantPlans} />
                <ActivityFeed plans={merchantPlans} />
              </div>

              <div className="mt-16">
                <h3 className="mb-6 text-2xl font-semibold">
                  Merchant Dashboard
                </h3>

                <div className="grid gap-6 md:grid-cols-4">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <p className="text-sm text-zinc-400">Merchant Revenue</p>
                    <h3 className="mt-3 text-3xl font-bold">
                      {merchantRevenue.toFixed(2)} USDC
                    </h3>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <p className="text-sm text-zinc-400">
                      Merchant Subscribers
                    </p>
                    <h3 className="mt-3 text-3xl font-bold">
                      {merchantSubscribers}
                    </h3>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <p className="text-sm text-zinc-400">
                      Merchant Active Plans
                    </p>
                    <h3 className="mt-3 text-3xl font-bold">
                      {merchantActivePlans}
                    </h3>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <p className="text-sm text-zinc-400">Avg Plan Price</p>
                    <h3 className="mt-3 text-3xl font-bold">
                      {merchantAveragePlanPrice.toFixed(2)} USDC
                    </h3>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "marketplace" && (
            <div>
              <h2 className="mb-6 text-4xl font-bold">Marketplace</h2>

              <div className="mb-10 overflow-hidden rounded-[32px] border border-green-400/20 bg-gradient-to-br from-green-500/15 via-emerald-500/5 to-black p-8 shadow-2xl">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-green-400">
                      Featured Marketplace
                    </p>

                    <h3 className="mt-4 max-w-3xl text-4xl font-bold leading-tight">
                      Stablecoin-native recurring payments on Arc
                    </h3>

                    <p className="mt-4 max-w-2xl text-zinc-400">
                      Discover premium subscriptions for AI tools, research
                      communities, creator memberships, and on-chain services
                      powered by USDC.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                    <p className="text-sm text-zinc-400">Settlement</p>
                    <p className="mt-2 text-2xl font-bold text-green-400">
                      USDC Native
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8 flex flex-wrap gap-3">
                {marketplaceCategories.map((category, index) => (
                  <button
                    key={category}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      index === 0
                        ? "border-green-400/30 bg-green-400/10 text-green-400"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "plans" && (
            <div>
              <h2 className="text-4xl font-bold">Plans</h2>

              <p className="mt-3 text-zinc-400">
                Manage all subscription plans created on ArcSub.
              </p>

              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6"
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

                    <h3 className="text-xl font-semibold">{plan.name}</h3>

                    <p className="mt-2 text-zinc-400">{plan.description}</p>

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
                        <span className="text-white">{plan.subscribers}</span>
                      </p>

                      <p>
                        Revenue:{" "}
                        <span className="text-white">{plan.revenue} USDC</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "subscribers" && (
            <div>
              <h2 className="text-4xl font-bold">Subscriptions</h2>

              <p className="mt-3 text-zinc-400">
                Browse plans, subscribe, renew, or cancel your active
                subscriptions.
              </p>

              <div className="mt-10 grid gap-6 md:grid-cols-3">
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

                    <h3 className="text-xl font-semibold">{plan.name}</h3>

                    <p className="mt-2 text-zinc-400">{plan.description}</p>

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
                        <span className="text-white">{plan.subscribers}</span>
                      </p>

                      <p>
                        Revenue:{" "}
                        <span className="text-white">{plan.revenue} USDC</span>
                      </p>

                      <p className="truncate">
                        Merchant:{" "}
                        <span className="text-white">{plan.merchant}</span>
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {walletAddress.toLowerCase() ===
                      plan.merchant.toLowerCase() ? (
                        <span className="rounded-xl border border-yellow-400/30 px-4 py-2 text-sm text-yellow-400">
                          Your Plan
                        </span>
                      ) : !subscribedPlans.includes(plan.id) ? (
                        <button
                          onClick={() => subscribeAndPay(plan)}
                          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-80"
                        >
                          Subscribe + Pay
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => pay(plan.id)}
                            className="rounded-xl border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10"
                          >
                            Pay Renewal
                          </button>

                          <button
                            onClick={() => cancelSubscription(plan.id)}
                            className="rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-400/10"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "revenue" && (
            <div>
              <h2 className="text-4xl font-bold">Revenue</h2>

              <div className="mt-8">
                <RevenueChart plans={merchantPlans} />
              </div>
            </div>
          )}

          {activeTab === "coupons" && (
  <div>
    <h2 className="text-4xl font-bold">Coupons</h2>

    <p className="mt-3 text-zinc-400">
      Create discount codes for subscription campaigns and early users.
    </p>

    <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h3 className="text-2xl font-semibold">Create Coupon</h3>

        <div className="mt-6 space-y-4">
          <input
            placeholder="Coupon code e.g. ARC20"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            placeholder="Discount percent e.g. 20"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            placeholder="Max uses e.g. 100"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <button className="w-full rounded-2xl bg-white px-6 py-3 font-medium text-black transition hover:opacity-80">
            Create Coupon
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h3 className="text-2xl font-semibold">Active Coupons</h3>

        <div className="mt-6 space-y-4">
          {["ARC20", "EARLY50", "BUILDER10"].map((code) => (
            <div
              key={code}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4"
            >
              <div>
                <p className="font-semibold">{code}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Campaign discount code
                </p>
              </div>

              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}

          {activeTab === "referrals" && (
  <div>
    <h2 className="text-4xl font-bold">Referrals</h2>

    <p className="mt-3 text-zinc-400">
      Invite users and earn recurring commission from subscription payments.
    </p>

    <div className="mt-10 grid gap-6 md:grid-cols-3">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-zinc-400">
          Total Referrals
        </p>

        <h3 className="mt-3 text-3xl font-bold">
          {referralCount}
        </h3>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-zinc-400">
          Referral Revenue
        </p>

        <h3 className="mt-3 text-3xl font-bold">
          {referralRevenue.toFixed(2)} USDC
        </h3>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-zinc-400">
          Commission Rate
        </p>

        <h3 className="mt-3 text-3xl font-bold">
          10%
        </h3>
      </div>
    </div>

    <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
      <h3 className="text-2xl font-semibold">
        Referral Link
      </h3>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        <input
          value={
  mounted && (referralCode || walletAddress || turnkeySigner.address)
    ? `${window.location.origin}?ref=${
        referralCode || (walletAddress || turnkeySigner.address).slice(2, 8).toUpperCase()
      }`
    : ""
}
placeholder="Connect wallet to generate referral link"
          readOnly
          className="flex-1 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
        />

        <button
  onClick={() => {
  if (!referralCode) return;

  navigator.clipboard.writeText(
    `${window.location.origin}?ref=${referralCode}`
  );
}}
  className="rounded-2xl bg-white px-6 py-3 font-medium text-black transition hover:opacity-80"
>
  Copy Link
</button>
      </div>
    </div>

    <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
      <h3 className="text-2xl font-semibold">
        Referral Activity
      </h3>

      <div className="mt-6 space-y-4">
  {referralCount === 0 ? (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-zinc-500">
      No referral activity yet.
    </div>
  ) : (
    Array.from({ length: referralCount }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4"
      >
        <div>
          <p className="font-medium">
            New subscription referral
          </p>

          <p className="mt-1 text-sm text-zinc-400">
            User subscribed through your referral link
          </p>
        </div>

        <span className="text-green-400">
          +5 USDC
        </span>
      </div>
    ))
  )}
</div>
    </div>
  </div>
)}

          {activeTab === "payouts" && (
  <div>
    <h2 className="text-4xl font-bold">Payouts</h2>

    <p className="mt-3 text-zinc-400">
      Track merchant earnings, available balance, and payout history.
    </p>

    <div className="mt-10 grid gap-6 md:grid-cols-3">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-zinc-400">Available Balance</p>
        <h3 className="mt-3 text-3xl font-bold">
          {merchantRevenue.toFixed(2)} USDC
        </h3>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-zinc-400">Pending Payouts</p>
        <h3 className="mt-3 text-3xl font-bold">0.00 USDC</h3>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-zinc-400">Total Paid Out</p>
        <h3 className="mt-3 text-3xl font-bold">
          {merchantRevenue.toFixed(2)} USDC
        </h3>
      </div>
    </div>

    <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
      <h3 className="text-2xl font-semibold">Payout History</h3>

      <div className="mt-6 space-y-4">
        {merchantPlans.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-zinc-500">
            No payout history yet.
          </div>
        ) : (
          merchantPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4"
            >
              <div>
                <p className="font-medium">{plan.name}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Revenue settled to merchant wallet
                </p>
              </div>

              <span className="text-green-400">
                {Number(plan.revenue).toFixed(2)} USDC
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
)}

          {activeTab === "create" && (
            <div>
              <h2 className="text-4xl font-bold">Create Plan</h2>

              <p className="mt-3 text-zinc-400">
                Launch a new USDC subscription plan on Arc Testnet.
              </p>

              <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Plan name"
                    className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                  />

                  <input
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="Price in USDC"
                    className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                  />

                  <input
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    placeholder="Description"
                    className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none md:col-span-2"
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
            </div>
          )}
        </section>
      </div>
    </main>
  );
}