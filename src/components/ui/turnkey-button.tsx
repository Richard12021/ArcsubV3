"use client";

import { useTurnkey } from "@turnkey/react-wallet-kit";

export function TurnkeyButton() {
  const { handleLogin } = useTurnkey();

  return (
    <button
      onClick={() => handleLogin()}
      className="rounded-2xl bg-blue-500 px-6 py-3 font-medium text-white transition hover:bg-blue-400"
    >
      Continue with Turnkey
    </button>
  );
}