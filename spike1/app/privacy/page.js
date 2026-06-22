import { LEGAL, sx } from "../../lib/legalInfo";

export const metadata = { title: "Privacy Policy — SinaraCast" };

// Comprehensive privacy policy for Meta + TikTok App Review. Describes exactly which
// platform data SinaraCast accesses, why, where it is stored, and how a user removes
// it. Kept consistent with the actual app (Instagram Login + content publish +
// insights; TikTok video publish; Supabase/R2/Vercel infrastructure).
export default function PrivacyPage() {
  return (
    <main style={sx.main}>
      <a href="/" style={sx.back}>← Back to app</a>
      <h1 style={sx.h1}>Privacy Policy</h1>
      <p style={sx.sub}>{LEGAL.brand} · Last updated: {LEGAL.updated}</p>

      <p>
        This Privacy Policy explains how {LEGAL.brand} (&quot;we&quot;, &quot;us&quot;),
        operated by {LEGAL.legalOwner} ({LEGAL.businessType}, NIB {LEGAL.nib}), collects,
        uses, stores, and protects your information when you use {LEGAL.brand} at{" "}
        https://{LEGAL.domain} and the SinaraCast application. By using {LEGAL.brand},
        you agree to this policy.
      </p>

      <h2 style={sx.h2}>1. Summary</h2>
      <p>
        {LEGAL.brand} schedules and automatically publishes content to social media
        accounts that you own and explicitly connect (Instagram and TikTok). We only
        process the data needed to provide that service. We never sell your data and we
        never store your social media passwords.
      </p>

      <h2 style={sx.h2}>2. Information we collect</h2>

      <h3 style={sx.h3}>2.1 Account data</h3>
      <ul>
        <li>Your <b>email address</b>, used for passwordless sign-in (a one-time 6-digit code).</li>
        <li>Optional profile details you enter, and an optional Telegram handle if you enable post notifications.</li>
      </ul>

      <h3 style={sx.h3}>2.2 Data from connected platforms</h3>
      <p>When you connect an account through the platform&apos;s official authorization (OAuth), we receive and store:</p>
      <ul>
        <li>
          <b>Instagram</b> (via Instagram API with Instagram Login): your professional
          account&apos;s ID, username, and profile picture; an access token; and, where you
          grant it, post and account <b>insights/metrics</b>. Scopes requested:{" "}
          <code>instagram_business_basic</code>, <code>instagram_business_content_publish</code>,{" "}
          <code>instagram_business_manage_insights</code>.
        </li>
        <li>
          <b>TikTok</b>: your open ID, display name, and avatar; an access token; and
          creator info needed to publish a video.
        </li>
      </ul>
      <p>
        These tokens let {LEGAL.brand} publish content and read performance metrics on
        your behalf. We do not access private messages, and we do not use this data for
        anything other than the features you use.
      </p>

      <h3 style={sx.h3}>2.3 Content you provide</h3>
      <ul>
        <li>Images and videos you upload to be published, plus the captions, schedules, and posting rules you set.</li>
        <li>A history of publishing attempts and their results (success/failure, and the metrics returned by the platform).</li>
      </ul>

      <h3 style={sx.h3}>2.4 Technical data</h3>
      <p>Basic technical information (such as IP address and device/browser type) processed by our hosting providers to keep the service secure and reliable.</p>

      <h2 style={sx.h2}>3. How we use your information</h2>
      <ul>
        <li>To publish your content to the accounts you connect, at the times you schedule.</li>
        <li>To show you a calendar, history, and performance metrics for your posts.</li>
        <li>To send you sign-in codes and optional post notifications.</li>
        <li>To keep access tokens valid (we automatically refresh long-lived tokens so scheduled posting keeps working).</li>
        <li>To secure, maintain, and improve the service.</li>
      </ul>

      <h2 style={sx.h2}>4. How we share information</h2>
      <p>We do not sell your personal data. We share data only as needed to run the service:</p>
      <ul>
        <li><b>The platforms you connect</b> (Meta/Instagram, TikTok) — to publish your content and retrieve metrics, in line with their policies.</li>
        <li><b>Infrastructure providers</b> that process data on our behalf: Supabase (database, authentication, media storage), Cloudflare R2 (temporary hosting of large videos so the platform can fetch them), Vercel (application hosting), and an email provider for sign-in codes.</li>
        <li><b>When required by law</b>, or to protect the rights and safety of our users and service.</li>
      </ul>

      <h2 style={sx.h2}>5. Data retention</h2>
      <p>
        We keep your data while your account is active and you need the service. When you
        disconnect an account, the related access token and platform identity are deleted.
        When you delete your data or account, content, schedules, and connections are
        removed promptly and within 30 days at the latest (minimal records may be retained
        only where the law requires).
      </p>

      <h2 style={sx.h2} id="data-deletion">6. Your choices &amp; data deletion</h2>
      <p>You are always in control of your data inside the app:</p>
      <ul>
        <li><b>Disconnect an account</b> — removes that account&apos;s access token and identity from {LEGAL.brand} (Account Management → remove the channel).</li>
        <li><b>Delete all data</b> — Settings → Data → <b>&quot;Hapus semua data&quot;</b> permanently deletes every connected account, schedule, uploaded image/video, and posting history tied to you.</li>
        <li><b>Export</b> — Settings → Data → download a JSON copy of your data.</li>
        <li><b>Revoke access</b> — you can also remove {LEGAL.brand} directly from your Instagram (Settings → Apps and websites) or TikTok (Security → Manage app permissions) at any time.</li>
        <li><b>Full account / email request</b> — to delete everything including your sign-in account, email <a href={`mailto:${LEGAL.supportEmail}`} style={sx.a}>{LEGAL.supportEmail}</a> and we will process it within 30 days.</li>
      </ul>
      <p>See our dedicated <a href="/data-deletion" style={sx.a}>Data Deletion</a> page for step-by-step instructions.</p>

      <h2 style={sx.h2}>7. Security</h2>
      <p>
        Access tokens and your data are stored in a database protected by row-level
        security, so each user can only ever access their own records. All traffic uses
        HTTPS, and privileged operations run only on our server. No method of storage or
        transmission is 100% secure, but we use commercially reasonable measures to
        protect your information.
      </p>

      <h2 style={sx.h2}>8. Children&apos;s privacy</h2>
      <p>{LEGAL.brand} is intended for businesses and creators and is not directed to children. We do not knowingly collect data from children.</p>

      <h2 style={sx.h2}>9. Changes</h2>
      <p>We may update this policy from time to time. Material changes will be communicated through the app or by email. The &quot;Last updated&quot; date above reflects the latest version.</p>

      <h2 style={sx.h2}>10. Contact</h2>
      <p>
        {LEGAL.legalOwner} ({LEGAL.brand})<br />
        {LEGAL.address}, {LEGAL.city}<br />
        <a href={`mailto:${LEGAL.supportEmail}`} style={sx.a}>{LEGAL.supportEmail}</a>
      </p>
    </main>
  );
}
