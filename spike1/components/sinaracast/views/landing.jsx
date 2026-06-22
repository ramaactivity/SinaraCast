"use client";
import { useRef } from "react";
import Image from "next/image";
import { Icons } from "../icons";
import { Button, PlatIcon } from "../ui";
import { useLandingMotion } from "../landing/useLandingMotion";
import { BrandBumper } from "../landing/BrandBumper";
import blur from "../landing/blur.json";

// Public marketing landing at "/" for logged-out visitors. Rendered OUTSIDE #sc-stage
// (SinaraCast.jsx) so it uses native window scroll driven by GSAP + Lenis. Client-as-
// hero narrative; audience = creators + creative folks + UMKM/business/agencies.
const F = "var(--font)";

const CATS = ["Konten kreator", "Kafe & resto", "Katering", "Photobooth", "Fashion & UMKM", "Agensi sosmed"];

const SHOWCASE = [
  { plat: "instagram", tag: "Story", img: "showcase-story", cap: "Sapaan harian, tayang sendiri tiap pagi." },
  { plat: "instagram", tag: "Reels", img: "showcase-reels", cap: "Reels mingguan tanpa pernah lupa." },
  { plat: "instagram", tag: "Feed", img: "showcase-feed", cap: "Feed rapi & konsisten, tanpa diurus." },
  { plat: "tiktok", tag: "TikTok", img: "showcase-tiktok", cap: "Video TikTok terjadwal, jalan otomatis." },
];

const STATS = [
  { n: 1, suffix: "×", label: "atur, lalu terus jalan", c: "var(--primary-500)" },
  { n: 60, suffix: " dtk", label: "mesin cek sekali", c: "var(--primary-500)" },
  { n: 2, suffix: "", label: "Instagram & TikTok", c: "var(--primary-500)" },
  { n: 0, suffix: "", label: "posting dobel, dijamin", c: "var(--green-500)" },
];

const SAFE = [
  { icon: <Icons.link size={17} sw={2} />, t: "Login resmi platform", b: "Lewat OAuth resmi Instagram & TikTok." },
  { icon: <Icons.check size={17} sw={2.4} />, t: "Token terenkripsi", b: "Akses terpisah per pengguna." },
  { icon: <Icons.eye size={17} sw={2} />, t: "Tanpa kata sandi", b: "Password sosialmu tak pernah disimpan." },
  { icon: <Icons.trash size={17} sw={2} />, t: "Kontrol penuh", b: "Putuskan atau hapus data kapan saja." },
];

const STEPS = [
  { n: "01", title: "Sambungkan akun", body: "Hubungkan Instagram atau TikTok-mu sekali, lewat login resmi.", icon: <Icons.link size={17} sw={2} /> },
  { n: "02", title: "Atur jadwal", body: "Unggah gambar/video, tulis caption, pilih waktu (WIB).", icon: <Icons.calendar size={17} sw={2} /> },
  { n: "03", title: "Biarkan jalan", body: "Terbit otomatis tepat waktu, dan mengabari kalau perlu.", icon: <Icons.power size={17} sw={2} /> },
];

const FAQ = [
  { q: "Akun apa yang bisa disambungkan?", a: "Akun Instagram dan TikTok profesional (Business atau Creator). Akun pribadi belum bisa untuk publikasi otomatis, ini batasan platform." },
  { q: "Apakah akun saya aman?", a: "Ya. Kamu menyambungkan lewat login resmi platform, kami tak pernah menyimpan kata sandimu, dan token disimpan terenkripsi dengan akses terpisah per pengguna." },
  { q: "Berapa biayanya?", a: "Saat ini gratis untuk memulai selama masa awal." },
  { q: "Bisa berapa akun dan brand?", a: "Banyak. Tiap akun dan brand dikelola terpisah dan rapi, tanpa tercampur." },
  { q: "Kalau ada yang gagal terbit?", a: "Mesin mencoba lagi otomatis, dan kamu langsung dikabari lewat Telegram. Tidak pernah ada posting dobel." },
];

const Logo = ({ size = 36 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.31), background: "var(--primary-grad)", boxShadow: "var(--shadow-primary)", display: "grid", placeItems: "center", color: "#fff" }}>
      <Icons.grid size={size * 0.52} sw={2} />
    </div>
    <span style={{ fontFamily: F, fontWeight: 700, fontSize: size * 0.52, letterSpacing: "-0.01em", color: "var(--ink-900)" }}>SinaraCast</span>
  </div>
);

