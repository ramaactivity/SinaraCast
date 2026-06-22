"use client";
import { Icons } from "../icons";
import { Button, PlatIcon } from "../ui";

// Public marketing landing shown at "/" to logged-out visitors (before the OTP
// sign-in). Extends the app's own design language — warm multi-hue gradient,
// frosted white panels, amber brand mark, Poppins/system type — so the brand site
// and the product feel like one thing. onMasuk() flips the auth gate to SignInView.
const F = "var(--font)";

const FEATURES = [
  { key: "auto", span: "big", tint: ["var(--primary-100)", "var(--primary-500)"], icon: <Icons.power size={20} sw={2} />,
    title: "Terbit otomatis", body: "Story, Feed, Reels, dan TikTok terjadwal. Atur sekali, terus jalan tanpa kamu pegang setiap hari.", plats: true },
  { key: "cal", tint: ["var(--green-100)", "var(--green-500)"], icon: <Icons.calendar size={18} sw={2} />,
    title: "Kalender konten", body: "Semua yang akan tayang dalam satu layar yang tenang." },
  { key: "alert", tint: ["#ECE3F7", "#8B6FB0"], icon: <Icons.telegram size={18} sw={2} />,
    title: "Lapor sendiri", body: "Kamu cuma dikabari kalau ada yang perlu, lewat Telegram." },
  { key: "metric", tint: ["var(--green-100)", "var(--green-500)"], icon: <Icons.activity size={18} sw={2} />,
    title: "Metrik otomatis", body: "Tahu performa tiap posting tanpa buka aplikasi sosialmu.", spark: true },
  { key: "multi", tint: ["var(--primary-100)", "var(--primary-500)"], icon: <Icons.layers size={18} sw={2} />,
    title: "Banyak akun & brand", body: "Kelola beberapa akun sekaligus, masing-masing terpisah rapi." },
  { key: "safe", tint: ["#ECE3F7", "#8B6FB0"], icon: <Icons.check size={18} sw={2.4} />,
    title: "Tidak pernah dobel", body: "Mesin andal: tak posting dua kali, dan coba lagi sendiri kalau gagal." },
];

const STEPS = [
  { n: "01", title: "Sambungkan akun", body: "Hubungkan Instagram atau TikTok bisnismu sekali, lewat login resmi platform." },
  { n: "02", title: "Atur jadwal", body: "Unggah gambar atau video, tulis caption, pilih waktu terbit (WIB)." },
  { n: "03", title: "Biarkan jalan", body: "SinaraCast menerbitkan otomatis tepat waktu, dan mengabari kalau perlu." },
];

