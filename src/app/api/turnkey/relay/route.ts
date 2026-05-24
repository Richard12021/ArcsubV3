import { ethers } from "ethers";
import { NextResponse } from "next/server";

const CONTRACT_ADDRESS =
  "0x65F8ca69218f95A6cc16F6c079e58892058e1214";

const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000";

const ARCSUB_ABI = [
  "function createPlan(string name,string description,uint256 price,address token,uint8 interval,uint256 trialDays,uint256 gracePeriodDays) external",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const action = body.action;

    console.log("Relay action:", action);
    console.log("walletAccountId:", body.walletAccountId);
    console.log("from:", body.from);

    switch (action) {
      case "createPlan": {
        const iface = new ethers.Interface(ARCSUB_ABI);

        const data = iface.encodeFunctionData("createPlan", [
          body.name,
          body.description,
          ethers.parseUnits(body.price, 6),
          USDC_ADDRESS,
          Number(body.interval),
          0,
          3,
        ]);

        return NextResponse.json({
          success: true,
          message: "Create plan transaction encoded",
          transaction: {
            caip2: "eip155:5042002",
            from: body.from,
            to: CONTRACT_ADDRESS,
            data,
            value: "0x0",
            walletAccountId: body.walletAccountId,
          },
        });
      }

      case "subscribe": {
        return NextResponse.json({
          success: true,
          message: "Subscribe relay ready",
        });
      }

      case "pay": {
        return NextResponse.json({
          success: true,
          message: "Pay relay ready",
        });
      }

      case "cancel": {
        return NextResponse.json({
          success: true,
          message: "Cancel relay ready",
        });
      }

      default: {
        return NextResponse.json({
          success: true,
          message: "Unknown relay action",
          action,
        });
      }
    }
  } catch (err: unknown) {
    console.error("Relay route error:", err);

    const error = err as {
      message?: string;
      shortMessage?: string;
    };

    return NextResponse.json(
      {
        success: false,
        error: error.shortMessage || error.message || "Relay failed",
      },
      { status: 500 }
    );
  }
}