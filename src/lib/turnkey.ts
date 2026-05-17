export const TURNKEY_CONFIG = {
  organizationId:
    process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID || "",

  authProxyUrl:
    process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_URL || "",

  rpId:
    process.env.NEXT_PUBLIC_TURNKEY_RP_ID || "localhost",

  appName: "ArcSub V3",
};