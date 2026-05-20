"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { TurnkeyButton } from "@/components/ui/turnkey-button";
import { useTurnkeySigner } from "@/lib/use-turnkey-signer";

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

function getWalletProvider(): WalletProvider | undefined {
  return window.okxwallet || window.ethereum;
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

  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planInterval, setPlanInterval] = useState("1");

  const merchantPlans = walletAddress
    ? plans.filter(
        (plan) =>
          plan.merchant.toLowerCase() === walletAddress.toLowerCase()
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

  function openFaucet() {
    window.open(FAUCET_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <h1 className="text-2xl font-bold">
            ArcSub V4
          </h1>

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

                  <span className="text-xs text-zinc-400">
                    ▼
                  </span>
                </button>

                {walletMenuOpen && (
                  <div className="absolute right-0 top-14 z-50 w-72 rounded-2xl border border-white/10 bg-black p-4 shadow-2xl">
                    <p className="text-sm text-zinc-400">
                      Extension Wallet
                    </p>

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

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Merchant Subscription Dashboard
          </p>

          <h2 className="text-6xl font-bold leading-tight">
            Manage Stablecoin Subscriptions
            on Arc
          </h2>

          <p className="mt-6 text-xl text-zinc-400">
            Create plans, track subscribers, monitor merchant revenue,
            and manage recurring USDC payments from one dashboard.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button
              onClick={() => loadPlans(walletAddress)}
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

            {turnkeySigner.isReady && (
              <div className="flex items-center rounded-2xl border border-green-400/20 px-6 py-3 text-green-400">
                Turnkey Ready: {turnkeySigner.address.slice(0, 6)}...
                {turnkeySigner.address.slice(-4)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-16">
          <h3 className="mb-6 text-2xl font-semibold">
            Merchant Dashboard
          </h3>

          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-zinc-400">
                Merchant Revenue
              </p>
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
              <p className="text-sm text-zinc-400">
                Avg Plan Price
              </p>
              <h3 className="mt-3 text-3xl font-bold">
                {merchantAveragePlanPrice.toFixed(2)} USDC
              </h3>
            </div>
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

        <div className="mt-20">
          <h3 className="mb-6 text-2xl font-semibold">
            Marketplace Plans
          </h3>

          <div className="grid gap-6 md:grid-cols-3">
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
      </section>
    </main>
  );
}