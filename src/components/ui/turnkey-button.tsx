"use client";

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
      const walletId = await createWallet({
        walletName: "ArcSub Embedded Wallet",
        accounts: ["ADDRESS_FORMAT_ETHEREUM"],
      });

      console.log("Turnkey wallet created:", walletId);

      await refreshWallets();
      alert("Turnkey wallet created successfully");
    } catch (error) {
      console.error("Create wallet failed:", error);
      alert("Create Turnkey wallet failed");
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
    wallet.accounts?.[0]?.address || "Wallet created";

  return (
    <button
      onClick={() => navigator.clipboard.writeText(address)}
      className="rounded-2xl bg-green-500 px-6 py-3 font-medium text-white transition hover:bg-green-400"
    >
      Turnkey:{" "}
      {address.startsWith("0x")
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : address}
    </button>
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