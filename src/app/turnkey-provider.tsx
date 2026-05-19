"use client";

import {
  TurnkeyProvider,
  type TurnkeyProviderConfig,
} from "@turnkey/react-wallet-kit";

const turnkeyConfig: TurnkeyProviderConfig = {
  organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID || "",
  authProxyConfigId:
    process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID || "",
};

export function TurnkeyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!turnkeyConfig.organizationId || !turnkeyConfig.authProxyConfigId) {
    return <>{children}</>;
  }

  return (
    <TurnkeyProvider
      config={turnkeyConfig}
      callbacks={{
        onError: (error) => {
          console.error("Turnkey error:", error);
        },
        onAuthenticationSuccess: ({ session }) => {
          console.log("Turnkey authenticated:", session);
        },
      }}
    >
      {children}
    </TurnkeyProvider>
  );
}