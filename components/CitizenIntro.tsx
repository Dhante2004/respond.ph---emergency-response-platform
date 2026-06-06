import React, { useEffect, useMemo, useRef, useState } from "react";

type Slide = { src: string };

type CitizenIntroProps = {
  onDone: () => void;
  slides?: Slide[];
};

const DEFAULT_SLIDES: Slide[] = [
  { src: "/intro/intro-1.jpg" },
  { src: "/intro/intro-2.jpg" },
  { src: "/intro/intro-3.jpg" },
  { src: "/intro/intro-4.jpg" },
  { src: "/intro/intro-5.jpg" },
  { src: "/intro/intro-6.jpg" },
];

const GPS_TAGS: Array<{ top: string; left: string; delay: string; scale: number }> = [
  { top: "14%", left: "18%", delay: "-0.3s", scale: 0.95 },
  { top: "22%", left: "62%", delay: "-1.2s", scale: 1.05 },
  { top: "34%", left: "32%", delay: "-2.1s", scale: 0.9 },
  { top: "40%", left: "76%", delay: "-0.9s", scale: 1.1 },
  { top: "52%", left: "14%", delay: "-1.7s", scale: 1.0 },
  { top: "58%", left: "46%", delay: "-2.6s", scale: 0.92 },
  { top: "64%", left: "84%", delay: "-1.4s", scale: 1.06 },
  { top: "74%", left: "28%", delay: "-2.9s", scale: 1.02 },
  { top: "78%", left: "60%", delay: "-0.6s", scale: 0.96 },
  { top: "18%", left: "86%", delay: "-2.4s", scale: 0.9 },
  { top: "30%", left: "10%", delay: "-1.0s", scale: 1.08 },
  { top: "46%", left: "56%", delay: "-3.1s", scale: 0.92 },
  { top: "70%", left: "72%", delay: "-2.0s", scale: 1.04 },
  { top: "86%", left: "40%", delay: "-1.6s", scale: 0.94 },
];