const SchedRow = ({ plat, label, who, time, tone }) => (
  <div className="lp-srow">
    <span className="lp-srow-ic" style={{ background: tone[0], color: tone[1] }}><PlatIcon p={plat} size={14} color={plat === "tiktok" ? tone[1] : undefined} /></span>
    <div className="lp-srow-mid"><div className="lp-srow-t">{label} <span className="lp-srow-who">{who}</span></div></div>
    <span className="lp-srow-time">{time}</span>
  </div>
);

export function Landing({ onMasuk }) {
  const rootRef = useRef(null);
  const motion = useLandingMotion(rootRef);
  const goTo = (sel) => { const fn = motion.current && motion.current.scrollTo; if (fn) fn(sel); else document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const onIntroDone = () => { try { motion.current && motion.current.refresh && motion.current.refresh(); } catch {} };

  return (
    <div className="lp-root" data-lp ref={rootRef}>
      <style>{CSS}</style>
      <span className="lp-progress" data-progress aria-hidden="true" />
      <BrandBumper onDone={onIntroDone} />
      <div className="lp-wrap">

        <header className="lp-nav" data-nav>
          <Logo size={34} />
          <div className="lp-nav-act">
            <a href="#lp-how" onClick={(e) => { e.preventDefault(); goTo("#lp-how"); }} className="lp-navlink">Cara kerja</a>
            <a href="#lp-faq" onClick={(e) => { e.preventDefault(); goTo("#lp-faq"); }} className="lp-navlink lp-navlink-hide">FAQ</a>
            <Button variant="amber" size="sm" onClick={onMasuk} icon={<Icons.user size={15} sw={2} />}>Masuk</Button>
          </div>
        </header>

        {/* hero */}
        <section className="lp-hero" data-parallax-scope data-tilt-scope>
          <span className="lp-glow" data-parallax="0.32" aria-hidden="true" />
          <div className="lp-hero-copy lp-up">
            <div className="lp-overline">Untuk kreator, UMKM & tim kreatif Indonesia</div>
            <h1 className="lp-h1">Media sosialmu,<br /><span className="lp-h1-accent">jalan sendiri.</span></h1>
            <p className="lp-lead">
              Kamu punya karya dan bisnis untuk diurus, bukan feed yang harus dijaga tiap
              hari. SinaraCast menjaga Instagram & TikTok-mu tetap tayang otomatis, jadi kamu
              bisa kembali fokus berkarya.
            </p>
            <div className="lp-cta-row">
              <Button variant="amber" size="lg" data-magnetic onClick={onMasuk} icon={<Icons.user size={17} sw={2} />}>Mulai sekarang</Button>
              <Button variant="secondary" size="lg" data-magnetic onClick={() => goTo("#lp-how")} icon={<Icons.play size={15} />}>Lihat cara kerja</Button>
            </div>
            <div className="lp-trust">
              <span className="lp-trust-item"><PlatIcon p="instagram" size={16} /> Instagram</span>
              <span className="lp-trust-dot" />
              <span className="lp-trust-item"><PlatIcon p="tiktok" size={15} color="var(--ink-700)" /> TikTok</span>
              <span className="lp-trust-dot" />
              <span className="lp-trust-item"><Icons.clock size={14} sw={2} /> Waktu WIB</span>
            </div>
          </div>

          <div className="lp-hero-art lp-up" aria-hidden="true">
            <div className="lp-hero-photo" data-parallax="0.08" data-tilt="18" data-imgreveal>
              <Image src="/marketing/hero-context.webp" alt="" fill sizes="(max-width:880px) 60vw, 240px" placeholder="blur" blurDataURL={blur["hero-context"]} style={{ objectFit: "cover" }} />
              <span className="lp-photo-tint" />
            </div>
            <div className="lp-win-wrap" data-parallax="0.14" data-tilt="9">
              <div className="lp-win lp-float">
                <div className="lp-win-bar">
                  <span className="lp-dot" style={{ background: "#F2776E" }} /><span className="lp-dot" style={{ background: "#F4C04C" }} /><span className="lp-dot" style={{ background: "#82CF7E" }} />
                  <span className="lp-win-url"><Icons.grid size={10} sw={2} /> sinaracast</span>
                </div>
                <div className="lp-win-body">
                  <div className="lp-win-head"><span className="lp-win-title">Akan tayang</span><span className="lp-win-wib">WIB</span></div>
                  <SchedRow plat="instagram" label="Story" who="tiska" time="17.00" tone={["var(--primary-100)", "var(--primary-500)"]} />
                  <SchedRow plat="instagram" label="Reels" who="mahakan" time="19.00" tone={["#ECE3F7", "#8B6FB0"]} />
                  <SchedRow plat="tiktok" label="Video" who="outentika" time="besok" tone={["var(--green-100)", "var(--green-500)"]} />
                  <div className="lp-win-foot"><span className="lp-livedot" /> Mesin aktif · cek tiap menit</div>
                </div>
              </div>
            </div>
            <div className="lp-chip lp-chip-tr lp-float" style={{ animationDelay: ".9s" }}>
              <span className="lp-chip-ic" style={{ background: "var(--green-100)", color: "var(--green-500)" }}><Icons.check size={14} sw={2.6} /></span>
              <div><div className="lp-chip-t">Terbit otomatis</div><div className="lp-chip-s">Story · 17.00 WIB</div></div>
            </div>
            <div className="lp-chip lp-chip-bl lp-float" style={{ animationDelay: "1.6s" }}>
              <span className="lp-chip-ic" style={{ background: "#ECE3F7", color: "#8B6FB0" }}><Icons.telegram size={14} sw={2} /></span>
              <div className="lp-chip-t">Semua aman ✓</div>
            </div>
          </div>
        </section>

        {/* social band */}
        <section className="lp-band">
          <span className="lp-band-label" data-reveal>Cocok untuk siapa pun yang sibuk berkarya</span>
          <div className="lp-cats">{CATS.map((c) => <span key={c} className="lp-cat" data-reveal>{c}</span>)}</div>
          <div className="lp-band-trust" data-reveal><Icons.check size={13} sw={2.6} /> Login resmi · token terenkripsi · tanpa simpan kata sandi</div>
        </section>

        {/* pinned horizontal showcase */}
        <section className="lp-show" data-hsection>
          <div className="lp-show-track" data-htrack>
            <div className="lp-show-intro">
              <div className="lp-eyebrow">Satu jadwal</div>
              <h2 className="lp-h2">Semua format,<br />jalan sendiri.</h2>
              <p className="lp-show-sub">Geser, lihat tiap format kontenmu terbit otomatis di waktunya.</p>
            </div>
            {SHOWCASE.map((s) => (
              <article key={s.tag} className="lp-panel" data-cardtilt>
                <div className="lp-panel-photo" data-imgreveal>
                  <Image src={`/marketing/${s.img}.webp`} alt="" fill sizes="260px" placeholder="blur" blurDataURL={blur[s.img]} style={{ objectFit: "cover" }} />
                  <span className="lp-photo-tint" />
                  <span className="lp-panel-tag"><PlatIcon p={s.plat} size={12} color={s.plat === "tiktok" ? "#fff" : undefined} /> {s.tag}</span>
                  <span className="lp-panel-badge"><Icons.check size={11} sw={2.6} /> 17.00 WIB</span>
                </div>
                <p className="lp-panel-cap">{s.cap}</p>
              </article>
            ))}
          </div>
        </section>

        {/* features bento */}
        <section className="lp-section">
          <div className="lp-eyebrow" data-reveal>Yang kamu dapat</div>
          <h2 className="lp-h2" data-reveal>Dibuat untuk berhenti dipegang.</h2>
          <div className="lp-bento">
            <article className="lp-card lp-card-warm" data-reveal data-cardtilt>
              <span className="lp-card-ic" style={{ background: "rgba(255,255,255,.7)", color: "var(--primary-500)" }}><Icons.power size={18} sw={2} /></span>
              <h3 className="lp-card-t">Terbit otomatis</h3>
              <p className="lp-card-b">Story, Feed, Reels, dan TikTok terjadwal. Atur sekali, terus jalan.</p>
              <div className="lp-plats">
                <span className="lp-pill"><PlatIcon p="instagram" size={13} /> Story</span>
                <span className="lp-pill"><PlatIcon p="instagram" size={13} /> Reels</span>
                <span className="lp-pill"><PlatIcon p="instagram" size={13} /> Feed</span>
                <span className="lp-pill"><PlatIcon p="tiktok" size={12} color="var(--ink-700)" /> Video</span>
              </div>
            </article>
            <article className="lp-card" data-reveal data-cardtilt>
              <span className="lp-card-ic" style={{ background: "var(--green-100)", color: "var(--green-500)" }}><Icons.calendar size={17} sw={2} /></span>
              <h3 className="lp-card-t">Kalender konten</h3>
              <p className="lp-card-b">Semua yang akan tayang dalam satu layar tenang.</p>
              <div className="lp-minical">{Array.from({ length: 21 }).map((_, i) => { const m = i === 7 ? "a" : i === 10 ? "m" : i === 15 ? "g" : null; return <span key={i} className={`lp-cell${m ? " lp-cell-" + m : ""}`} />; })}</div>
            </article>
            <article className="lp-card lp-card-lilac" data-reveal data-cardtilt>
              <span className="lp-card-ic" style={{ background: "rgba(255,255,255,.7)", color: "#8B6FB0" }}><Icons.telegram size={17} sw={2} /></span>
              <h3 className="lp-card-t">Lapor sendiri</h3>
              <p className="lp-card-b">Kamu cuma dikabari kalau perlu, lewat Telegram. Tenang, tak perlu dipelototi.</p>
            </article>
            <article className="lp-card" data-reveal data-cardtilt>
              <span className="lp-card-ic" style={{ background: "var(--green-100)", color: "var(--green-500)" }}><Icons.activity size={17} sw={2} /></span>
              <h3 className="lp-card-t">Metrik otomatis</h3>
              <p className="lp-card-b">Tahu performa tiap posting tanpa buka aplikasi sosialmu.</p>
              <svg className="lp-spark" viewBox="0 0 120 26" preserveAspectRatio="none"><polyline points="0,22 18,18 34,20 52,11 70,14 88,6 104,9 120,3" fill="none" stroke="var(--green-500)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </article>
            <article className="lp-card" data-reveal data-cardtilt>
              <span className="lp-card-ic" style={{ background: "var(--primary-100)", color: "var(--primary-500)" }}><Icons.layers size={17} sw={2} /></span>
              <h3 className="lp-card-t">Banyak akun & brand</h3>
              <p className="lp-card-b">Kelola beberapa akun sekaligus, masing-masing terpisah rapi.</p>
            </article>
            <article className="lp-card" data-reveal data-cardtilt>
              <span className="lp-card-ic" style={{ background: "var(--green-100)", color: "var(--green-500)" }}><Icons.check size={17} sw={2.4} /></span>
              <h3 className="lp-card-t">Tidak pernah dobel</h3>
              <p className="lp-card-b">Mesin andal: tak posting dua kali, coba lagi sendiri kalau gagal.</p>
            </article>
          </div>
        </section>

        {/* honest numbers band */}
        <section className="lp-stats" data-reveal>
          {STATS.map((s) => (
            <div key={s.label} className="lp-stat">
              <div className="lp-stat-n" style={{ color: s.c }}><span data-count={s.n} data-snap="1">0</span>{s.suffix}</div>
              <div className="lp-stat-l">{s.label}</div>
            </div>
          ))}
        </section>

        {/* tenang & aman */}
        <section className="lp-section">
          <div className="lp-eyebrow" data-reveal>Tenang & aman</div>
          <h2 className="lp-h2" data-reveal>Datamu, kendalimu.</h2>
          <div className="lp-safe">
            {SAFE.map((s) => (
              <div key={s.t} className="lp-safe-item" data-reveal data-cardtilt>
                <span className="lp-safe-ic">{s.icon}</span>
                <div><div className="lp-safe-t">{s.t}</div><p className="lp-safe-b">{s.b}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="lp-section" id="lp-how">
          <div className="lp-eyebrow" data-reveal>Cara kerja</div>
          <h2 className="lp-h2" data-reveal>Tiga langkah, lalu lupakan.</h2>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-step" data-reveal data-cardtilt>
                <div className="lp-step-top"><span className="lp-step-n">{s.n}</span><span className="lp-step-ic">{s.icon}</span></div>
                <h3 className="lp-step-t">{s.title}</h3>
                <p className="lp-step-b">{s.body}</p>
                {i < STEPS.length - 1 && <span className="lp-step-arrow"><Icons.chevRight size={16} /></span>}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-section" id="lp-faq">
          <div className="lp-eyebrow" data-reveal>Pertanyaan umum</div>
          <h2 className="lp-h2" data-reveal>Yang biasanya ditanyakan.</h2>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <div key={f.q} className="lp-faq-item" data-reveal>
                <div className="lp-faq-q"><span className="lp-faq-mark">?</span>{f.q}</div>
                <p className="lp-faq-a">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* closing CTA */}
        <section className="lp-final" data-reveal>
          <h2 className="lp-final-h">Kembali fokus berkarya.</h2>
          <p className="lp-final-p">Urus hal yang penting buat kamu. Biar kontenmu yang jalan sendiri.</p>
          <Button variant="amber" size="lg" data-magnetic onClick={onMasuk} icon={<Icons.user size={17} sw={2} />}>Masuk ke SinaraCast</Button>
        </section>

        {/* footer */}
        <footer className="lp-footer">
          <div className="lp-foot-brand">
            <Logo size={30} />
            <p className="lp-foot-tag">Media sosial yang jalan sendiri. Untuk kreator, UMKM & tim kreatif di Indonesia.</p>
          </div>
          <div className="lp-foot-links">
            <div className="lp-foot-col">
              <div className="lp-foot-h">Produk</div>
              <button className="lp-foot-a" onClick={onMasuk}>Masuk</button>
              <a className="lp-foot-a" href="#lp-how" onClick={(e) => { e.preventDefault(); goTo("#lp-how"); }}>Cara kerja</a>
              <a className="lp-foot-a" href="#lp-faq" onClick={(e) => { e.preventDefault(); goTo("#lp-faq"); }}>FAQ</a>
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
.lp-root { overflow-x: hidden; }
.lp-wrap { max-width: 1320px; margin: 0 auto; padding: 0 22px; }
.lp-root a { text-decoration: none; }
.lp-progress { position: fixed; top: 0; left: 0; height: 3px; width: 100%; transform: scaleX(0); transform-origin: left center; background: var(--primary-grad); z-index: 60; pointer-events: none; }

/* nav */
.lp-nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: calc(14px + env(safe-area-inset-top)) 6px 12px; transition: background .25s, box-shadow .25s, padding .25s; }
.lp-nav-solid { background: rgba(255,255,255,.72); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: var(--shadow-sm); padding: calc(9px + env(safe-area-inset-top)) 18px 9px; margin: 0 -14px; border-radius: 0 0 16px 16px; }
.lp-nav-act { display: flex; align-items: center; gap: 18px; }
.lp-navlink { font-family: ${F}; font-weight: 600; font-size: 13.5px; color: var(--ink-500); transition: color .15s; }
.lp-navlink:hover { color: var(--ink-900); }
.lp-navlink-hide { display: none; }

/* hero */
.lp-hero { position: relative; display: grid; grid-template-columns: 1fr; gap: 32px; align-items: center; padding: 30px 6px 26px; }
.lp-glow { position: absolute; top: -50px; left: -80px; width: 520px; height: 420px; background: radial-gradient(circle at 32% 32%, rgba(249,168,38,.20), transparent 62%); filter: blur(36px); pointer-events: none; z-index: 0; }
.lp-hero-copy, .lp-hero-art { position: relative; z-index: 1; }
.lp-overline { font-family: ${F}; font-weight: 600; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--primary-500); margin-bottom: 14px; }
.lp-h1 { font-family: ${F}; font-weight: 800; font-size: clamp(33px, 5vw, 52px); line-height: 1.03; letter-spacing: -0.03em; color: var(--ink-900); margin: 0 0 16px; }
.lp-h1-accent { color: var(--primary-500); }
.lp-lead { font-family: ${F}; font-weight: 400; font-size: clamp(14.5px, 1.4vw, 16.5px); line-height: 1.6; color: var(--ink-700); max-width: 32em; margin: 0 0 24px; }
.lp-cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }
.lp-trust { display: flex; align-items: center; gap: 13px; flex-wrap: wrap; }
.lp-trust-item { display: inline-flex; align-items: center; gap: 7px; font-family: ${F}; font-weight: 600; font-size: 13px; color: var(--ink-700); }
.lp-trust-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--ink-300); }

