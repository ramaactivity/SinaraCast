// Single source of truth for SinaraCast's legal/business identity, shared by the
// About, Privacy Policy, Terms, and Data Deletion pages. Fill the TODO values once
// Rama has the NIB / NPWP / domain — every legal page updates automatically.
//
// English is intentional: Meta and TikTok App Review require legal pages in English
// (or a certified translation), and the reviewers are international.
export const LEGAL = {
  brand: "SinaraCast",
  tagline: "Auto-publish & schedule for Instagram and TikTok",

  // TODO(rama): fill these from your OSS / NPWP registration and domain.
  legalOwner: "[Nama lengkap pemilik usaha — sesuai NIB]",
  businessType: "Sole Proprietorship (Usaha Perorangan)",
  nib: "[NIB dari OSS]",
  npwp: "[NPWP]",
  address: "[Alamat usaha sesuai registrasi]",
  city: "Indonesia",

  domain: "[domainanda].com",
  supportEmail: "support@[domainanda].com",

  governingLaw: "the Republic of Indonesia",
  updated: "2026-06-20",
};

// Shared look so the four legal pages feel like one document.
export const sx = {
  main: { maxWidth: 760, margin: "0 auto", padding: "56px 22px 96px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#3e4351", lineHeight: 1.7 },
  back: { display: "inline-flex", alignItems: "center", gap: 8, color: "#8c909e", textDecoration: "none", fontSize: 14, fontWeight: 600, marginBottom: 28 },
  h1: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", color: "#2b2f3a" },
  sub: { color: "#8c909e", fontSize: 14, margin: "0 0 36px" },
  h2: { fontSize: 20, fontWeight: 700, margin: "38px 0 10px", color: "#2b2f3a" },
  h3: { fontSize: 15.5, fontWeight: 700, margin: "20px 0 6px", color: "#3e4351" },
  card: { border: "1px solid #e7e8ee", borderRadius: 16, padding: "22px 24px", margin: "10px 0 8px", background: "#fbfbfd" },
  row: { display: "flex", flexWrap: "wrap", gap: "18px 48px", margin: "2px 0" },
  label: { fontSize: 12.5, color: "#8c909e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  value: { fontSize: 15, color: "#2b2f3a", fontWeight: 600, marginTop: 3 },
  a: { color: "#c97a16", fontWeight: 600 },
  todo: { background: "#fff7e6", border: "1px solid #f3d28a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#946100", margin: "16px 0" },
};
