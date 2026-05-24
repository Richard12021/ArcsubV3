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
    walletAccountId: account?.walletAccountId || "",
    organizationId: account?.organizationId || "",

    httpClient: turnkey.httpClient,

    isReady: Boolean(account?.address),
  };
}