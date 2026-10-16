export function GET() {
  const manifest = {
    name: "Advance",
    short_name: "Advance",
    description: "Your half of the advance, done.",
    start_url: "/",
    display: "standalone",
    background_color: "#15171a",
    theme_color: "#15171a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
  return new Response(JSON.stringify(manifest), { headers: { "content-type": "application/manifest+json" } });
}
