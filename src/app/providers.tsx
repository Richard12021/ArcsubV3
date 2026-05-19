"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  TurnkeyProvider,
  type TurnkeyProviderConfig,
} from "@turnkey/react-wallet-kit";

import { config } from "@/lib/wallet";

const queryClient = new QueryClient();

const turnkeyConfig: TurnkeyProviderConfig = {
  organizationId:"b9109ac6-2c02-40e8-a4e6-c93f180c5e25",
  authProxyConfigId: "d25e4738-ca76-4f7f-a104-00575380a439"
};

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TurnkeyProvider config={turnkeyConfig}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </TurnkeyProvider>
  );
}
