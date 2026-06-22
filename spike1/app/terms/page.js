import { LEGAL, sx } from "../../lib/legalInfo";

export const metadata = { title: "Terms of Service — SinaraCast" };

// Terms of Service for Meta + TikTok App Review. States the service provider's legal
// identity, acceptable use, ownership, and Indonesian governing law.
export default function TermsPage() {
  return (
    <main style={sx.main}>
      <a href="/" style={sx.back}>← Back to app</a>
      <h1 style={sx.h1}>Terms of Service</h1>
      <p style={sx.sub}>{LEGAL.brand} · Last updated: {LEGAL.updated}</p>

      <h2 style={sx.h2}>Service provider</h2>
      <div style={sx.card}>
        <div style={sx.row}>
          <div>
            <div style={sx.label}>Legal name</div>
            <div style={sx.value}>{LEGAL.legalOwner}</div>
          </div>
          <div>
            <div style={sx.label}>Operating as</div>
            <div style={sx.value}>{LEGAL.brand}</div>
          </div>
          <div>
            <div style={sx.label}>Business type</div>
            <div style={sx.value}>{LEGAL.businessType}</div>
          </div>
        </div>
        <div style={{ ...sx.row, marginTop: 18 }}>
          <div>
            <div style={sx.label}>NIB</div>
            <div style={sx.value}>{LEGAL.nib}</div>
          </div>
          <div>
            <div style={sx.label}>NPWP</div>
            <div style={sx.value}>{LEGAL.npwp}</div>
          </div>
          <div>
            <div style={sx.label}>Contact</div>
            <div style={sx.value}>{LEGAL.supportEmail}</div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 24 }}>
        These Terms govern your use of {LEGAL.brand} at https://{LEGAL.domain} and the
        SinaraCast application (the &quot;Service&quot;). By using the Service, you agree
        to these Terms.
      </p>

      <h2 style={sx.h2}>1. The service</h2>
      <p>
        {LEGAL.brand} lets you schedule and automatically publish content to social media
        accounts you own and connect (Instagram and TikTok), and view performance metrics
        for those posts.
      </p>

      <h2 style={sx.h2}>2. Accounts &amp; authorization</h2>
      <p>
        You may only connect social media accounts that you own or are authorized to
        manage, and you must use each platform&apos;s official authorization flow. You are
        responsible for the content you schedule and publish, and for keeping your sign-in
        secure. Your connected account must be a professional (Business/Creator) account
        where the platform requires it for publishing.
      </p>

      <h2 style={sx.h2}>3. Acceptable use</h2>
      <p>You agree not to use {LEGAL.brand} to:</p>
      <ul>
        <li>Send spam or post unlawful, infringing, or harmful content.</li>
        <li>Violate the terms or community guidelines of any connected platform, including the Instagram Platform Policy and the TikTok Developer/Community guidelines.</li>
        <li>Attempt to access other users&apos; data or disrupt the Service.</li>
      </ul>

      <h2 style={sx.h2}>4. Your content &amp; ownership</h2>
      <p>
        You retain ownership of your content. You grant {LEGAL.brand} the limited rights
        needed to store and publish that content to the accounts you connect, on your
        behalf and at your direction. We claim no ownership over your content or accounts.
      </p>

      <h2 style={sx.h2}>5. Third-party platforms</h2>
      <p>
        The Service relies on the Instagram and TikTok platforms. Your use of those
        platforms through {LEGAL.brand} is also subject to their respective terms. We are
        not responsible for changes, outages, or policy decisions made by those platforms.
      </p>

      <h2 style={sx.h2}>6. Availability &amp; disclaimer</h2>
      <p>
        The Service is provided &quot;as is&quot;. We work to keep scheduled publishing
        reliable but do not guarantee uninterrupted or error-free operation. To the extent
        permitted by law, {LEGAL.brand} is not liable for indirect or consequential damages
        arising from use of the Service.
      </p>

      <h2 style={sx.h2}>7. Data &amp; privacy</h2>
      <p>
        Our handling of your data is described in our{" "}
        <a href="/privacy" style={sx.a}>Privacy Policy</a>. You can delete your data at any
        time — see the <a href="/data-deletion" style={sx.a}>Data Deletion</a> page.
      </p>

      <h2 style={sx.h2}>8. Termination</h2>
      <p>You may stop using the Service and delete your data at any time. We may suspend access for violations of these Terms or platform policies.</p>

      <h2 style={sx.h2}>9. Changes</h2>
      <p>We may update these Terms from time to time; material changes will be communicated through the app or by email.</p>

      <h2 style={sx.h2}>10. Governing law</h2>
      <p>These Terms are governed by the laws of {LEGAL.governingLaw}.</p>

      <h2 style={sx.h2}>11. Contact</h2>
      <p><a href={`mailto:${LEGAL.supportEmail}`} style={sx.a}>{LEGAL.supportEmail}</a></p>
    </main>
  );
}
