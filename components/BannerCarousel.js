'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const INK = '#000000';
const GOLD = '#C9A227';
const PAPER = '#FFFFFF';
const INTERVAL = 4500;

function Slide({ banner, active, priority }) {
  const img = (
    <Image
      src={banner.image}
      alt={banner.title || 'Banner'}
      fill
      sizes="100vw"
      quality={70}
      priority={priority}          // preloads only the first banner (LCP)
      className="object-contain object-center sm:object-cover"
    />
  );

  const cls = `absolute inset-0 block transition-opacity duration-700 ${
    active ? 'opacity-100 z-[1]' : 'opacity-0 pointer-events-none'
  }`;

  if (!banner.link) {
    return <div className={cls} aria-hidden={!active}>{img}</div>;
  }
  return (
    <Link
      href={banner.link}
      className={cls}
      tabIndex={active ? 0 : -1}
      aria-hidden={!active}
    >
      {img}
    </Link>
  );
}

export default function BannerCarousel({ banners }) {
  const count = banners?.length || 0;
  const [index, setIndex] = useState(0);
  // only mount slides that are current, next, or already seen
  const [mounted, setMounted] = useState(() => new Set([0, 1 % Math.max(count, 1)]));

  const go = useCallback(
    (next) => setIndex(((next % count) + count) % count),
    [count]
  );

  // keep the current and next slide mounted so the next image is ready
  useEffect(() => {
    if (!count) return;
    setMounted((prev) => {
      const next = new Set(prev);
      next.add(index);
      next.add((index + 1) % count);
      return next.size === prev.size ? prev : next;
    });
  }, [index, count]);

  // autoplay: resets on every slide change, pauses in background tabs,
  // and is skipped for users who prefer reduced motion
  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer;
    const start = () => {
      clearTimeout(timer);
      timer = setTimeout(() => go(index + 1), INTERVAL);
    };
    const onVisibility = () => (document.hidden ? clearTimeout(timer) : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [index, count, go]);

  if (!count) return null;

  return (
    <section className="relative w-full overflow-hidden" style={{ background: PAPER }}>
      <div className="relative w-full aspect-[1920/810]">
        {banners.map((b, i) =>
          mounted.has(i) ? (
            <Slide key={b._id} banner={b} active={i === index} priority={i === 0} />
          ) : null
        )}

        {count > 1 && (
          <>
            <button
              onClick={() => go(index - 1)}
              className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full z-10"
              style={{ background: PAPER, color: INK, border: `1px solid ${GOLD}` }}
              aria-label="Previous"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => go(index + 1)}
              className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full z-10"
              style={{ background: PAPER, color: INK, border: `1px solid ${GOLD}` }}
              aria-label="Next"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>

            <div className="absolute bottom-2 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className="rounded-full transition-all"
                  style={{
                    height: '3px',
                    width: i === index ? '22px' : '10px',
                    background: i === index ? GOLD : 'rgba(255,255,255,0.7)',
                    boxShadow:
                      i === index
                        ? '0 0 0 1px rgba(0,0,0,0.25)'
                        : '0 0 0 1px rgba(0,0,0,0.15)',
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}