/* hero art */
.lp-hero-art { position: relative; min-height: 320px; display: flex; align-items: center; justify-content: center; }
.lp-hero-photo { position: absolute; width: 186px; height: 232px; border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-lg); transform: rotate(-5deg); top: 14px; left: 6%; border: 5px solid #fff; will-change: transform; }
.lp-photo-tint { position: absolute; inset: 0; background: linear-gradient(150deg, rgba(249,168,38,.15), rgba(140,111,176,.15) 60%, rgba(95,190,107,.1)); }
.lp-win-wrap { position: relative; z-index: 2; will-change: transform; }
.lp-win { width: min(326px, 84vw); background: rgba(255,255,255,.93); border: 1px solid rgba(255,255,255,.85); border-radius: 18px; box-shadow: var(--shadow-lg); overflow: hidden; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.lp-win-bar { display: flex; align-items: center; gap: 6px; padding: 10px 13px; border-bottom: 1px solid var(--line); }
.lp-dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
.lp-win-url { margin-left: 7px; display: inline-flex; align-items: center; gap: 5px; font-family: ${F}; font-weight: 500; font-size: 11px; color: var(--ink-400); background: rgba(140,144,158,.1); padding: 4px 10px; border-radius: 999px; }
.lp-win-body { padding: 14px; }
.lp-win-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; }
.lp-win-title { font-family: ${F}; font-weight: 700; font-size: 14px; color: var(--ink-900); }
.lp-win-wib { font-family: ${F}; font-weight: 600; font-size: 10px; color: var(--ink-400); background: rgba(140,144,158,.1); padding: 3px 8px; border-radius: 999px; }
.lp-srow { display: flex; align-items: center; gap: 10px; padding: 9px; border-radius: 12px; background: rgba(255,255,255,.6); border: 1px solid var(--line); margin-bottom: 7px; }
.lp-srow-ic { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: 0 0 auto; }
.lp-srow-mid { flex: 1; min-width: 0; }
.lp-srow-t { font-family: ${F}; font-weight: 600; font-size: 12.5px; color: var(--ink-900); }
.lp-srow-who { font-weight: 500; color: var(--ink-400); }
.lp-srow-time { font-family: ${F}; font-weight: 700; font-size: 10.5px; color: var(--primary-500); background: var(--primary-100); padding: 4px 9px; border-radius: 999px; flex: 0 0 auto; }
.lp-win-foot { display: flex; align-items: center; gap: 6px; margin-top: 3px; padding: 3px 2px; font-family: ${F}; font-weight: 600; font-size: 11px; color: var(--ink-500); }
.lp-livedot { width: 6px; height: 6px; border-radius: 50%; background: var(--green-500); box-shadow: 0 0 0 4px rgba(95,190,107,.18); }
.lp-chip { position: absolute; display: flex; align-items: center; gap: 9px; background: rgba(255,255,255,.95); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-md); padding: 9px 12px; z-index: 3; }
.lp-chip-tr { top: 4px; right: -4px; }
.lp-chip-bl { bottom: 18px; left: -6px; }
.lp-chip-ic { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex: 0 0 auto; }
.lp-chip-t { font-family: ${F}; font-weight: 600; font-size: 12px; color: var(--ink-900); }
.lp-chip-s { font-family: ${F}; font-weight: 500; font-size: 10.5px; color: var(--ink-500); margin-top: 1px; }

