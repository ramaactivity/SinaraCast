import "./globals.css";
import { Poppins } from "next/font/google";

// The design system declares Poppins as --font's first choice but it was never
// loaded (so the app fell back to system-ui). Load it properly, self-hosted, no
// layout shift — sharpens the whole app's typography as originally intended.
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });

export const metadata = {
  title: "SinaraCast — Media sosial yang jalan sendiri",
  description: "Jadwalkan dan terbitkan konten ke Instagram & TikTok bisnismu secara otomatis. Untuk UMKM & agensi Indonesia.",
  applicationName: "SinaraCast",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SinaraCast" },
};

export const viewport = {
  themeColor: "#F9A826",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
