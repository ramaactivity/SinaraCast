"use client";
import { Icons } from "../icons";
import { Button, PlatIcon } from "../ui";

// Public marketing landing shown at "/" to logged-out visitors (before the OTP
// sign-in). Extends the app's own design language — warm multi-hue gradient,
// frosted white panels, amber brand mark, Poppins type — so the brand site and the
// product feel like one thing. onMasuk() flips the auth gate to SignInView.
const F = "var(--font)";

const CATS = ["Kafe & resto", "Katering", "Photobooth", "Fashion & UMKM", "Agensi sosmed"];

const STEPS = [
  { n: "01", title: "Sambungkan akun", body: "Hubungkan Instagram atau TikTok bisnismu sekali, lewat login resmi platform.", icon: <Icons.link size={18} sw={2} /> },
  { n: "02", title: "Atur jadwal", body: "Unggah gambar atau video, tulis caption, pilih waktu terbit (WIB).", icon: <Icons.calendar size={18} sw={2} /> },
  { n: "03", title: "Biarkan jalan", body: "SinaraCast menerbitkan otomatis tepat waktu, dan mengabari kalau perlu.", icon: <Icons.power size={18} sw={2} /> },
];

const FAQ = [
  { q: "Akun apa yang bisa disambungkan?", a: "Akun Instagram dan TikTok profesional (Business atau Creator). Akun pribadi belum bisa dipakai untuk publikasi otomatis, ini batasan dari platform." },
  { q: "Apakah akun saya aman?", a: "Ya. Kamu menyambungkan lewat login resmi platform, kami tidak pernah menyimpan kata sandimu, dan token disimpan terenkripsi dengan akses terpisah per pengguna." },
  { q: "Berapa biayanya?", a: "Saat ini gratis untuk memulai selama masa awal." },
  { q: "Bisa berapa akun dan brand?", a: "Banyak. Tiap akun dan brand dikelola terpisah dan rapi, tanpa tercampur satu sama lain." },
  { q: "Kalau ada yang gagal terbit?", a: "Mesin mencoba lagi secara otomatis, dan kamu langsung dikabari lewat Telegram. Tidak pernah ada posting dobel." },
];

const Logo = ({ size = 40 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.31), background: "var(--primary-grad)", boxShadow: "var(--shadow-primary)", display: "grid", placeItems: "center", color: "#fff" }}>
      <Icons.grid size={size * 0.52} sw={2} />
    </div>
    <span style={{ fontFamily: F, fontWeight: 700, fontSize: size * 0.5, letterSpacing: "-0.01em", color: "var(--ink-900)" }}>SinaraCast</span>
  </div>
);

// A small "scheduled item" row, reused in the hero window and the big feature card.
const SchedRow = ({ plat, label, who, time, tone }) => (
  <div className="lp-srow">
    <span className="lp-srow-ic" style={{ background: tone[0], color: tone[1] }}><PlatIcon p={plat} size={15} color={plat === "tiktok" ? tone[1] : undefined} /></span>
    <div className="lp-srow-mid">
      <div className="lp-srow-t">{label} <span className="lp-srow-who">{who}</span></div>
    </div>
    <span className="lp-srow-time">{time}</span>
  </div>
);

