export const metadata = { title: "SinaraCast — Spike 1" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
