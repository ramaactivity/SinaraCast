export const metadata = { title: "Ketentuan Layanan — SinaraCast" };

// Minimal but real terms of service. TikTok app setup requires a reachable
// Terms of Service URL; this page satisfies that.
export default function TermsPage() {
  const updated = "5 Juni 2026";
  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif", color: "#3e4351", lineHeight: 1.7 }}>
      <h1>Ketentuan Layanan SinaraCast</h1>
      <p style={{ color: "#8c909e" }}>Terakhir diperbarui: {updated}</p>

      <h2>Layanan</h2>
      <p>
        SinaraCast adalah alat untuk menjadwalkan dan menerbitkan konten ke akun media
        sosial Anda sendiri (Instagram dan TikTok). Dengan memakai layanan ini, Anda setuju
        pada ketentuan di bawah.
      </p>

      <h2>Akun & otorisasi</h2>
      <p>
        Anda hanya boleh menyambungkan akun yang Anda miliki atau yang berhak Anda kelola.
        Anda bertanggung jawab atas konten yang Anda jadwalkan dan terbitkan.
      </p>

      <h2>Penggunaan yang dilarang</h2>
      <p>
        Dilarang memakai SinaraCast untuk spam, konten melanggar hukum, atau melanggar
        ketentuan platform tujuan (termasuk Kebijakan Komunitas Instagram dan TikTok).
      </p>

      <h2>Ketersediaan</h2>
      <p>
        Layanan disediakan "sebagaimana adanya". Kami berupaya menjaga keandalan publikasi
        terjadwal, namun tidak menjamin bebas gangguan.
      </p>

      <h2>Kontak</h2>
      <p>Pertanyaan: workwithrama98@gmail.com</p>

      <p style={{ marginTop: 32 }}><a href="/">← SinaraCast</a></p>
    </main>
  );
}
