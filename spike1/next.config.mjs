// Header keamanan untuk semua halaman dan API.
// - frame-ancestors/X-Frame-Options: aplikasi tidak bisa dimuat di dalam frame situs lain
//   (mencegah clickjacking dan halaman phishing yang membungkus SinaraCast).
// - HSTS: browser selalu memakai HTTPS.
// - nosniff, Referrer-Policy, Permissions-Policy: kebocoran data minimal.
// ponytail: belum ada CSP penuh untuk script (Next butuh inline script); tambah dengan nonce kalau perlu.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

export default {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