/* social band */
.lp-band { text-align: center; padding: 22px 6px 4px; }
.lp-band-label { display: inline-block; font-family: ${F}; font-weight: 600; font-size: 11.5px; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-400); }
.lp-cats { display: flex; flex-wrap: wrap; gap: 9px; justify-content: center; margin-top: 13px; }
.lp-cat { font-family: ${F}; font-weight: 600; font-size: 13px; color: var(--ink-700); background: rgba(255,255,255,.7); border: 1px solid var(--line); padding: 8px 14px; border-radius: 999px; transition: transform .2s, box-shadow .2s, color .2s; }
.lp-cat:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); color: var(--primary-500); }
.lp-band-trust { display: inline-flex; align-items: center; gap: 7px; margin-top: 16px; font-family: ${F}; font-weight: 500; font-size: 12px; color: var(--green-500); }

/* horizontal showcase — full-bleed (breaks out of the centered container) */
.lp-show { padding: 50px 0 44px; overflow: hidden; width: 100vw; margin-left: calc(50% - 50vw); }
.lp-show-track { display: flex; gap: 20px; align-items: center; padding: 0 5vw; }
.lp-show-intro { flex: 0 0 auto; width: min(340px, 78vw); padding-right: 8px; }
.lp-show-sub { font-family: ${F}; font-weight: 400; font-size: 14px; line-height: 1.55; color: var(--ink-500); margin: 12px 0 0; }
.lp-panel { flex: 0 0 auto; width: 220px; }
.lp-panel-photo { position: relative; width: 220px; height: 391px; border-radius: 22px; overflow: hidden; box-shadow: var(--shadow-lg); border: 1px solid rgba(255,255,255,.7); will-change: clip-path; }
.lp-panel-tag { position: absolute; top: 11px; left: 11px; display: inline-flex; align-items: center; gap: 5px; font-family: ${F}; font-weight: 700; font-size: 11px; color: #fff; background: rgba(0,0,0,.34); backdrop-filter: blur(4px); padding: 5px 10px; border-radius: 999px; }
.lp-panel-badge { position: absolute; bottom: 11px; left: 11px; right: 11px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-family: ${F}; font-weight: 700; font-size: 11px; color: #fff; background: var(--green-grad); padding: 7px; border-radius: 11px; box-shadow: var(--shadow-green); }
.lp-panel-cap { font-family: ${F}; font-weight: 500; font-size: 12.5px; line-height: 1.5; color: var(--ink-700); margin: 12px 4px 0; }

/* sections */
.lp-section { padding: 46px 6px; }
.lp-eyebrow { font-family: ${F}; font-weight: 600; font-size: 12px; letter-spacing: .05em; text-transform: uppercase; color: var(--primary-500); margin-bottom: 9px; }
.lp-h2 { font-family: ${F}; font-weight: 800; font-size: clamp(24px, 3.2vw, 33px); letter-spacing: -0.025em; color: var(--ink-900); margin: 0 0 24px; }

/* bento */
.lp-bento { display: grid; grid-template-columns: 1fr; gap: 14px; }
.lp-card { background: rgba(255,255,255,.82); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); padding: 18px; display: flex; flex-direction: column; }
.lp-card:hover { box-shadow: var(--shadow-md); }
.lp-card-warm { background: var(--card-yellow); border-color: rgba(255,255,255,.7); }
.lp-card-lilac { background: var(--card-lilac); border-color: rgba(255,255,255,.7); }
.lp-card-ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; margin-bottom: 12px; flex: 0 0 auto; }
.lp-card-t { font-family: ${F}; font-weight: 700; font-size: 16px; color: var(--ink-900); margin: 0 0 5px; }
.lp-card-b { font-family: ${F}; font-weight: 400; font-size: 13.5px; line-height: 1.5; color: var(--ink-500); margin: 0; }
.lp-card-warm .lp-card-b, .lp-card-lilac .lp-card-b { color: var(--ink-700); }
.lp-plats { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
.lp-pill { display: inline-flex; align-items: center; gap: 5px; font-family: ${F}; font-weight: 600; font-size: 11.5px; color: var(--ink-700); background: rgba(255,255,255,.7); border: 1px solid var(--line); padding: 5px 10px; border-radius: 999px; }
.lp-minical { margin-top: 14px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.lp-cell { aspect-ratio: 1; border-radius: 4px; background: rgba(140,144,158,.12); }
.lp-cell-a { background: var(--primary-400); }
.lp-cell-m { background: #BFA6E0; }
.lp-cell-g { background: var(--green-400); }
.lp-spark { width: 100%; height: 26px; display: block; margin-top: 14px; }

/* stats band */
.lp-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 10px 6px; padding: 30px 24px; border-radius: var(--r-xl); background: rgba(255,255,255,.62); border: 1px solid var(--line); box-shadow: var(--shadow-sm); text-align: center; }
.lp-stat-n { font-family: ${F}; font-weight: 800; font-size: clamp(30px, 4vw, 40px); letter-spacing: -0.02em; line-height: 1; }
.lp-stat-l { font-family: ${F}; font-weight: 500; font-size: 12.5px; color: var(--ink-500); margin-top: 7px; }

/* tenang & aman */
.lp-safe { display: grid; grid-template-columns: 1fr; gap: 12px; }
.lp-safe-item { display: flex; gap: 12px; background: rgba(255,255,255,.72); border: 1px solid var(--line); border-radius: var(--r-md); padding: 16px 18px; box-shadow: var(--shadow-sm); }
.lp-safe-ic { width: 36px; height: 36px; border-radius: 10px; flex: 0 0 auto; display: grid; place-items: center; background: var(--green-100); color: var(--green-500); }
.lp-safe-t { font-family: ${F}; font-weight: 700; font-size: 14.5px; color: var(--ink-900); margin-bottom: 3px; }
.lp-safe-b { font-family: ${F}; font-weight: 400; font-size: 13px; line-height: 1.5; color: var(--ink-500); margin: 0; }

/* steps */
.lp-steps { display: grid; grid-template-columns: 1fr; gap: 14px; }
.lp-step { position: relative; background: rgba(255,255,255,.82); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 20px; box-shadow: var(--shadow-sm); }
.lp-step-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.lp-step-n { font-family: ${F}; font-weight: 800; font-size: 26px; letter-spacing: -0.02em; color: var(--primary-500); }
.lp-step-ic { width: 34px; height: 34px; border-radius: 10px; background: var(--primary-100); color: var(--primary-500); display: grid; place-items: center; }
.lp-step-t { font-family: ${F}; font-weight: 700; font-size: 16px; color: var(--ink-900); margin: 0 0 5px; }
.lp-step-b { font-family: ${F}; font-weight: 400; font-size: 13.5px; line-height: 1.5; color: var(--ink-500); margin: 0; }
.lp-step-arrow { display: none; }

/* FAQ */
.lp-faq { display: grid; grid-template-columns: 1fr; gap: 12px; }
.lp-faq-item { background: rgba(255,255,255,.7); border: 1px solid var(--line); border-radius: var(--r-md); padding: 17px 19px; transition: box-shadow .2s, transform .2s; }
.lp-faq-item:hover { box-shadow: var(--shadow-sm); transform: translateY(-2px); }
.lp-faq-q { display: flex; align-items: center; gap: 9px; font-family: ${F}; font-weight: 700; font-size: 14.5px; color: var(--ink-900); margin-bottom: 6px; }
.lp-faq-mark { width: 21px; height: 21px; border-radius: 7px; background: var(--primary-100); color: var(--primary-500); display: grid; place-items: center; font-size: 12px; font-weight: 800; flex: 0 0 auto; }
.lp-faq-a { font-family: ${F}; font-weight: 400; font-size: 13px; line-height: 1.55; color: var(--ink-500); margin: 0; padding-left: 30px; }

/* final CTA */
.lp-final { text-align: center; margin: 22px 6px 54px; padding: 46px 26px; border-radius: var(--r-xl); background: var(--card-yellow); border: 1px solid rgba(255,255,255,.7); box-shadow: var(--shadow-md); }
.lp-final-h { font-family: ${F}; font-weight: 800; font-size: clamp(24px, 3.4vw, 33px); letter-spacing: -0.025em; color: var(--ink-900); margin: 0 0 9px; }
.lp-final-p { font-family: ${F}; font-weight: 400; font-size: 15px; line-height: 1.55; color: var(--ink-700); margin: 0 auto 22px; max-width: 30em; }

/* footer */
.lp-footer { display: grid; grid-template-columns: 1fr; gap: 28px; padding: 36px 6px calc(36px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); }
.lp-foot-tag { font-family: ${F}; font-weight: 400; font-size: 13px; line-height: 1.55; color: var(--ink-500); margin: 13px 0 0; max-width: 26em; }
.lp-foot-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.lp-foot-h { font-family: ${F}; font-weight: 700; font-size: 11.5px; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-400); margin-bottom: 11px; }
.lp-foot-a { display: block; font-family: ${F}; font-weight: 500; font-size: 13px; color: var(--ink-700); background: none; border: none; padding: 4px 0; cursor: pointer; text-align: left; transition: color .15s; }
.lp-foot-a:hover { color: var(--primary-500); }
.lp-foot-base { font-family: ${F}; font-size: 12px; color: var(--ink-400); padding-top: 7px; }

/* idle float + fallback entrance */
@keyframes lpUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
.lp-up { animation: lpUp .7s cubic-bezier(.2,.8,.2,1) both; }
.lp-float { animation: lpFloat 6s ease-in-out infinite; }

/* desktop */
@media (min-width: 880px) {
  .lp-wrap { padding: 0 44px; }
  .lp-navlink-hide { display: inline; }
  .lp-hero { grid-template-columns: 1.08fr .92fr; gap: 50px; padding: 44px 6px 40px; }
  .lp-hero-art { min-height: 360px; }
  .lp-hero-photo { width: 210px; height: 262px; left: 0; top: 4px; }
  .lp-show { padding: 0; }
  .lp-show-track { height: 100vh; align-items: center; padding: 0 4.5vw; gap: 28px; }
  .lp-show-intro { width: 360px; }
  .lp-panel { width: 262px; }
  .lp-panel-photo { width: 262px; height: 466px; }
  .lp-bento { grid-template-columns: repeat(3, 1fr); }
  .lp-stats { grid-template-columns: repeat(4, 1fr); padding: 32px; }
  .lp-safe { grid-template-columns: repeat(2, 1fr); }
  .lp-steps { grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .lp-step-arrow { display: grid; place-items: center; position: absolute; top: 50%; right: -14px; transform: translateY(-50%); color: var(--ink-300); z-index: 2; }
  .lp-faq { grid-template-columns: 1fr 1fr; gap: 14px; }
  .lp-footer { grid-template-columns: 1.2fr 2fr; align-items: start; }
  .lp-foot-base { grid-column: 1 / -1; border-top: 1px solid var(--line); margin-top: 4px; }
}

@media (max-width: 879px) {
  .lp-show { padding: 46px 0; }
  .lp-show-track { overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding-bottom: 8px; }
  .lp-show-intro { scroll-snap-align: start; }
  .lp-panel { scroll-snap-align: center; }
}

/* JS armed: hide reveal targets until GSAP animates them in (no flash) */
.lp-armed [data-reveal] { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .lp-up, .lp-float { animation: none; }
  .lp-armed [data-reveal] { opacity: 1; }
}`;
