import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { STATS } from '../data/site';
import './stat-counters.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function StatCounters() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      gsap.utils.toArray<HTMLElement>('.stat').forEach((stat, i) => {
        const numEl = stat.querySelector<HTMLElement>('.stat-value');
        if (!numEl) return;
        const target = parseFloat(numEl.dataset.value || '0');
        const decimals = parseInt(numEl.dataset.decimals || '0', 10);
        const prefix = numEl.dataset.prefix || '';
        const suffix = numEl.dataset.suffix || '';
        const fmt = (n: number) =>
          `${prefix}${n.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}${suffix}`;

        if (reduce) {
          numEl.textContent = fmt(target);
          return;
        }

        const counter = { v: 0 };
        gsap.timeline({
          scrollTrigger: { trigger: stat, start: 'top 85%', toggleActions: 'play none none none' },
          delay: i * 0.12,
        })
          .from(stat, { y: 44, autoAlpha: 0, duration: 0.8, ease: 'power3.out' })
          .to(
            counter,
            {
              v: target,
              duration: 1.8,
              ease: 'power2.out',
              onUpdate: () => {
                numEl.textContent = fmt(counter.v);
              },
            },
            '<0.15'
          );
      });
    },
    { scope: rootRef }
  );

  return (
    <div className="stats" ref={rootRef}>
      {STATS.map((s) => (
        <div className="stat" key={s.label}>
          <span
            className="stat-value"
            data-value={s.value}
            data-prefix={s.prefix}
            data-suffix={s.suffix}
            data-decimals={s.decimals ?? 0}
          >
            {s.prefix}0{s.suffix}
          </span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
