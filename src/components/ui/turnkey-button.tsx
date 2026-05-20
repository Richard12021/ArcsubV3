"use client";

import { Copy } from "lucide-react";
import { useTurnkey } from "@turnkey/react-wallet-kit";

export function TurnkeyButton() {
  const {
    handleLogin,
    user,
    wallets,
    createWallet,
    refreshWallets,
  } = useTurnkey();

  async function handleCreateWallet() {
    try {
      await createWallet({
        walletName: "ArcSub Embedded Wallet",
        accounts: ["ADDRESS_FORMAT_ETHEREUM"],
      });

      await refreshWallets();

      alert("Turnkey wallet created successfully");
    } catch (error) {
      console.error(error);

      alert("Create wallet failed");
    }
  }

  if (!user) {
    return (
      <button
        onClick={() => handleLogin()}
        className="rounded-2xl bg-blue-500 px-6 py-3 font-medium text-white transition hover:bg-blue-400"
      >
        Continue with Turnkey
      </button>
    );
  }

  if (wallets && wallets.length > 0) {
    const wallet = wallets[0];

    const address =
      wallet.accounts?.[0]?.address || "";

    return (
      <div className="flex items-center gap-2 rounded-2xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-green-400">
        <span className="font-medium">
          Turnkey:{" "}
          {address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Wallet Ready"}
        </span>

        {address && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(address);

              alert("Turnkey address copied");
            }}
            className="rounded-lg border border-green-400/30 p-2 transition hover:bg-green-400/10"
          >
            <Copy size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleCreateWallet}
      className="rounded-2xl bg-purple-500 px-6 py-3 font-medium text-white transition hover:bg-purple-400"
    >
      Create Turnkey Wallet
    </button>
  );
}