export const metadata = { title: "Kebijakan Privasi — SinaraCast" };

// Minimal but real privacy policy. TikTok app setup requires a reachable
// Privacy Policy URL; this page satisfies that and describes how SinaraCast
// handles the data it touches when connecting social accounts.
export default function PrivacyPage() {
  const updated = "5 Juni 2026";
  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif", color: "#3e4351", lineHeight: 1.7 }}>
      <h1>Kebijakan Privasi SinaraCast</h1>
      <p style={{ color: "#8c909e" }}>Terakhir diperbarui: {updated}</p>

      <h2>Ringkasan</h2>
      <p>
        SinaraCast membantu pemilik usaha menjadwalkan dan menerbitkan konten ke akun
        media sosial mereka sendiri (Instagram dan TikTok) secara otomatis. Kami hanya
        memproses data yang diperlukan untuk fungsi tersebut.
      </p>

      <h2>Data yang kami kumpulkan</h2>
      <ul>
        <li>Alamat email untuk masuk ke akun SinaraCast Anda.</li>
        <li>
          Saat Anda menyambungkan akun Instagram atau TikTok: identitas akun (mis. user
          id, nama tampilan, foto profil) dan token akses yang Anda berikan melalui proses
          otorisasi resmi platform.
        </li>
        <li>Konten (gambar/video) dan jadwal yang Anda unggah untuk diterbitkan.</li>
      </ul>

      <h2>Bagaimana data digunakan</h2>
      <p>
        Token akses dipakai semata-mata untuk menerbitkan konten yang Anda jadwalkan ke
        akun yang Anda sambungkan. Kami tidak menjual data Anda dan tidak membagikannya ke
        pihak ketiga selain platform tujuan (Instagram/TikTok) untuk keperluan publikasi.
      </p>

      <h2>Penyimpanan & keamanan</h2>
      <p>
        Data disimpan pada infrastruktur Supabase dengan akses dibatasi per pengguna. Token
        tidak pernah dikirim ke browser dan hanya dibaca oleh server saat menerbitkan.
      </p>

      <h2>Penghapusan data</h2>
      <p>
        Anda dapat memutus koneksi akun atau menghapus seluruh data Anda kapan saja dari
        dalam aplikasi. Memutus koneksi akan menghapus token akses terkait.
      </p>

      <h2>Kontak</h2>
      <p>Pertanyaan terkait privasi: workwithrama98@gmail.com</p>

      <p style={{ marginTop: 32 }}><a href="/">← SinaraCast</a></p>
    </main>
  );
}
