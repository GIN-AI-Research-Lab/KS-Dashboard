import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 dev blocks cross-origin requests (Server Actions, dev endpoints)
  // from hosts other than the one it started on. The dashboard is reached over
  // a <ip>.nip.io host so other machines on the LAN can view it and log in, so
  // allow nip.io hosts. Dev-only; ignored by `next start`.
  // Must list the EXACT host — a wildcard like "*.nip.io" does NOT match a
  // multi-label subdomain such as "192.168.1.93.nip.io".
  allowedDevOrigins: ["192.168.1.93.nip.io", "*.nip.io"],
};

export default nextConfig;
