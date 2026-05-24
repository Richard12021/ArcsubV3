"use client";

import { createWalletClient, defineChain, http } from "viem";
import { createAccount } from "@turnkey/viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
});

export async function createTurnkeyArcWalletClient({
  httpClient,
  organizationId,
  signWith,
}: {
  httpClient: any;
  organizationId: string;
  signWith: string;
}) {
  const account = await createAccount({
    client: httpClient,
    organizationId,
    signWith,
  } as any);

  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http("https://rpc.testnet.arc.network"),
  });
}