export function Landing({ onMasuk }) {
  const toHow = () => document.getElementById("lp-how")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="lp-root sc-scroll">
      <style>{CSS}</style>
      <div className="lp-wrap">

        {/* nav */}
        <header className="lp-nav">
          <Logo size={38} />
          <div className="lp-nav-act">
            <a href="#lp-how" onClick={(e) => { e.preventDefault(); toHow(); }} className="lp-navlink">Cara kerja</a>
            <a href="#lp-faq" onClick={(e) => { e.preventDefault(); document.getElementById("lp-faq")?.scrollIntoView({ behavior: "smooth" }); }} className="lp-navlink lp-navlink-hide">FAQ</a>
            <Button variant="amber" size="md" onClick={onMasuk} icon={<Icons.user size={16} sw={2} />}>Masuk</Button>
          </div>
        </header>

        {/* hero */}
        <section className="lp-hero">
          <span className="lp-glow" aria-hidden="true" />
          <div className="lp-hero-copy lp-up">
            <div className="lp-overline">Untuk UMKM & agensi Indonesia</div>
            <h1 className="lp-h1">Media sosialmu,<br /><span className="lp-h1-accent">jalan sendiri.</span></h1>
            <p className="lp-lead">
              Kamu punya bisnis untuk diurus, bukan feed yang harus dijaga tiap hari.
              SinaraCast membuat Instagram & TikTok bisnismu tetap tayang otomatis, jadi
              kamu bisa kembali fokus ke hal yang benar-benar penting.
            </p>
            <div className="lp-cta-row">
              <Button variant="amber" size="lg" onClick={onMasuk} icon={<Icons.user size={18} sw={2} />}>Mulai sekarang</Button>
              <Button variant="secondary" size="lg" onClick={toHow} icon={<Icons.play size={16} />}>Lihat cara kerja</Button>
            </div>
            <div className="lp-trust">
              <span className="lp-trust-item"><PlatIcon p="instagram" size={17} /> Instagram</span>
              <span className="lp-trust-dot" />
              <span className="lp-trust-item"><PlatIcon p="tiktok" size={16} color="var(--ink-700)" /> TikTok</span>
              <span className="lp-trust-dot" />
              <span className="lp-trust-item"><Icons.clock size={15} sw={2} /> Waktu WIB</span>
            </div>
          </div>

          {/* product visual: a faithful app surface in a browser frame + accent chips */}
          <div className="lp-hero-art lp-up" style={{ animationDelay: ".08s" }} aria-hidden="true">
            <div className="lp-win lp-float">
              <div className="lp-win-bar">
                <span className="lp-dot" style={{ background: "#F2776E" }} />
                <span className="lp-dot" style={{ background: "#F4C04C" }} />
                <span className="lp-dot" style={{ background: "#82CF7E" }} />
                <span className="lp-win-url"><Icons.grid size={11} sw={2} /> sinaracast — kalender</span>
              </div>
              <div className="lp-win-body">
                <div className="lp-win-head">
                  <span className="lp-win-title">Akan tayang</span>
                  <span className="lp-win-wib">WIB</span>
                </div>
                <SchedRow plat="instagram" label="Story" who="tiska" time="17.00" tone={["var(--primary-100)", "var(--primary-500)"]} />
                <SchedRow plat="instagram" label="Reels" who="mahakan" time="19.00" tone={["#ECE3F7", "#8B6FB0"]} />
                <SchedRow plat="tiktok" label="Video" who="outentika" time="besok" tone={["var(--green-100)", "var(--green-500)"]} />
                <div className="lp-win-foot"><span className="lp-livedot" /> Mesin aktif · cek tiap menit</div>
              </div>
            </div>
            <div className="lp-chip lp-chip-tr lp-float" style={{ animationDelay: ".9s" }}>
              <span className="lp-chip-ic" style={{ background: "var(--green-100)", color: "var(--green-500)" }}><Icons.check size={15} sw={2.6} /></span>
              <div>
                <div className="lp-chip-t">Terbit otomatis</div>
                <div className="lp-chip-s">Story · 17.00 WIB</div>
              </div>
            </div>
            <div className="lp-chip lp-chip-bl lp-float" style={{ animationDelay: "1.6s" }}>
              <span className="lp-chip-ic" style={{ background: "#ECE3F7", color: "#8B6FB0" }}><Icons.telegram size={15} sw={2} /></span>
              <div className="lp-chip-t">Semua aman ✓</div>
            </div>
          </div>
        </section>

        {/* social proof — category band */}
        <section className="lp-band">
          <span className="lp-band-label">Cocok untuk usaha yang sibuk seperti</span>
          <div className="lp-cats">
            {CATS.map((c) => <span key={c} className="lp-cat">{c}</span>)}
          </div>
        </section>

        {/* features — bento, each card carries a small visual */}
        <section className="lp-section">
          <div className="lp-eyebrow">Yang kamu dapat</div>
          <h2 className="lp-h2">Dibuat untuk berhenti dipegang.</h2>
          <div className="lp-bento">

            <article className="lp-card lp-card-big lp-card-warm">
              <span className="lp-card-ic" style={{ background: "rgba(255,255,255,.7)", color: "var(--primary-500)" }}><Icons.power size={20} sw={2} /></span>
              <h3 className="lp-card-t">Terbit otomatis</h3>
              <p className="lp-card-b">Story, Feed, Reels, dan TikTok terjadwal. Atur sekali, terus jalan tanpa kamu pegang setiap hari.</p>
              <div className="lp-mini-sched">
                <SchedRow plat="instagram" label="Story" who="harian" time="17.00" tone={["#fff", "var(--primary-500)"]} />
                <SchedRow plat="instagram" label="Reels" who="2x/minggu" time="19.00" tone={["#fff", "#8B6FB0"]} />
                <SchedRow plat="tiktok" label="Video" who="mingguan" time="besok" tone={["#fff", "var(--green-500)"]} />
              </div>
            </article>

            <article className="lp-card">
              <span className="lp-card-ic" style={{ background: "var(--green-100)", color: "var(--green-500)" }}><Icons.calendar size={18} sw={2} /></span>
              <h3 className="lp-card-t">Kalender konten</h3>
              <p className="lp-card-b">Semua yang akan tayang dalam satu layar yang tenang.</p>
              <div className="lp-minical">
                {Array.from({ length: 28 }).map((_, i) => {
                  const mark = i === 9 ? "a" : i === 12 ? "m" : i === 18 ? "g" : i === 23 ? "a" : null;
                  return <span key={i} className={`lp-cell${mark ? " lp-cell-" + mark : ""}`} />;
                })}
              </div>
            </article>

            <article className="lp-card lp-card-lilac">
              <span className="lp-card-ic" style={{ background: "rgba(255,255,255,.7)", color: "#8B6FB0" }}><Icons.telegram size={18} sw={2} /></span>
              <h3 className="lp-card-t">Lapor sendiri</h3>
              <p className="lp-card-b">Kamu cuma dikabari kalau ada yang perlu, lewat Telegram. Tenang, tidak perlu dipelototi.</p>
            </article>

            <article className="lp-card">
              <span className="lp-card-ic" style={{ background: "var(--green-100)", color: "var(--green-500)" }}><Icons.activity size={18} sw={2} /></span>
              <h3 className="lp-card-t">Metrik otomatis</h3>
              <p className="lp-card-b">Tahu performa tiap posting tanpa buka aplikasi sosialmu.</p>
              <div className="lp-metric">
                <svg className="lp-spark" viewBox="0 0 120 30" preserveAspectRatio="none"><polyline points="0,25 18,21 34,23 52,13 70,16 88,7 104,10 120,3" fill="none" stroke="var(--green-500)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="lp-metric-n">+128% <span>jangkauan</span></span>
              </div>
            </article>

            <article className="lp-card">
              <span className="lp-card-ic" style={{ background: "var(--primary-100)", color: "var(--primary-500)" }}><Icons.layers size={18} sw={2} /></span>
              <h3 className="lp-card-t">Banyak akun & brand</h3>
              <p className="lp-card-b">Kelola beberapa akun sekaligus, masing-masing terpisah rapi.</p>
            </article>

            <article className="lp-card">
              <span className="lp-card-ic" style={{ background: "var(--green-100)", color: "var(--green-500)" }}><Icons.check size={18} sw={2.4} /></span>
              <h3 className="lp-card-t">Tidak pernah dobel</h3>
              <p className="lp-card-b">Mesin andal: tak posting dua kali, dan coba lagi sendiri kalau gagal.</p>
            </article>

          </div>
        </section>

        {/* how it works */}
        <section className="lp-section" id="lp-how">
          <div className="lp-eyebrow">Cara kerja</div>
          <h2 className="lp-h2">Tiga langkah, lalu lupakan.</h2>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-top">
                  <span className="lp-step-n">{s.n}</span>
                  <span className="lp-step-ic">{s.icon}</span>
                </div>
                <h3 className="lp-step-t">{s.title}</h3>
                <p className="lp-step-b">{s.body}</p>
                {i < STEPS.length - 1 && <span className="lp-step-arrow"><Icons.chevRight size={18} /></span>}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-section" id="lp-faq">
          <div className="lp-eyebrow">Pertanyaan umum</div>
          <h2 className="lp-h2">Yang biasanya ditanyakan.</h2>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <div key={f.q} className="lp-faq-item">
                <div className="lp-faq-q"><span className="lp-faq-mark">?</span>{f.q}</div>
                <p className="lp-faq-a">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* closing CTA */}
        <section className="lp-final">
          <h2 className="lp-final-h">Kembali fokus ke bisnismu.</h2>
          <p className="lp-final-p">Urus hal yang penting buat usahamu. Biar kontenmu yang jalan sendiri.</p>
          <Button variant="amber" size="lg" onClick={onMasuk} icon={<Icons.user size={18} sw={2} />}>Masuk ke SinaraCast</Button>
        </section>

        {/* footer */}
        <footer className="lp-footer">
          <div className="lp-foot-brand">
            <Logo size={34} />
            <p className="lp-foot-tag">Media sosial yang jalan sendiri. Untuk UMKM & agensi Indonesia.</p>
          </div>
          <div className="lp-foot-links">
            <div className="lp-foot-col">
              <div className="lp-foot-h">Produk</div>
              <button className="lp-foot-a" onClick={onMasuk}>Masuk</button>
              <a className="lp-foot-a" href="#lp-how" onClick={(e) => { e.preventDefault(); toHow(); }}>Cara kerja</a>
              <a className="lp-foot-a" href="#lp-faq" onClick={(e) => { e.preventDefault(); document.getElementById("lp-faq")?.scrollIntoView({ behavior: "smooth" }); }}>FAQ</a>
            </div>
            <div className="lp-foot-col">
              <div className="lp-foot-h">Legal</div>
              <a className="lp-foot-a" href="/privacy">Privasi</a>
              <a className="lp-foot-a" href="/terms">Ketentuan</a>
              <a className="lp-foot-a" href="/data-deletion">Hapus Data</a>
            </div>
            <div className="lp-foot-col">
              <div className="lp-foot-h">Perusahaan</div>
              <a className="lp-foot-a" href="/about">Tentang</a>
              <a className="lp-foot-a" href="mailto:support@[domainanda].com">Kontak</a>
            </div>
          </div>
          <div className="lp-foot-base">© 2026 SinaraCast · Indonesia</div>
        </footer>
      </div>
    </div>
  );
}