const CitizenIntro: React.FC<CitizenIntroProps> = ({ onDone, slides }) => {
  const items = useMemo(() => (slides?.length ? slides : DEFAULT_SLIDES), [slides]);
  const lastIndex = items.length - 1;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const [canStart, setCanStart] = useState(false);

  useEffect(() => {
    let t: number | undefined;
    setCanStart(false);

    if (index === lastIndex) {
      t = window.setTimeout(() => setCanStart(true), 3000);
    }

    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [index, lastIndex]);

  const scrollTo = (next: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(lastIndex, next));
    const w = el.clientWidth;
    el.scrollTo({ left: clamped * w, behavior: "smooth" });
    setIndex(clamped);
  };

  const goNext = () => scrollTo(index + 1);
  const goPrev = () => scrollTo(index - 1);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const next = Math.round(el.scrollLeft / w);
    if (next !== index) setIndex(next);
  };

  const MAP_SVG_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='900' viewBox='0 0 900 900'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.48' stroke-width='3'%3E%3Cpath d='M-20 120 C 120 80, 220 190, 360 150 S 600 70, 760 140 S 980 230, 980 230'/%3E%3Cpath d='M-20 280 C 160 220, 260 350, 420 300 S 640 220, 820 300 S 980 380, 980 380'/%3E%3Cpath d='M-20 460 C 160 420, 280 520, 430 470 S 650 390, 820 470 S 980 560, 980 560'/%3E%3Cpath d='M-20 650 C 150 610, 290 710, 430 660 S 660 580, 820 660 S 980 740, 980 740'/%3E%3Cpath d='M140 -20 C 90 140, 210 210, 160 350 S 120 590, 220 720 S 340 940, 340 940'/%3E%3Cpath d='M340 -20 C 280 140, 420 230, 350 380 S 260 600, 380 730 S 520 940, 520 940'/%3E%3Cpath d='M560 -20 C 510 120, 640 240, 560 400 S 420 620, 560 760 S 740 940, 740 940'/%3E%3Cpath d='M760 -20 C 700 120, 830 240, 760 420 S 620 650, 760 780 S 940 940, 940 940'/%3E%3Cpath d='M90 90 L 210 200 L 320 170'/%3E%3Cpath d='M520 260 L 640 330 L 760 300'/%3E%3Cpath d='M220 540 L 360 610 L 470 560'/%3E%3Cpath d='M610 620 L 700 700 L 820 660'/%3E%3C/g%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.26' stroke-width='1.6'%3E%3Cpath d='M0 0 H900 M0 150 H900 M0 300 H900 M0 450 H900 M0 600 H900 M0 750 H900 M0 900 H900'/%3E%3Cpath d='M0 0 V900 M150 0 V900 M300 0 V900 M450 0 V900 M600 0 V900 M750 0 V900 M900 0 V900'/%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "var(--app-height, 100vh)" }}>
      <style>{`
        @keyframes gpsDotFlicker {
          0%, 100% { opacity: .18; transform: translateY(0) scale(.95); filter: blur(0px); }
          45% { opacity: .72; transform: translateY(-1px) scale(1.05); filter: blur(.2px); }
          70% { opacity: .28; transform: translateY(0) scale(.98); }
        }
        @keyframes gpsRing {
          0% { transform: scale(.65); opacity: .0; }
          20% { opacity: .42; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes gpsFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .introScroller::-webkit-scrollbar { display: none; }
        .slideYScroller::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Background */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 20% 10%, rgba(255,255,255,0.14), transparent 58%)," +
            "radial-gradient(900px 520px at 85% 0%, rgba(0,0,0,0.14), transparent 62%)," +
            "linear-gradient(to bottom, rgba(136,19,55,0.28), rgba(225,29,72,0.52), rgba(88,13,36,0.28))",
        }}
      />

      {/* Map overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.34]"
        style={{
          backgroundImage: MAP_SVG_BG,
          backgroundSize: "900px 900px",
          backgroundPosition: "center",
          mixBlendMode: "overlay",
        }}
      />

      {/* GPS tags */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {GPS_TAGS.map((t, idx) => (
          <div
            key={idx}
            className="absolute"
            style={{
              top: t.top,
              left: t.left,
              transform: `translate(-50%, -50%) scale(${t.scale})`,
              animation: `gpsFloat 7.8s ease-in-out ${t.delay} infinite`,
              opacity: 0.95,
              mixBlendMode: "screen",
            }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  border: "1.5px solid rgba(255,255,255,0.48)",
                  animation: `gpsRing 4.2s ease-out ${t.delay} infinite`,
                }}
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  border: "1px solid rgba(255,255,255,0.20)",
                  animation: `gpsRing 4.2s ease-out calc(${t.delay} - 1.3s) infinite`,
                }}
              />
              <div
                className="flex items-center gap-2 rounded-full px-2.5 py-1.5"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(6px)",
                  animation: `gpsDotFlicker 5.2s ease-in-out ${t.delay} infinite`,
                }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: "rgba(255,255,255,0.90)",
                    boxShadow: "0 0 18px rgba(255,255,255,0.38)",
                  }}
                />
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/80" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div aria-hidden className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.30)]" />

      {/* Horizontal slides */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="introScroller relative z-10 h-full w-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          touchAction: "pan-x", // horizontal swipe on the main scroller
          scrollbarWidth: "none" as any,
        }}
      >
        {items.map((s, idx) => (
          <div key={idx} className="relative h-full w-full shrink-0 snap-center">
            {/* FULL SCREEN VIEWPORT + VERTICAL SCROLL FOR THE JPG */}
            <div
              className="slideYScroller absolute inset-0 overflow-y-auto overflow-x-hidden"
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehaviorY: "contain",
                touchAction: "pan-y", // allow vertical scrolling inside slide
                scrollbarWidth: "none" as any,
              }}
            >
              <img
                src={s.src}
                alt={`Intro slide ${idx + 1}`}
                className="block w-full h-auto"
                loading={idx === 0 ? "eager" : "lazy"}
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md px-6">
          <div className="flex flex-col items-center gap-4">
            {/* Dots + Next/Back */}
            <div className="flex w-full items-center justify-between">
              <button
                onClick={goPrev}
                disabled={index === 0}
                aria-label="Previous slide"
                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                  index === 0
                    ? "opacity-0 pointer-events-none"
                    : "bg-white/14 text-white/90 hover:bg-white/20 active:scale-[0.99]"
                }`}
                style={{
                  border: index === 0 ? undefined : "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: index === 0 ? undefined : "blur(6px)",
                }}
              >
                Back
              </button>

              <div className="flex items-center gap-2">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      i === index ? "bg-white" : "bg-white/45 hover:bg-white/75"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={goNext}
                disabled={index === lastIndex}
                aria-label="Next slide"
                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                  index === lastIndex
                    ? "opacity-0 pointer-events-none"
                    : "bg-white/14 text-white/90 hover:bg-white/20 active:scale-[0.99]"
                }`}
                style={{
                  border: index === lastIndex ? undefined : "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: index === lastIndex ? undefined : "blur(6px)",
                }}
              >
                Next
              </button>
            </div>

            {/* Get Started */}
            {index === lastIndex && canStart && (
              <button
                onClick={onDone}
                className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.22em] text-rose-700 shadow-2xl shadow-rose-900/20 active:scale-[0.99]"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenIntro;
