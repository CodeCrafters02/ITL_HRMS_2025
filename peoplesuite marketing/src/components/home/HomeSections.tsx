"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BENEFITS,
  PRODUCTS,
  TESTIMONIALS,
  type Feature,
  type ProductId,
  type Screen,
  type Slide,
  type Tone,
} from "@/data/showcase";

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
    {name}
  </span>
);

/* ------------------------------ Motion helpers ------------------------------ */

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Auto-advance + mouse drag-to-swipe for a scroll-snap track. Touch swipe is native. */
function useCarouselMotion(ref: React.RefObject<HTMLElement | null>, advance: () => void, ms = 6000) {
  const hold = useRef(false);
  const inView = useRef(true);
  const adv = useRef(advance);
  adv.current = advance;

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const io = new IntersectionObserver(([e]) => (inView.current = e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    const id = window.setInterval(() => {
      if (!hold.current && inView.current && !document.hidden) adv.current();
    }, ms);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [ref, ms]);

  const drag = useRef<{ x: number; left: number } | null>(null);
  return {
    onMouseEnter: () => (hold.current = true),
    onMouseLeave: () => (hold.current = false),
    onFocus: () => (hold.current = true),
    onBlur: () => (hold.current = false),
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      const el = ref.current;
      if (!el || e.pointerType !== "mouse" || (e.target as HTMLElement).closest("button,a,video")) return;
      drag.current = { x: e.clientX, left: el.scrollLeft };
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      el.style.cursor = "grabbing";
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const el = ref.current;
      if (el && drag.current) el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
    },
    onPointerUp: () => endDrag(),
    onPointerLeave: () => endDrag(),
  };

  function endDrag() {
    const el = ref.current;
    if (!el || !drag.current) return;
    drag.current = null;
    el.style.cursor = "";
    el.style.scrollSnapType = "";
    el.style.scrollBehavior = "";
  }
}

/** Fade/slide children in once they scroll into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

/** Headline whose words rise in one after another. */
export function WordReveal({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="word-in" style={{ animationDelay: `${i * 90}ms` }}>
          {w}&nbsp;
        </span>
      ))}
    </span>
  );
}