const Logo = ({ size = 40 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.31), background: "var(--primary-grad)", boxShadow: "var(--shadow-primary)", display: "grid", placeItems: "center", color: "#fff" }}>
      <Icons.grid size={size * 0.52} sw={2} />
    </div>
    <span style={{ fontFamily: F, fontWeight: 700, fontSize: size * 0.5, letterSpacing: "-0.01em", color: "var(--ink-900)" }}>SinaraCast</span>
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
            <Button variant="amber" size="md" onClick={onMasuk} icon={<Icons.user size={16} sw={2} />}>Masuk</Button>
          </div>
        </header>

        {/* hero */}
        <section className="lp-hero">
          <div className="lp-hero-copy lp-up">
            <div className="lp-overline">Untuk UMKM & agensi Indonesia</div>
            <h1 className="lp-h1">Media sosialmu,<br /><span className="lp-h1-accent">jalan sendiri.</span></h1>
            <p className="lp-lead">
              SinaraCast menjadwalkan dan menerbitkan konten ke Instagram & TikTok bisnismu
              secara otomatis. Atur sekali, sisanya kami yang jalankan, lalu mengabari kalau
              ada yang perlu.
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

          {/* product visual — authentic to the app, not stock */}
          <div className="lp-hero-art lp-up" style={{ animationDelay: ".08s" }} aria-hidden="true">
            <div className="lp-story lp-float">
              <div className="lp-story-top">
                <span className="lp-story-ring"><span className="lp-story-dot" /></span>
                <span className="lp-story-name">tiska.catering</span>
                <span className="lp-story-tag">Story</span>
              </div>
              <div className="lp-story-body"><Icons.image size={34} sw={1.6} /></div>
              <div className="lp-story-foot"><Icons.check size={14} sw={2.6} /> Terbit otomatis · 17.00 WIB</div>
            </div>
            <div className="lp-chip lp-float" style={{ animationDelay: ".9s" }}>
              <span className="lp-chip-ic"><Icons.calendar size={16} sw={2} /></span>
              <div>
                <div className="lp-chip-t">Reels · besok</div>
                <div className="lp-chip-s">Terjadwal 19.00 WIB</div>
              </div>
            </div>
            <div className="lp-chip lp-chip-2 lp-float" style={{ animationDelay: "1.6s" }}>
              <span className="lp-chip-ic lp-chip-ic-tg"><Icons.telegram size={15} sw={2} /></span>
              <div className="lp-chip-t">Semua aman ✓</div>
            </div>
          </div>
        </section>

        {/* features — bento, varied sizes */}
        <section className="lp-section">
          <div className="lp-eyebrow">Yang kamu dapat</div>
          <h2 className="lp-h2">Dibuat untuk berhenti dipegang.</h2>
          <div className="lp-bento">
            {FEATURES.map((f) => (
              <article key={f.key} className={`lp-card${f.span === "big" ? " lp-card-big" : ""}`}>
                <span className="lp-card-ic" style={{ background: f.tint[0], color: f.tint[1] }}>{f.icon}</span>
                <h3 className="lp-card-t">{f.title}</h3>
                <p className="lp-card-b">{f.body}</p>
                {f.plats && (
                  <div className="lp-card-plats">
                    <span className="lp-pill"><PlatIcon p="instagram" size={14} /> Story</span>
                    <span className="lp-pill"><PlatIcon p="instagram" size={14} /> Reels</span>
                    <span className="lp-pill"><PlatIcon p="instagram" size={14} /> Feed</span>
                    <span className="lp-pill"><PlatIcon p="tiktok" size={13} color="var(--ink-700)" /> Video</span>
                  </div>
                )}
                {f.spark && (
                  <svg className="lp-spark" viewBox="0 0 120 34" preserveAspectRatio="none">
                    <polyline points="0,28 18,24 34,26 52,16 70,19 88,9 104,12 120,4" fill="none" stroke="var(--green-500)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="lp-section" id="lp-how">
          <div className="lp-eyebrow">Cara kerja</div>
          <h2 className="lp-h2">Tiga langkah, lalu lupakan.</h2>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-n">{s.n}</div>
                <h3 className="lp-step-t">{s.title}</h3>
                <p className="lp-step-b">{s.body}</p>
                {i < STEPS.length - 1 && <span className="lp-step-arrow"><Icons.chevRight size={18} /></span>}
              </div>
            ))}
          </div>
        </section>

        {/* closing CTA */}
        <section className="lp-final">
          <h2 className="lp-final-h">Berhenti mikirin jadwal posting.</h2>
          <p className="lp-final-p">Atur kontenmu sekali, biarkan SinaraCast yang menjaganya tetap tayang.</p>
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
          <div className="lp-foot-base">© 2026 SinaraCast</div>
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
.lp-nav { display: flex; align-items: center; justify-content: space-between; padding: 22px 2px 8px; }
.lp-nav-act { display: flex; align-items: center; gap: 18px; }
.lp-navlink { font-family: ${F}; font-weight: 600; font-size: 14px; color: var(--ink-500); transition: color .15s; }
.lp-navlink:hover { color: var(--ink-900); }

/* hero */
.lp-hero { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; padding: 40px 2px 24px; }
.lp-overline { font-family: ${F}; font-weight: 600; font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--primary-500); margin-bottom: 16px; }
.lp-h1 { font-family: ${F}; font-weight: 800; font-size: clamp(34px, 6.4vw, 60px); line-height: 1.04; letter-spacing: -0.025em; color: var(--ink-900); margin: 0 0 18px; }
.lp-h1-accent { color: var(--primary-500); }
.lp-lead { font-family: ${F}; font-weight: 400; font-size: clamp(15px, 1.6vw, 18px); line-height: 1.6; color: var(--ink-700); max-width: 33em; margin: 0 0 28px; }
.lp-cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 26px; }
.lp-trust { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.lp-trust-item { display: inline-flex; align-items: center; gap: 7px; font-family: ${F}; font-weight: 600; font-size: 13.5px; color: var(--ink-700); }
.lp-trust-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--ink-300); }

