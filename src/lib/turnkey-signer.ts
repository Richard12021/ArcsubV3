import { ethers } from "ethers";

export function createArcProvider() {
  return new ethers.JsonRpcProvider(
    "https://rpc.testnet.arc.network"
  );
}