/** Number that counts up once on mount. */
export function CountUp({ to, ms = 1200 }: { to: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return setN(to);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{n}</>;
}

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");
const AVATAR_BG = ["#1E1AB8", "#0B5BD3", "#4A6CFF", "#141834", "#7DC8FF"];
const Avatar = ({ name, i = 0, size = 22 }: { name: string; i?: number; size?: number }) => (
  <span
    className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
    style={{ width: size, height: size, fontSize: size * 0.4, background: AVATAR_BG[i % AVATAR_BG.length] }}
  >
    {initials(name)}
  </span>
);

const TONE: Record<Tone, string> = {
  ok: "bg-emerald-50 text-emerald-600",
  warn: "bg-amber-50 text-amber-600",
  info: "bg-[#EAF0FF] text-[#0B5BD3]",
};

/* ------------------------------ Mock app frame ------------------------------ */

function AppFrame({
  brand,
  nav,
  active = 0,
  title,
  children,
}: {
  brand: string;
  nav: string[];
  active?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl bg-white text-[#0B0F2E]">
      <aside className="hidden w-[26%] max-w-[170px] shrink-0 flex-col gap-1 bg-[#141834] p-3 text-[9px] text-[#9AA3D1] sm:flex md:text-[10px]">
        <div className="mb-2 flex items-center gap-1.5 font-bold text-white">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-[#4A6CFF] text-[8px]">{brand[0]}</span>
          {brand}
        </div>
        {nav.map((n, i) => (
          <div key={n} className={`rounded-md px-2 py-1.5 ${i === active ? "bg-[#1E1AB8] font-semibold text-white" : ""}`}>
            {n}
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 bg-[#F5F8FF] p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold md:text-sm">{title}</div>
          <span className="rounded-md border border-[#DCE4F5] bg-white px-2 py-0.5 text-[8px] text-[#5B6488] md:text-[9px]">This Month</span>
        </div>
        {children}
      </div>
    </div>
  );
}

const Card = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <div className={`rounded-lg border border-[#DCE4F5] bg-white p-2.5 ${className}`}>{children}</div>
);

function ScreenBody({ screen }: { screen: Screen }) {
  if (screen.kind === "stats") {
    return (
      <>
        <div className="grid grid-cols-4 gap-2">
          {screen.stats.map(([v, l]) => (
            <Card key={l}>
              <div className="text-sm font-bold md:text-lg">{v}</div>
              <div className="text-[8px] text-[#5B6488] md:text-[9px]">{l}</div>
            </Card>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-5 gap-2">
          <Card className="col-span-3 flex flex-col">
            <div className="mb-1 text-[9px] font-semibold md:text-[10px]">{screen.chart ? "Attendance Trend" : "Activity Trend"}</div>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full min-h-[40px] w-full flex-1">
              <polyline
                fill="none"
                stroke="#4A6CFF"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                points={(screen.chart ?? [48, 56, 52, 66, 62, 74, 70, 88]).map((v, i, arr) => `${(i / (arr.length - 1)) * 100},${40 - v * 0.38}`).join(" ")}
              />
            </svg>
          </Card>
          <Card className="col-span-2 flex flex-col gap-2">
            <div className="text-[9px] font-semibold md:text-[10px]">{screen.listTitle}</div>
            {screen.rows.map(([a, b, tone]) => (
              <div key={a} className="flex items-center justify-between gap-2 border-t border-[#EEF2FC] pt-2 text-[9px] md:text-[11px]">
                <span className="truncate text-[#5B6488]">{a}</span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 font-semibold ${tone ? TONE[tone] : "text-[#0B0F2E]"}`}>{b}</span>
              </div>
            ))}
          </Card>
        </div>
      </>
    );
  }
  if (screen.kind === "pipeline") {
    const tints = ["bg-[#EAF0FF] text-[#0B5BD3]", "bg-[#EFEBFF] text-[#1E1AB8]", "bg-emerald-50 text-emerald-700", "bg-amber-50 text-amber-700"];
    return (
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        {screen.cols.map((c, ci) => (
          <div key={c.label} className="flex flex-col gap-1.5">
            <div className={`rounded-md px-2 py-1 text-[9px] font-bold md:text-[10px] ${tints[ci]}`}>
              {c.label} ({c.count})
            </div>
            {c.people.map((p, pi) => (
              <Card key={p} className="flex items-center gap-1.5 !p-1.5 text-[8px] font-medium md:text-[10px]">
                <Avatar name={p} i={ci + pi} />
                <span className="truncate">{p}</span>
              </Card>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (screen.kind === "desks") {
    const state = (i: number) => (i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0);
    const col = ["#1E1AB8", "#4A6CFF", "#DCE4F5"];
    return (
      <div className="grid min-h-0 flex-1 grid-cols-5 gap-2">
        <Card className="col-span-3 flex flex-col">
          <div className="mb-1 text-[9px] font-semibold md:text-[10px]">Floor 2 · Engineering & Ops</div>
          <div className="grid flex-1 grid-cols-8 content-start gap-1">
            {Array.from({ length: 40 }, (_, i) => (
              <span key={i} className="aspect-square rounded-[3px]" style={{ background: col[state(i)] }} />
            ))}
          </div>
        </Card>
        <Card className="col-span-2 space-y-1.5 text-[8px] md:text-[9px]">
          {screen.legend.map(([l, c]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: c }} />
              {l}
            </div>
          ))}
          <div className="pt-1 font-bold text-[#0B5BD3]">{screen.free} hot desks free</div>
          <div className="text-[#5B6488]">{screen.booked} booked today</div>
        </Card>
      </div>
    );
  }
  return (
    <Card className="flex-1 space-y-3 !p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold md:text-xs">{screen.headline}</div>
        <span className="rounded-full bg-[#EAF0FF] px-2 py-0.5 text-[8px] font-bold text-[#0B5BD3] md:text-[9px]">{screen.badge}</span>
      </div>
      {screen.items.map(([l, v]) => (
        <div key={l} className="space-y-1">
          <div className="flex justify-between text-[8px] text-[#5B6488] md:text-[9px]">
            <span>{l}</span>
            <span className="font-bold text-[#0B0F2E]">{v}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#EAF0FF]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1E1AB8] to-[#4A6CFF]" style={{ width: `${v}%` }} />
          </div>
        </div>
      ))}
    </Card>
  );
}

/* --------------------------------- Carousel --------------------------------- */

function ScreenshotCarousel({ slides, brand, nav }: { slides: Slide[]; brand: string; nav: string[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      const n = (i + slides.length) % slides.length;
      el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
    },
    [slides.length],
  );

  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
    setIndex(0);
  }, [slides]);

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const motion = useCarouselMotion(track, () => go(index + 1), 5500);

  const arrow =
    "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#DCE4F5] bg-white text-[#0B0F2E] shadow-sm transition hover:border-[#0B5BD3] hover:text-[#0B5BD3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A6CFF]";

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Product screenshots" className="relative" {...motion}>
      <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className={`${arrow} left-1 lg:-left-5`}>
        <Icon name="chevron_left" className="!text-[20px]" />
      </button>
      <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className={`${arrow} right-1 lg:-right-5`}>
        <Icon name="chevron_right" className="!text-[20px]" />
      </button>

      <div
        ref={track}
        onScroll={onScroll}
        className="flex cursor-grab select-none snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <figure key={s.title} aria-hidden={i !== index} className="m-0 w-full shrink-0 snap-center px-4 pt-2 lg:px-8">
            <div className="rounded-2xl shadow-[0_18px_36px_-18px_rgba(30,26,184,0.35)]">
              <div className="aspect-[16/11] sm:aspect-[16/9.5]">
                <AppFrame brand={brand} nav={nav} active={i % nav.length} title={s.title}>
                  <ScreenBody screen={s.screen} />
                </AppFrame>
              </div>
            </div>
            <figcaption className="mt-3 text-center">
              <div className="text-sm font-bold text-[#0B0F2E]">{s.title}</div>
              <div className="text-xs text-[#5B6488]">{s.desc}</div>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="Choose slide">
        {slides.map((s, i) => (
          <button
            key={s.title}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to ${s.title}`}
            onClick={() => go(i)}
            className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A6CFF] ${
              i === index ? "w-5 bg-[#1E1AB8]" : "w-2 bg-[#C9D3EE] hover:bg-[#9AA3D1]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Hero mock ---------------------------------- */

export function HeroDashboard({ onPlay }: { onPlay: (p: ProductId) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ProductId>("hrms");
  const order: ProductId[] = ["hrms", "ats"];

  const go = (id: ProductId) => {
    const el = track.current;
    if (el) el.scrollTo({ left: order.indexOf(id) * el.clientWidth, behavior: "smooth" });
    setActive(id);
  };
  const onScroll = () => {
    const el = track.current;
    if (el) setActive(order[Math.round(el.scrollLeft / el.clientWidth)] ?? "hrms");
  };
  const motion = useCarouselMotion(track, () => go(active === "hrms" ? "ats" : "hrms"), 6500);

  return (
    <div className="relative" {...motion}>
      <div aria-hidden className="absolute -right-6 -top-8 h-48 w-72 rounded-full bg-[#4A6CFF]/25 blur-2xl" />
      <div aria-hidden className="absolute -bottom-8 -left-10 h-44 w-56 rounded-full bg-[#7DC8FF]/25 blur-2xl" />
      <div className="relative" role="region" aria-roledescription="carousel" aria-label="Product previews">
        <div ref={track} onScroll={onScroll} className="flex cursor-grab select-none snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {order.map((id) => {
            const p = PRODUCTS[id];
            return (
              <div key={id} className="w-full shrink-0 snap-center px-6 pb-8 pt-3">
                <div className="animate-float relative rounded-2xl shadow-[0_18px_36px_-18px_rgba(30,26,184,0.4)]">
                  <div className="aspect-[16/10.5]">
                    {id === "hrms" ? (
                      <AppFrame brand={p.brand} nav={p.sidebar} title="Welcome back, Priya!">
                        <div className="grid grid-cols-3 gap-2">
                          {[["248", "Total Employees"], ["6", "Open Job Openings"], ["5", "Pending Leaves"]].map(([v, l]) => (
                            <Card key={l}>
                              <div className="text-[8px] text-[#5B6488] md:text-[9px]">{l}</div>
                              <div className="text-base font-bold md:text-xl"><CountUp to={Number(v)} /></div>
                            </Card>
                          ))}
                        </div>
                        <div className="grid min-h-0 flex-1 grid-cols-5 gap-2">
                          <Card className="col-span-3 flex flex-col">
                            <div className="mb-1 text-[9px] font-semibold md:text-[10px]">Attendance Overview</div>
                            <div className="flex flex-1 items-end gap-2 px-1">
                              {[55, 78, 64, 92, 70, 84, 96].map((h, i) => (
                                <span key={i} className="grow-bar flex-1 rounded-t bg-gradient-to-t from-[#1E1AB8] to-[#4A6CFF]" style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />
                              ))}
                            </div>
                          </Card>
                          <Card className="col-span-2 space-y-1.5">
                            <div className="text-[9px] font-semibold md:text-[10px]">Upcoming Interviews</div>
                            {["Siddharth Verma", "Sneha Thomas"].map((n, i) => (
                              <div key={n} className="flex items-center gap-1.5 text-[8px] md:text-[9px]">
                                <Avatar name={n} i={i} size={20} />
                                <span className="truncate font-medium">{n}</span>
                              </div>
                            ))}
                          </Card>
                        </div>
                      </AppFrame>
                    ) : (
                      <AppFrame brand={p.brand} nav={p.sidebar} active={3} title={p.slides[0].title}>
                        <ScreenBody screen={p.slides[0].screen} />
                      </AppFrame>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlay(id)}
                    aria-label={`Watch ${p.brand} product tour`}
                    className="absolute left-[56%] top-[56%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#141834]/90 text-white shadow-xl ring-4 ring-white/70 transition hover:scale-105 hover:bg-[#232A4E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6CFF]"
                  >
                    <Icon name="play_arrow" className="!text-[30px]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center gap-2">
          {order.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={`Show ${PRODUCTS[id].brand} preview`}
              onClick={() => go(id)}
              className={`h-2 rounded-full transition-all ${active === id ? "w-5 bg-[#1E1AB8]" : "w-2 bg-[#C9D3EE]"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Switcher + showcase ----------------------------- */

const FeatureRow = ({ f }: { f: Feature }) => (
  <li className="flex items-start gap-4">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-[#1E1AB8]">
      <Icon name={f.icon} className="!text-[22px]" />
    </span>
    <div>
      <div className="text-sm font-bold text-[#0B0F2E]">{f.title}</div>
      <p className="text-xs leading-relaxed text-[#5B6488]">{f.desc}</p>
    </div>
  </li>
);

export function ProductExplorer({ product, onChange }: { product: ProductId; onChange: (p: ProductId) => void }) {
  const p = PRODUCTS[product];
  return (
    <section id="explorer" className="scroll-mt-24 bg-white pb-16 pt-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mx-auto max-w-2xl animate-fade-up text-center" key={`h-${product}`}>
          <h2 className="font-display text-2xl tracking-tight text-[#0B0F2E] md:text-3xl">
            {p.heading[0]}
            <span className="text-shimmer">{p.heading[1]}</span>
            {p.heading[2]}
          </h2>
          <p className="mt-2 text-sm text-[#5B6488]">{p.intro}</p>
        </div>

        <div className="mt-10 grid items-center gap-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <ScreenshotCarousel key={product} slides={p.slides} brand={p.brand} nav={p.sidebar} />
          </div>
          <div className="lg:col-span-4">
            <ul className="space-y-6">
              {p.features.map((f) => (
                <FeatureRow key={f.title} f={f} />
              ))}
            </ul>
            <Link
              href={p.ctaHref}
              className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#1E1AB8] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A6CFF]"
            >
              {p.ctaLabel}
              <Icon name="arrow_forward" className="!text-[18px]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Benefits row -------------------------------- */

export function BenefitsRow() {
  return (
    <section className="bg-white pb-12">
      <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-12">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.title} delay={i * 90}>
          <div
            className="h-full rounded-xl border border-[#DCE4F5] bg-gradient-to-b from-[#F5F8FF] to-white px-5 py-6 text-center transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Icon name={b.icon} className="!text-[28px] text-[#1E1AB8]" />
            <div className="mt-2 text-sm font-bold text-[#0B0F2E]">{b.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-[#5B6488]">{b.desc}</p>
          </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- Video section ------------------------------- */

function VideoPlayer({ product }: { product: ProductId }) {
  const v = PRODUCTS[product].video;
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [notice, setNotice] = useState(false);

  const play = () => {
    if (!v.src) return setNotice(true);
    setStarted(true);
    setTimeout(() => ref.current?.play(), 0);
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#0B0F2E] shadow-2xl">
      {v.src ? (
        <video ref={ref} className="h-full w-full object-cover" controls={started} preload="none" poster={v.poster || undefined} playsInline aria-label={v.title}>
          <source src={v.src} />
          {v.captions && <track kind="captions" src={v.captions} srcLang="en" label="English" default />}
        </video>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#232A4E] to-[#0F1226]">
          <div className="absolute inset-4 opacity-70">
            <AppFrame brand={PRODUCTS[product].brand} nav={PRODUCTS[product].sidebar} title={PRODUCTS[product].slides[0].title}>
              <ScreenBody screen={PRODUCTS[product].slides[0].screen} />
            </AppFrame>
          </div>
        </div>
      )}
      {!started && (
        <button
          type="button"
          onClick={play}
          aria-label={`Play ${v.title}`}
          className="absolute inset-0 flex items-center justify-center bg-[#0B0F2E]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#141834]/90 text-white ring-4 ring-white/40 transition hover:scale-105">
            <Icon name="play_arrow" className="!text-[34px]" />
          </span>
        </button>
      )}
      {notice && !v.src && (
        <div role="status" className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 px-3 py-2 text-[11px] text-[#0B0F2E]">
          <b>Video not added yet.</b> Set <code>video.src</code> for this product in <code>src/data/showcase.ts</code> (e.g.
          <code> /videos/{product}-tour.mp4</code>).
        </div>
      )}
    </div>
  );
}

const VIDEO_ORDER: ProductId[] = ["hrms", "ats"];

export function ProductVideoSection({ product, onDemo }: { product: ProductId; onDemo: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ProductId>(product);

  const go = useCallback((id: ProductId) => {
    const el = track.current;
    if (el) el.scrollTo({ left: VIDEO_ORDER.indexOf(id) * el.clientWidth, behavior: "smooth" });
    setActive(id);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: VIDEO_ORDER.indexOf(product) * el.clientWidth, behavior: "smooth" });
    setActive(product);
  }, [product]);

  const onScroll = () => {
    const el = track.current;
    if (el) setActive(VIDEO_ORDER[Math.round(el.scrollLeft / el.clientWidth)] ?? "hrms");
  };

  const v = PRODUCTS[active].video;
  const motion = useCarouselMotion(track, () => go(active === "ats" ? "hrms" : "ats"), 9000);
  const arrow =
    "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0B0F2E] shadow transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A6CFF]";

  return (
    <section id="video" className="scroll-mt-24 bg-white pb-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#141834] via-[#171d4a] to-[#1E1AB8] p-6 text-white sm:p-10">
          <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#4A6CFF]/25 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <span className="inline-block rounded-full border border-white/25 px-3 py-1 text-[11px] font-semibold">See It in Action</span>
              <h2 className="font-display text-2xl tracking-tight md:text-3xl">Experience the Power of {PRODUCTS[active].brand}</h2>
              <p className="max-w-md text-sm leading-relaxed text-white/75">{v.blurb}</p>
            </div>

            <div className="relative min-w-0" role="region" aria-roledescription="carousel" aria-label="Product videos" {...motion}>
              <button type="button" aria-label="Previous video" onClick={() => go(active === "ats" ? "hrms" : "ats")} className={`${arrow} left-2`}>
                <Icon name="chevron_left" className="!text-[20px]" />
              </button>
              <button type="button" aria-label="Next video" onClick={() => go(active === "ats" ? "hrms" : "ats")} className={`${arrow} right-2`}>
                <Icon name="chevron_right" className="!text-[20px]" />
              </button>
              <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {VIDEO_ORDER.map((id) => (
                  <div key={id} className="w-full shrink-0 snap-center px-0.5">
                    <VideoPlayer product={id} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-center gap-2">
                {VIDEO_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={`Show ${PRODUCTS[id].brand} video`}
                    onClick={() => go(id)}
                    className={`h-2 rounded-full transition-all ${active === id ? "w-5 bg-white" : "w-2 bg-white/35"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Secondary (ATS) showcase ----------------------------- */

export function SecondaryShowcase({ product, onDemo }: { product: ProductId; onDemo: () => void }) {
  const p = PRODUCTS[product];
  return (
    <section id="ats-showcase" className="scroll-mt-24 bg-white pb-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-12 lg:px-12">
        <div className="space-y-4 lg:col-span-4">
          <h2 className="font-display text-2xl tracking-tight text-[#0B0F2E] md:text-3xl">
            {p.heading[0]}<span className="text-shimmer">{p.heading[1]}</span>{p.heading[2]}
          </h2>
          <p className="text-sm leading-relaxed text-[#5B6488]">{p.intro}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={p.ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#141834] hover:bg-[#232A4E] hover:shadow-[0_6px_20px_rgba(20,24,52,0.35)] border border-[#4A6CFF]/40 px-5 py-2.5 text-sm font-bold text-white shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6CFF]"
            >
              {p.ctaLabel}
              <Icon name="arrow_forward" className="!text-[18px]" />
            </Link>
          </div>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <ScreenshotCarousel key={product} slides={p.slides} brand={p.brand} nav={p.sidebar} />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Testimonials -------------------------------- */

export function Testimonials() {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const step = (d: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: d * (card ? card.offsetWidth + 16 : el.clientWidth), behavior: "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (el && card) setIndex(Math.round(el.scrollLeft / (card.offsetWidth + 16)));
  };
  const motion = useCarouselMotion(
    track,
    () => {
      const el = track.current;
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) el.scrollTo({ left: 0, behavior: "smooth" });
      else step(1);
    },
    5000,
  );
  const arrow =
    "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#DCE4F5] bg-white shadow-sm transition hover:border-[#0B5BD3] hover:text-[#0B5BD3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A6CFF] lg:flex";

  return (
    <section id="testimonials" className="scroll-mt-24 bg-white pb-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="text-center">
          <h2 className="font-display text-2xl tracking-tight text-[#0B0F2E] md:text-3xl">Trusted by Growing Companies</h2>
          <p className="mt-1 text-sm text-[#5B6488]">Sample placeholders — replace with verified customer quotes.</p>
        </div>
        <div className="relative mt-8" role="region" aria-roledescription="carousel" aria-label="Testimonials" {...motion}>
          <button type="button" aria-label="Previous testimonial" onClick={() => step(-1)} className={`${arrow} -left-5`}>
            <Icon name="chevron_left" className="!text-[20px]" />
          </button>
          <button type="button" aria-label="Next testimonial" onClick={() => step(1)} className={`${arrow} -right-5`}>
            <Icon name="chevron_right" className="!text-[20px]" />
          </button>
          <div
            ref={track}
            onScroll={onScroll}
            className="flex cursor-grab select-none snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {TESTIMONIALS.map((t, i) => (
              <figure
                key={i}
                className="m-0 w-full shrink-0 snap-start rounded-xl border border-[#DCE4F5] bg-gradient-to-b from-[#F5F8FF] to-white p-5 md:w-[calc(50%-8px)] lg:w-[calc((100%-32px)/3)]"
              >
                <Icon name="format_quote" className="!text-[28px] text-[#4A6CFF]" />
                <blockquote className="mt-1 min-h-[56px] text-sm leading-relaxed text-[#0B0F2E]">{t.quote}</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <Avatar name={t.name} i={i} size={36} />
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="text-xs text-[#5B6488]">
                      {t.role}, {t.company}
                    </div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-2 lg:hidden" aria-hidden>
            {TESTIMONIALS.map((_, i) => (
              <span key={i} className={`h-2 rounded-full ${i === index ? "w-5 bg-[#1E1AB8]" : "w-2 bg-[#C9D3EE]"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ CTA ------------------------------------ */

export function CtaBanner({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#EAF0FF] via-[#EFEBFF] to-[#DDE6FF] px-8 py-8 md:flex-row md:items-center">
          <div aria-hidden className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#4A6CFF]/20 blur-2xl" />
          <div className="relative">
            <h2 className="font-display text-xl tracking-tight text-[#0B0F2E] md:text-2xl">Ready to Transform Your HR & Hiring Process?</h2>
            <p className="mt-1 text-sm text-[#5B6488]">Book a walkthrough of PeopleSuite, TalentFlow or both.</p>
          </div>
          <button
            type="button"
            onClick={onDemo}
            className="relative inline-flex items-center gap-2 rounded-full bg-[#141834] hover:bg-[#232A4E] hover:shadow-[0_6px_20px_rgba(20,24,52,0.35)] border border-[#4A6CFF]/40 px-6 py-3 text-sm font-bold text-white shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A6CFF]"
          >
            Book a Demo
            <Icon name="arrow_forward" className="!text-[18px]" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------- Dedicated product page media ------------------------- */

export function ProductMedia({ product, onDemo }: { product: ProductId; onDemo: () => void }) {
  const p = PRODUCTS[product];
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <ScreenshotCarousel slides={p.slides} brand={p.brand} nav={p.sidebar} />
          </div>
          <ul className="space-y-6 lg:col-span-4">
            {p.features.map((f) => (
              <FeatureRow key={f.title} f={f} />
            ))}
          </ul>
        </div>

        <div className="relative mt-14 overflow-hidden rounded-3xl bg-gradient-to-br from-[#141834] via-[#171d4a] to-[#1E1AB8] p-6 text-white sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="font-display text-2xl tracking-tight md:text-3xl">{p.video.title}</h2>
              <p className="max-w-md text-sm leading-relaxed text-white/75">{p.video.blurb}</p>
              <button
                type="button"
                onClick={onDemo}
                className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                Book a Walkthrough
              </button>
            </div>
            <VideoPlayer product={product} />
          </div>
        </div>
      </div>
    </section>
  );
}
