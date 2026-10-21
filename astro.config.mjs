// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://samnewellrealestate.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      lastmod: new Date(),
    }),
  ],
  adapter: vercel(),
  build: { inlineStylesheets: 'always' },
  prefetch: { defaultStrategy: 'hover' },
  image: { responsiveStyles: false },
  redirects: {
    '/real-estate/': { status: 301, destination: '/buy/' },
    '/multi-investments/': { status: 301, destination: '/invest/#mfi-club' },
    '/framing/': { status: 301, destination: '/about/#builders-eye' },
    '/parenting/': { status: 301, destination: '/about/#family' },
    '/services/': { status: 301, destination: '/' },
  },
  devToolbar: { enabled: false },
  vite: {
    build: { sourcemap: false }, // no public sourcemaps (jury P2-15)
    // pre-bundle the lazy chunks' deps so the dev server never re-optimises mid-session (504 Outdated Optimize Dep)
    optimizeDeps: { include: ['three', 'three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/libs/meshopt_decoder.module.js', 'gsap', 'gsap/ScrollTrigger', 'lenis'] },
  },
  server: { port: 4345 },
});
