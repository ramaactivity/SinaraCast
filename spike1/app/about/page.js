import { LEGAL, sx } from "../../lib/legalInfo";

export const metadata = { title: "About — SinaraCast" };

// Public "About" page — establishes who operates SinaraCast. Meta App Review +
// Business Verification look for a clear, consistent legal identity that matches
// the documents (NIB / NPWP) you upload.
export default function AboutPage() {
  return (
    <main style={sx.main}>
      <a href="/" style={sx.back}>← Back to app</a>
      <h1 style={sx.h1}>About {LEGAL.brand}</h1>
      <p style={sx.sub}>{LEGAL.tagline}</p>

      <h2 style={sx.h2}>What SinaraCast does</h2>
      <p>
        {LEGAL.brand} helps small businesses and creators in Indonesia plan, schedule,
        and automatically publish content to their own social media accounts —
        Instagram (Stories, Feed, and Reels) and TikTok. Instead of posting manually
        every day, a user connects their professional account once, uploads or
        schedules content, and {LEGAL.brand} publishes it at the chosen time and
        reports back how each post performed.
      </p>

      <h2 style={sx.h2}>Our story</h2>
      <p>
        {LEGAL.brand} started from a real problem inside a small catering and
        photobooth business: keeping social media consistent took time every single
        day. We built a tool that turns a one-time setup into reliable, hands-off
        publishing, so business owners can focus on their work instead of remembering
        to post. What began as an internal tool is now offered to other Indonesian
        businesses and creators who face the same challenge.
      </p>

      <h2 style={sx.h2}>Legal information</h2>
      <div style={sx.card}>
        <div style={sx.row}>
          <div>
            <div style={sx.label}>Legal business owner</div>
            <div style={sx.value}>{LEGAL.legalOwner}</div>
          </div>
          <div>
            <div style={sx.label}>Operating as (brand)</div>
            <div style={sx.value}>{LEGAL.brand}</div>
          </div>
        </div>
        <div style={{ ...sx.row, marginTop: 18 }}>
          <div>
            <div style={sx.label}>Business type</div>
            <div style={sx.value}>{LEGAL.businessType}</div>
          </div>
          <div>
            <div style={sx.label}>NIB (Business ID)</div>
            <div style={sx.value}>{LEGAL.nib}</div>
          </div>
          <div>
            <div style={sx.label}>NPWP (Tax ID)</div>
            <div style={sx.value}>{LEGAL.npwp}</div>
          </div>
        </div>
        <p style={{ marginTop: 18, marginBottom: 0, fontSize: 13.5, color: "#8c909e" }}>
          {LEGAL.brand} is a sole proprietorship registered in Indonesia under a Nomor
          Induk Berusaha (NIB) and operates in compliance with Indonesian business
          regulations.
        </p>
      </div>
      <div style={sx.todo}>
        Placeholder values above (NIB, NPWP, owner name, address) are filled in
        <code> spike1/lib/legalInfo.js</code> once registration is complete — every
        legal page updates from that one file.
      </div>

      <h2 style={sx.h2}>Contact</h2>
      <p>
        Questions, support, or data requests: <a href={`mailto:${LEGAL.supportEmail}`} style={sx.a}>{LEGAL.supportEmail}</a>
      </p>
      <p style={{ fontSize: 13.5, color: "#8c909e" }}>
        See also our <a href="/privacy" style={sx.a}>Privacy Policy</a>,{" "}
        <a href="/terms" style={sx.a}>Terms of Service</a>, and{" "}
        <a href="/data-deletion" style={sx.a}>Data Deletion</a> page.
      </p>
    </main>
  );
}
