import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  // Development only: lets a phone on the same network open `next dev` by the computer's address.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
};
export default config;
