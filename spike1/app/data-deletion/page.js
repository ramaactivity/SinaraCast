import { LEGAL, sx } from "../../lib/legalInfo";

export const metadata = { title: "Data Deletion — SinaraCast" };

// Meta App Review requires a Data Deletion Instructions URL. This page is that URL:
// it tells users exactly how to delete the data SinaraCast holds about them. The
// in-app "Hapus semua data" action (Settings → Data) performs the deletion described.
export default function DataDeletionPage() {
  return (
    <main style={sx.main}>
      <a href="/" style={sx.back}>← Back to app</a>
      <h1 style={sx.h1}>Data Deletion</h1>
      <p style={sx.sub}>{LEGAL.brand} · Last updated: {LEGAL.updated}</p>

      <p>
        You can delete the data {LEGAL.brand} holds about you at any time. There are three
        ways to do it, described below.
      </p>

      <h2 style={sx.h2}>Option 1 — Delete everything inside the app</h2>
      <ol>
        <li>Sign in to {LEGAL.brand}.</li>
        <li>Open <b>Pengaturan</b> (Settings).</li>
        <li>Go to the <b>Data</b> section.</li>
        <li>Click <b>&quot;Hapus semua data&quot;</b> and confirm.</li>
      </ol>
      <p>
        This permanently deletes every connected Instagram/TikTok account (including their
        access tokens and platform profile data), all schedules and posting rules, every
        uploaded image and video, and your posting history.
      </p>

      <h2 style={sx.h2}>Option 2 — Disconnect a single account</h2>
      <p>
        If you only want to remove one connected account, open <b>Manajemen Akun</b>
        (Account Management) and remove that channel. Its access token and platform
        identity are deleted immediately, while the rest of your data stays intact.
      </p>

      <h2 style={sx.h2}>Option 3 — Revoke access from the platform</h2>
      <ul>
        <li><b>Instagram:</b> Instagram app → Settings → Apps and websites → remove {LEGAL.brand}.</li>
        <li><b>TikTok:</b> TikTok app → Settings → Security → Manage app permissions → remove {LEGAL.brand}.</li>
      </ul>
      <p>This stops {LEGAL.brand} from accessing your account; you can also use Option 1 to erase any data already stored.</p>

      <h2 style={sx.h2}>Request deletion by email</h2>
      <p>
        To delete your entire account — including your sign-in email — or if you cannot
        access the app, email <a href={`mailto:${LEGAL.supportEmail}`} style={sx.a}>{LEGAL.supportEmail}</a>{" "}
        from the email address on your account with the subject &quot;Delete my data&quot;.
        We will verify your request and complete the deletion within 30 days. Limited
        records may be retained only where required by law.
      </p>

      <div style={sx.todo}>
        Note: this is {LEGAL.brand}&apos;s Data Deletion Instructions page. Its URL
        (https://{LEGAL.domain}/data-deletion) is the one to submit in the Meta App
        Dashboard under &quot;Data Deletion Instructions URL&quot;.
      </div>
    </main>
  );
}
