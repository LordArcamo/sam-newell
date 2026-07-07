import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { TESTIMONIALS } from '../data/site';
import './testimonial-carousel.css';

gsap.registerPlugin(useGSAP);

export default function TestimonialCarousel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const busy = useRef(false);
  const t = TESTIMONIALS[index];

  const { contextSafe } = useGSAP({ scope: rootRef });

  const go = contextSafe((dir: 1 | -1) => {
    if (busy.current) return;
    busy.current = true;
    const next = (index + dir + TESTIMONIALS.length) % TESTIMONIALS.length;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIndex(next);
      busy.current = false;
      return;
    }

    gsap.to('.tc-card-inner', {
      x: dir * -40,
      autoAlpha: 0,
      duration: 0.32,
      ease: 'power2.in',
      onComplete: () => {
        setIndex(next);
        gsap.fromTo(
          '.tc-card-inner',
          { x: dir * 40, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.55,
            ease: 'power3.out',
            onComplete: () => {
              busy.current = false;
            },
          }
        );
      },
    });
  });

  return (
    <div className="tc" ref={rootRef}>
      <div className="tc-card">
        <div className="tc-card-inner">
          <span className="tc-mark" aria-hidden="true">
            “
          </span>
          <blockquote className="tc-quote">{t.quote}</blockquote>
          <div className="tc-meta">
            <span className="tc-name">{t.name}</span>
            <span className="tc-role">
              {t.role}
              {!t.verbatim && ' · paraphrased'}
            </span>
          </div>
        </div>
      </div>

      <div className="tc-controls">
        <button className="tc-btn" onClick={() => go(-1)} aria-label="Previous testimonial">
          ←
        </button>
        <div className="tc-dots" role="tablist" aria-label="Testimonials">
          {TESTIMONIALS.map((_, i) => (
            <span key={i} className={`tc-dot ${i === index ? 'is-active' : ''}`} />
          ))}
        </div>
        <button className="tc-btn" onClick={() => go(1)} aria-label="Next testimonial">
          →
        </button>
      </div>
    </div>
  );
}
