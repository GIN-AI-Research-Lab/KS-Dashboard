import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 dev blocks cross-origin requests (Server Actions, dev endpoints)
  // from hosts other than the one it started on. The dashboard is reached over
  // a <ip>.nip.io host so other machines on the LAN can view it and log in, so
  // allow nip.io hosts. Dev-only; ignored by `next start`.
  // Must list the EXACT host — a wildcard like "*.nip.io" does NOT match a
  // multi-label subdomain such as "192.168.50.55.nip.io".
  // Add a new entry here whenever the LAN IP changes (e.g. after switching WiFi).
  //
  // Cloudflare tunnel: a quick tunnel is served over https://<name>.trycloudflare.com
  // (a SINGLE-label subdomain, so the "*.trycloudflare.com" wildcard DOES match it,
  // and survives the ephemeral URL changing on every `cloudflared` restart). This
  // gives the dashboard a real TLS origin, which is what unlocks the browser
  // secure-context APIs (File System Access, modern Clipboard) for one-click OTel setup.
  // ngrok static domain (single-label subdomain under ngrok-free.dev, so the
  // "*.ngrok-free.dev" wildcard matches it and survives if the ngrok name changes).
  // The exact host is listed too as a belt-and-suspenders. Dev-only.
  allowedDevOrigins: [
    "192.168.50.55.nip.io",
    "192.168.1.92.nip.io",
    "*.nip.io",
    "*.trycloudflare.com",
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "patriot-tinwork-scabby.ngrok-free.dev",
  ],

  experimental: {
    // Turbopack's FileSystem Cache is ON by default since Next 16.1
    // (turbopackFileSystemCache doc). On this machine it repeatedly fails to
    // write its .sst files under .next ("Unable to write SST file ... The system
    // cannot find the path specified") and then floods with compaction-lock
    // errors until the dev server dies -- likely the E: drive / sync / AV
    // locking cache files. Disable it: cold compiles are a bit slower but the
    // dev server stops crashing. This is dev-only.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
