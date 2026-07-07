import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './site-header.css';

gsap.registerPlugin(useGSAP);

const SERVICES = [
  { href: '/real-estate/', label: 'Real Estate' },
  { href: '/framing/', label: 'Framing' },
  { href: '/multi-investments/', label: 'Multi-Family Investments' },
  { href: '/parenting/', label: 'Parenting' },
];

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about/', label: 'About' },
  { href: '/blog/', label: 'Blog' },
  { href: '/contact/', label: 'Contact' },
];

interface Props {
  theme: 'dark' | 'light';
  pathname: string;
}

export default function SiteHeader({ theme, pathname }: Props) {
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [menuOpen]);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.sh-brand, .sh-nav > *, .sh-cta', {
        y: -18,
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.07,
        delay: 0.15,
        clearProps: 'all',
      });
    },
    { scope: headerRef }
  );

  useGSAP(
    () => {
      if (!menuOpen) return;
      gsap.from('.sh-mobile-link', {
        y: 36,
        autoAlpha: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.06,
        delay: 0.1,
        clearProps: 'all',
      });
    },
    { scope: headerRef, dependencies: [menuOpen] }
  );

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.replace(/\/$/, ''));

  return (
    <header
      ref={headerRef}
      className={[
        'sh',
        `sh--${theme}`,
        scrolled ? 'sh--scrolled' : '',
        menuOpen ? 'sh--open' : '',
      ].join(' ')}
    >
      <div className="sh-inner">
        <a href="/" className="sh-brand" aria-label="Sam Newell — Home">
          <img src="/images/logo.svg" alt="Sam Newell" className="sh-logo" width="160" height="46" />
        </a>

        <nav className="sh-nav" aria-label="Primary">
          <a href="/" className={`sh-link ${pathname === '/' ? 'is-active' : ''}`}>
            Home
          </a>
          <div
            className="sh-dropdown"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              className={`sh-link sh-link--btn ${servicesOpen ? 'is-open' : ''}`}
              aria-expanded={servicesOpen}
              onClick={() => setServicesOpen((v) => !v)}
            >
              Services
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <div className={`sh-menu ${servicesOpen ? 'is-open' : ''}`}>
              {SERVICES.map((s) => (
                <a key={s.href} href={s.href} className="sh-menu-link">
                  {s.label}
                </a>
              ))}
            </div>
          </div>
          <a href="/about/" className={`sh-link ${isActive('/about/') ? 'is-active' : ''}`}>
            About
          </a>
          <a href="/blog/" className={`sh-link ${isActive('/blog/') ? 'is-active' : ''}`}>
            Blog
          </a>
          <a href="/contact/" className={`sh-link ${isActive('/contact/') ? 'is-active' : ''}`}>
            Contact
          </a>
        </nav>

        <a href="/contact/" className="sh-cta">
          Work with Sam
        </a>

        <button
          className="sh-burger"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className="sh-mobile" aria-hidden={!menuOpen}>
        <nav className="sh-mobile-nav" aria-label="Mobile">
          {[...LINKS.slice(0, 1), ...SERVICES, ...LINKS.slice(1)].map((l) => (
            <a key={l.href} href={l.href} className="sh-mobile-link">
              {l.label}
            </a>
          ))}
          <a href="/contact/" className="sh-mobile-link sh-mobile-link--cta">
            Work with Sam →
          </a>
        </nav>
      </div>
    </header>
  );
}
