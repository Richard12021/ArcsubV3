import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const arcTestnet = {
  id: 504002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "ARC",
    symbol: "ARC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-testnet.arc.network"],
    },
  },
};

export const config = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [arcTestnet.id]: http(),
  },
});