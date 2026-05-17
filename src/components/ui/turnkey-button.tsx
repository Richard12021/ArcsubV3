"use client";

export function TurnkeyButton() {
  async function handleTurnkeyLogin() {
    alert("Turnkey auth is prepared. Provider setup is the next step.");
  }

  return (
    <button
      onClick={handleTurnkeyLogin}
      className="rounded-2xl bg-blue-500 px-6 py-3 font-medium text-white transition hover:bg-blue-400"
    >
      Continue with Turnkey
    </button>
  );
}