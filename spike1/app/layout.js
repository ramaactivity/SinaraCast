import "./globals.css";

export const metadata = {
  title: "SinaraCast",
  description: "Auto-publish recurring Instagram Stories across 4 independent brands.",
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
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
