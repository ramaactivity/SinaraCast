export default function manifest() {
  return {
    name: "SinaraCast",
    short_name: "SinaraCast",
    description: "Auto-publish recurring Instagram Stories across your brands.",
    start_url: "/",
    display: "standalone",
    background_color: "#EDEBF6",
    theme_color: "#F9A826",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
