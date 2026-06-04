import "./globals.css";

export const metadata = {
  title: "SinaraCast — Content OS",
  description: "Auto-publish recurring Instagram Stories across 4 independent brands.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
