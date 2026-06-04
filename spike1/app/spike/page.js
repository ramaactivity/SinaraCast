export const dynamic = "force-dynamic";

export default function SpikePage() {
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>SinaraCast — Spike 1</h1>
      <p>
        Instagram API with Instagram Login (<code>graph.instagram.com</code>,
        no Facebook Page) — prove connect + Story publish end-to-end.
      </p>
      <ol style={{ lineHeight: 1.9 }}>
        <li>
          <a href="/connect/start">→ Start Instagram connect (OAuth)</a> — authorize
          the test account, land on the callback, copy the long-lived token + ig_user_id.
        </li>
        <li>
          Run the publish test locally: <code>npm run publish-test</code> (uses that
          token + the public image below).
        </li>
      </ol>
      <p>
        Public test image (Meta fetches this):{" "}
        <a href="/test-story.jpg">/test-story.jpg</a>
      </p>
      <p style={{ marginTop: 32, color: "#888" }}>
        ← <a href="/">Content OS app</a>
      </p>
    </main>
  );
}