const CSS = `
.lp-root { height: 100%; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
.lp-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px 0; }
.lp-root a { text-decoration: none; }

/* nav */
.lp-nav { display: flex; align-items: center; justify-content: space-between; padding: 22px 2px 8px; position: relative; z-index: 3; }
.lp-nav-act { display: flex; align-items: center; gap: 20px; }
.lp-navlink { font-family: ${F}; font-weight: 600; font-size: 14px; color: var(--ink-500); transition: color .15s; }
.lp-navlink:hover { color: var(--ink-900); }
.lp-navlink-hide { display: none; }

/* hero */
.lp-hero { position: relative; display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; padding: 40px 2px 24px; }
.lp-glow { position: absolute; top: -40px; left: -80px; width: 520px; height: 420px; background: radial-gradient(circle at 30% 30%, rgba(249,168,38,.20), transparent 62%); filter: blur(36px); pointer-events: none; z-index: 0; }
.lp-hero-copy, .lp-hero-art { position: relative; z-index: 1; }
.lp-overline { font-family: ${F}; font-weight: 600; font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--primary-500); margin-bottom: 16px; }
.lp-h1 { font-family: ${F}; font-weight: 800; font-size: clamp(34px, 6.4vw, 60px); line-height: 1.04; letter-spacing: -0.03em; color: var(--ink-900); margin: 0 0 18px; }
.lp-h1-accent { color: var(--primary-500); }
.lp-lead { font-family: ${F}; font-weight: 400; font-size: clamp(15px, 1.6vw, 18px); line-height: 1.6; color: var(--ink-700); max-width: 33em; margin: 0 0 28px; }
.lp-cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 26px; }
.lp-trust { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.lp-trust-item { display: inline-flex; align-items: center; gap: 7px; font-family: ${F}; font-weight: 600; font-size: 13.5px; color: var(--ink-700); }
.lp-trust-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--ink-300); }

/* hero art: app window */
.lp-hero-art { position: relative; min-height: 360px; display: flex; align-items: center; justify-content: center; }
.lp-win { width: min(360px, 100%); background: rgba(255,255,255,.9); border: 1px solid rgba(255,255,255,.8); border-radius: 20px; box-shadow: var(--shadow-lg); overflow: hidden; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.lp-win-bar { display: flex; align-items: center; gap: 7px; padding: 11px 14px; border-bottom: 1px solid var(--line); }
.lp-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.lp-win-url { margin-left: 8px; display: inline-flex; align-items: center; gap: 6px; font-family: ${F}; font-weight: 500; font-size: 11.5px; color: var(--ink-400); background: rgba(140,144,158,.1); padding: 4px 11px; border-radius: 999px; }
.lp-win-body { padding: 16px; }
.lp-win-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.lp-win-title { font-family: ${F}; font-weight: 700; font-size: 15px; color: var(--ink-900); }
.lp-win-wib { font-family: ${F}; font-weight: 600; font-size: 10.5px; color: var(--ink-400); background: rgba(140,144,158,.1); padding: 3px 9px; border-radius: 999px; }
.lp-srow { display: flex; align-items: center; gap: 11px; padding: 10px; border-radius: 13px; background: rgba(255,255,255,.6); border: 1px solid var(--line); margin-bottom: 8px; }
.lp-srow-ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: 0 0 auto; }
.lp-srow-mid { flex: 1; min-width: 0; }
.lp-srow-t { font-family: ${F}; font-weight: 600; font-size: 13px; color: var(--ink-900); }
.lp-srow-who { font-weight: 500; color: var(--ink-400); }
.lp-srow-time { font-family: ${F}; font-weight: 700; font-size: 11px; color: var(--primary-500); background: var(--primary-100); padding: 5px 10px; border-radius: 999px; flex: 0 0 auto; }
.lp-win-foot { display: flex; align-items: center; gap: 7px; margin-top: 4px; padding: 4px 2px; font-family: ${F}; font-weight: 600; font-size: 11.5px; color: var(--ink-500); }
.lp-livedot { width: 7px; height: 7px; border-radius: 50%; background: var(--green-500); box-shadow: 0 0 0 4px rgba(95,190,107,.18); }
.lp-chip { position: absolute; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,.94); border: 1px solid var(--line); border-radius: 15px; box-shadow: var(--shadow-md); padding: 11px 13px; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 2; }
.lp-chip-tr { top: 14px; right: -6px; }
.lp-chip-bl { bottom: 24px; left: -10px; }
.lp-chip-ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: 0 0 auto; }
.lp-chip-t { font-family: ${F}; font-weight: 600; font-size: 12.5px; color: var(--ink-900); }
.lp-chip-s { font-family: ${F}; font-weight: 500; font-size: 11px; color: var(--ink-500); margin-top: 1px; }

/* social band */
.lp-band { text-align: center; padding: 18px 2px 8px; }
.lp-band-label { font-family: ${F}; font-weight: 600; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-400); }
.lp-cats { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 14px; }
.lp-cat { font-family: ${F}; font-weight: 600; font-size: 13.5px; color: var(--ink-700); background: rgba(255,255,255,.7); border: 1px solid var(--line); padding: 9px 16px; border-radius: 999px; }

/* sections */
.lp-section { padding: 52px 2px; }
.lp-eyebrow { font-family: ${F}; font-weight: 600; font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--primary-500); margin-bottom: 10px; }
.lp-h2 { font-family: ${F}; font-weight: 800; font-size: clamp(26px, 3.4vw, 36px); letter-spacing: -0.025em; color: var(--ink-900); margin: 0 0 28px; }

/* bento */
.lp-bento { display: grid; grid-template-columns: 1fr; gap: 16px; }
.lp-card { background: rgba(255,255,255,.82); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); padding: 22px; transition: transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s; display: flex; flex-direction: column; }
.lp-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
.lp-card-warm { background: var(--card-yellow); border-color: rgba(255,255,255,.7); }
.lp-card-lilac { background: var(--card-lilac); border-color: rgba(255,255,255,.7); }
.lp-card-ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; margin-bottom: 14px; flex: 0 0 auto; }
.lp-card-t { font-family: ${F}; font-weight: 700; font-size: 17px; color: var(--ink-900); margin: 0 0 6px; }
.lp-card-b { font-family: ${F}; font-weight: 400; font-size: 14px; line-height: 1.55; color: var(--ink-500); margin: 0; }
.lp-card-warm .lp-card-b, .lp-card-lilac .lp-card-b { color: var(--ink-700); }
.lp-mini-sched { margin-top: auto; padding-top: 18px; }
.lp-mini-sched .lp-srow { background: rgba(255,255,255,.66); }
.lp-mini-sched .lp-srow-time { background: rgba(255,255,255,.8); }
.lp-minical { margin-top: auto; padding-top: 18px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.lp-cell { aspect-ratio: 1; border-radius: 5px; background: rgba(140,144,158,.12); }
.lp-cell-a { background: var(--primary-400); }
.lp-cell-m { background: #BFA6E0; }
.lp-cell-g { background: var(--green-400); }
.lp-metric { margin-top: auto; padding-top: 16px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.lp-spark { width: 60%; height: 30px; display: block; }
.lp-metric-n { font-family: ${F}; font-weight: 800; font-size: 20px; color: var(--green-500); letter-spacing: -0.01em; }
.lp-metric-n span { font-weight: 500; font-size: 11.5px; color: var(--ink-400); display: block; letter-spacing: 0; }

/* steps */
.lp-steps { display: grid; grid-template-columns: 1fr; gap: 16px; }
.lp-step { position: relative; background: rgba(255,255,255,.82); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 24px; box-shadow: var(--shadow-sm); }
.lp-step-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.lp-step-n { font-family: ${F}; font-weight: 800; font-size: 30px; letter-spacing: -0.02em; color: var(--primary-500); }
.lp-step-ic { width: 38px; height: 38px; border-radius: 11px; background: var(--primary-100); color: var(--primary-500); display: grid; place-items: center; }
.lp-step-t { font-family: ${F}; font-weight: 700; font-size: 17px; color: var(--ink-900); margin: 0 0 6px; }
.lp-step-b { font-family: ${F}; font-weight: 400; font-size: 14px; line-height: 1.55; color: var(--ink-500); margin: 0; }
.lp-step-arrow { display: none; }

/* FAQ */
.lp-faq { display: grid; grid-template-columns: 1fr; gap: 14px; }
.lp-faq-item { background: rgba(255,255,255,.7); border: 1px solid var(--line); border-radius: var(--r-md); padding: 20px 22px; }
.lp-faq-q { display: flex; align-items: center; gap: 10px; font-family: ${F}; font-weight: 700; font-size: 15px; color: var(--ink-900); margin-bottom: 7px; }
.lp-faq-mark { width: 22px; height: 22px; border-radius: 7px; background: var(--primary-100); color: var(--primary-500); display: grid; place-items: center; font-size: 13px; font-weight: 800; flex: 0 0 auto; }
.lp-faq-a { font-family: ${F}; font-weight: 400; font-size: 13.5px; line-height: 1.6; color: var(--ink-500); margin: 0; padding-left: 32px; }

/* final CTA */
.lp-final { text-align: center; margin: 24px 2px 60px; padding: 56px 28px; border-radius: var(--r-xl); background: var(--card-yellow); border: 1px solid rgba(255,255,255,.7); box-shadow: var(--shadow-md); }
.lp-final-h { font-family: ${F}; font-weight: 800; font-size: clamp(24px, 3.4vw, 34px); letter-spacing: -0.025em; color: var(--ink-900); margin: 0 0 10px; }
.lp-final-p { font-family: ${F}; font-weight: 400; font-size: 15.5px; line-height: 1.55; color: var(--ink-700); margin: 0 auto 24px; max-width: 30em; }

/* footer */
.lp-footer { display: grid; grid-template-columns: 1fr; gap: 30px; padding: 40px 2px; border-top: 1px solid var(--line); }
.lp-foot-tag { font-family: ${F}; font-weight: 400; font-size: 13.5px; line-height: 1.55; color: var(--ink-500); margin: 14px 0 0; max-width: 26em; }
.lp-foot-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.lp-foot-h { font-family: ${F}; font-weight: 700; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-400); margin-bottom: 12px; }
.lp-foot-a { display: block; font-family: ${F}; font-weight: 500; font-size: 13.5px; color: var(--ink-700); background: none; border: none; padding: 5px 0; cursor: pointer; text-align: left; transition: color .15s; }
.lp-foot-a:hover { color: var(--primary-500); }
.lp-foot-base { font-family: ${F}; font-size: 12.5px; color: var(--ink-400); padding-top: 8px; }

/* motion */
@keyframes lpUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
.lp-up { animation: lpUp .6s cubic-bezier(.2,.8,.2,1) both; }
.lp-float { animation: lpFloat 6s ease-in-out infinite; }

/* desktop */
@media (min-width: 880px) {
  .lp-wrap { padding: 0 40px; }
  .lp-navlink-hide { display: inline; }
  .lp-hero { grid-template-columns: 1.05fr .95fr; gap: 56px; padding: 52px 2px 36px; }
  .lp-bento { grid-template-columns: repeat(6, 1fr); grid-auto-rows: 1fr; }
  .lp-card-big { grid-column: span 3; grid-row: span 2; }
  .lp-bento > .lp-card:nth-child(2), .lp-bento > .lp-card:nth-child(3) { grid-column: span 3; }
  .lp-bento > .lp-card:nth-child(4), .lp-bento > .lp-card:nth-child(5), .lp-bento > .lp-card:nth-child(6) { grid-column: span 2; }
  .lp-steps { grid-template-columns: repeat(3, 1fr); gap: 22px; }
  .lp-step-arrow { display: grid; place-items: center; position: absolute; top: 50%; right: -16px; transform: translateY(-50%); color: var(--ink-300); z-index: 2; }
  .lp-faq { grid-template-columns: 1fr 1fr; gap: 16px; }
  .lp-footer { grid-template-columns: 1.2fr 2fr; align-items: start; }
  .lp-foot-base { grid-column: 1 / -1; border-top: 1px solid var(--line); margin-top: 6px; }
}

@media (prefers-reduced-motion: reduce) {
  .lp-up, .lp-float { animation: none; }
}
`;
