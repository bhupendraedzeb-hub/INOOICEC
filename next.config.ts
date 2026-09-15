import type { NextConfig } from "next";

// Phase 16 security pass: standard secure headers on every response. This is
// an internal, single-tenant admin tool with no legitimate reason to be
// framed by another site, so X-Frame-Options/frame-ancestors are strict.
// The CSP is intentionally permissive on script/style ('unsafe-inline'/
// 'unsafe-eval') — Next's own dev HMR and the internal PDF render route's
// inline <style> tag (src/app/internal/render/[invoiceId]/page.tsx) need
// it — but still meaningfully restricts loading remote scripts/objects from
// an attacker-controlled origin and disallows framing entirely.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: http:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
