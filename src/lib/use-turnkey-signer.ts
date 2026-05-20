"use client";

import { useTurnkey } from "@turnkey/react-wallet-kit";

export function useTurnkeySigner() {
  const turnkey = useTurnkey();

  const wallet = turnkey.wallets?.[0];
  const account = wallet?.accounts?.[0];

  return {
    turnkey,
    wallet,
    account,
    address: account?.address || "",
    isReady: Boolean(account?.address),

    handleSendTransaction: turnkey.handleSendTransaction,
    signAndSendTransaction: turnkey.signAndSendTransaction,
    ethSendTransaction: turnkey.ethSendTransaction,
  };
}