/* hero art */
.lp-hero-art { position: relative; min-height: 340px; display: flex; align-items: center; justify-content: center; }
.lp-story { width: 208px; aspect-ratio: 9 / 15.4; border-radius: 26px; background: var(--card-lilac); border: 1px solid rgba(255,255,255,.7); box-shadow: var(--shadow-lg); padding: 14px; display: flex; flex-direction: column; }
.lp-story-top { display: flex; align-items: center; gap: 8px; }
.lp-story-ring { width: 26px; height: 26px; border-radius: 50%; background: var(--primary-grad); display: grid; place-items: center; box-shadow: var(--shadow-primary); }
.lp-story-dot { width: 18px; height: 18px; border-radius: 50%; background: #fff; }
.lp-story-name { font-family: ${F}; font-weight: 600; font-size: 12px; color: var(--ink-900); }
.lp-story-tag { margin-left: auto; font-family: ${F}; font-weight: 700; font-size: 10px; color: var(--primary-500); background: rgba(255,255,255,.7); padding: 3px 8px; border-radius: 999px; }
.lp-story-body { flex: 1; display: grid; place-items: center; color: rgba(110,98,140,.5); margin: 12px 0; }
.lp-story-foot { display: inline-flex; align-items: center; gap: 6px; align-self: stretch; justify-content: center; font-family: ${F}; font-weight: 600; font-size: 11px; color: #fff; background: var(--green-grad); padding: 8px; border-radius: 12px; box-shadow: var(--shadow-green); }
.lp-chip { position: absolute; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,.9); border: 1px solid var(--line); border-radius: 15px; box-shadow: var(--shadow-md); padding: 11px 13px; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.lp-chip { top: 30px; right: 0; }
.lp-chip-2 { top: auto; bottom: 36px; left: 0; right: auto; }
.lp-chip-ic { width: 30px; height: 30px; border-radius: 9px; background: var(--primary-100); color: var(--primary-500); display: grid; place-items: center; flex: 0 0 auto; }
.lp-chip-ic-tg { background: #ECE3F7; color: #8B6FB0; }
.lp-chip-t { font-family: ${F}; font-weight: 600; font-size: 12.5px; color: var(--ink-900); }
.lp-chip-s { font-family: ${F}; font-weight: 500; font-size: 11px; color: var(--ink-500); margin-top: 1px; }

/* sections */
.lp-section { padding: 56px 2px; }
.lp-eyebrow { font-family: ${F}; font-weight: 600; font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--primary-500); margin-bottom: 10px; }
.lp-h2 { font-family: ${F}; font-weight: 800; font-size: clamp(26px, 3.4vw, 36px); letter-spacing: -0.02em; color: var(--ink-900); margin: 0 0 28px; }

/* bento */
.lp-bento { display: grid; grid-template-columns: 1fr; gap: 16px; }
.lp-card { background: rgba(255,255,255,.82); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); padding: 22px; transition: transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s; }
.lp-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
.lp-card-ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; margin-bottom: 14px; }
.lp-card-t { font-family: ${F}; font-weight: 700; font-size: 17px; color: var(--ink-900); margin: 0 0 6px; }
.lp-card-b { font-family: ${F}; font-weight: 400; font-size: 14px; line-height: 1.55; color: var(--ink-500); margin: 0; }
.lp-card-big { display: flex; flex-direction: column; }
.lp-card-plats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 18px; }
.lp-pill { display: inline-flex; align-items: center; gap: 6px; font-family: ${F}; font-weight: 600; font-size: 12px; color: var(--ink-700); background: rgba(255,255,255,.7); border: 1px solid var(--line); padding: 6px 11px; border-radius: 999px; }
.lp-spark { width: 100%; height: 34px; margin-top: 14px; display: block; }

/* steps */
.lp-steps { display: grid; grid-template-columns: 1fr; gap: 16px; }
.lp-step { position: relative; background: rgba(255,255,255,.7); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 24px; }
.lp-step-n { font-family: ${F}; font-weight: 800; font-size: 30px; letter-spacing: -0.02em; color: var(--primary-300); margin-bottom: 12px; }
.lp-step-t { font-family: ${F}; font-weight: 700; font-size: 17px; color: var(--ink-900); margin: 0 0 6px; }
.lp-step-b { font-family: ${F}; font-weight: 400; font-size: 14px; line-height: 1.55; color: var(--ink-500); margin: 0; }
.lp-step-arrow { display: none; }

/* final CTA */
.lp-final { text-align: center; margin: 24px 2px 64px; padding: 56px 28px; border-radius: var(--r-xl); background: var(--card-yellow); border: 1px solid rgba(255,255,255,.7); box-shadow: var(--shadow-md); }
.lp-final-h { font-family: ${F}; font-weight: 800; font-size: clamp(24px, 3.4vw, 34px); letter-spacing: -0.02em; color: var(--ink-900); margin: 0 0 10px; }
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
@keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
.lp-up { animation: lpUp .6s cubic-bezier(.2,.8,.2,1) both; }
.lp-float { animation: lpFloat 5.5s ease-in-out infinite; }

/* desktop */
@media (min-width: 860px) {
  .lp-wrap { padding: 0 40px; }
  .lp-hero { grid-template-columns: 1.05fr .95fr; gap: 56px; padding: 56px 2px 40px; }
  .lp-bento { grid-template-columns: repeat(6, 1fr); grid-auto-rows: 1fr; }
  .lp-card-big { grid-column: span 3; grid-row: span 2; }
  .lp-bento > .lp-card:nth-child(2), .lp-bento > .lp-card:nth-child(3) { grid-column: span 3; }
  .lp-bento > .lp-card:nth-child(4), .lp-bento > .lp-card:nth-child(5), .lp-bento > .lp-card:nth-child(6) { grid-column: span 2; }
  .lp-steps { grid-template-columns: repeat(3, 1fr); gap: 22px; }
  .lp-step-arrow { display: grid; place-items: center; position: absolute; top: 50%; right: -16px; transform: translateY(-50%); color: var(--ink-300); z-index: 2; }
  .lp-footer { grid-template-columns: 1.2fr 2fr; align-items: start; }
  .lp-foot-base { grid-column: 1 / -1; border-top: 1px solid var(--line); margin-top: 6px; }
}

@media (prefers-reduced-motion: reduce) {
  .lp-up, .lp-float { animation: none; }
}
`;
