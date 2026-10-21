/**
 * Single source of truth for contact, brokerage and links.
 * Facts: inspo/zillow.md, inspo/instagram.md, inspo/client-intel.md (USER ANSWERS 2026-10-21).
 */
import { CONFIRM } from './confirm';

export const SITE = {
  url: 'https://samnewellrealestate.com',
  name: 'Sam Newell',
  title: 'Realtor', // user decision 2026-10-21 (CONFIRM.broker is off)
  base: 'Lehi, Utah',
  serving: 'Salt Lake and Utah County',
  languages: ['English', 'Spanish'],
  yearsInRealEstate: 15,
};

export const CONTACT = {
  phone: '(801) 995-2220',
  phoneHref: 'tel:+18019952220',
  smsHref: 'sms:+18019952220',
  email: 'samnewellrealestate@gmail.com',
  /** 404 as of 2026-10-21 — not linked anywhere; see BOOKING_URL. */
  calendlyDead: 'https://calendly.com/sam_newell_real_estate',
};

/**
 * THE booking link — one line to swap. [SAM: working Calendly/booking link]
 * calendly.com/sam_newell_real_estate returns 404 (checked 2026-10-21), so every "Book a call" goes to the
 * contact form, with the phone number alongside, until Sam sends a link that works.
 */
export const BOOKING_URL: string = '/contact/#message';
export const BOOKING_EXTERNAL = /^https?:/.test(BOOKING_URL);
export const bookingAttrs: Record<string, string> = BOOKING_EXTERNAL ? { rel: 'noopener', target: '_blank' } : {};

export const BROKERAGE = {
  name: 'KW Utah Realtors Keller Williams (Brickyard)',
  short: 'KW Utah Realtors (Brickyard)',
  street: '1245 E Brickyard Rd #500',
  city: 'Salt Lake City',
  region: 'UT',
  zip: '84106',
  phone: '(801) 326-8800',
};

export const ZILLOW = {
  profile: 'https://www.zillow.com/profile/Sam%20Newell',
  rating: 4.9,
  reviews: 45,
  sold: 235,
  forSale: 3,
  memberSince: 2014,
  asOf: 'October 2026',
};

export const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/samnewellrealestate/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@samnewellinvests' },
  { label: 'YouTube', href: 'https://www.youtube.com/@samnewellrealestate' },
  { label: 'Facebook', href: 'https://www.facebook.com/samnewellrealestate/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sam-newell-70336642/' },
  { label: 'Zillow', href: ZILLOW.profile },
];

export const PODCAST = {
  name: 'Get Leveraged',
  episodes: 104,
  rating: 4.8,
  ratings: 60,
  first: 2020,
  last: '2025-03-24',
  apple: 'https://podcasts.apple.com/us/podcast/get-leveraged/id1484472973',
  spotify: 'https://open.spotify.com/show/2MV6OkJ598NYN3llRjSgGv',
  rss: 'https://feeds.captivate.fm/recession-proof/',
};

export const MFI = {
  name: 'Multifamily Investment Club',
  short: 'MFI Club',
  url: 'https://www.mficlub.com/',
  founded: 2018,
};

/**
 * Sam's Utah licence, exactly as his Zillow profile shows it (inspo/zillow.md "Profile facts", read 2026-10-21).
 * The user asked for it on the site (2026-10-21). Utah ad rules: always show the brokerage name with it.
 * Never label it "broker licence": the SA suffix means sales agent.
 */
export const LICENCE = {
  number: '6862779-SA00',
  state: 'UT',
  issuer: 'Utah Division of Real Estate',
  issuerUrl: 'https://realestate.utah.gov/',
};
/** "UT licence #6862779-SA00 · KW Utah Realtors Keller Williams (Brickyard), 1245 E Brickyard Rd #500, Salt Lake City, UT 84106" */
export const LICENCE_LINE = `${LICENCE.state} licence #${LICENCE.number} · ${BROKERAGE.name}, ${BROKERAGE.street}, ${BROKERAGE.city}, ${BROKERAGE.region} ${BROKERAGE.zip}`;

export const FRAMING = {
  name: 'A Framing Company',
  url: 'https://aframingcompany.com/',
};

export const NAV = [
  { href: '/buy/', label: 'Buy' },
  { href: '/sell/', label: 'Sell' },
  { href: '/invest/', label: 'Invest' },
  { href: '/podcast/', label: 'Podcast' },
  { href: '/reviews/', label: 'Reviews' },
  { href: '/about/', label: 'About' },
];

export const FOOTER_SAM = [
  ...NAV.slice(0, 5),
  { href: '/blog/', label: 'Blog' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];

/** Sam's own words, verbatim, with where he said them. */
export const SAM_SAYS = {
  dad: { text: 'I love being a dad more than anything else.', where: 'Instagram', date: 'July 2, 2026' },
  townhomes: { text: 'Townhomes are a better investment than multifamily in Utah, right now', where: 'Instagram', date: 'April 13, 2026' },
  smallMulti: { text: "Don't buy small multifamily investment properties if you can buy a new townhome like this.", where: 'Instagram', date: 'June 10, 2026' },
  birthday: { text: 'This is the first time a client has given me a birthday gift in 15 years', where: 'Instagram', date: 'June 4, 2026' },
  feel: { text: 'Everything in life goes back to how you make people feel.', where: 'Travis Chappell podcast, ep. 384', date: '' },
};

/** The one verbatim framing-client quote carried over from the current site. */
export const FRAMING_QUOTE = {
  text: 'I would definitely work with Sam and Oscar again, their crew repaired a framing job that another crew messed up and just walked off the job',
  name: 'John H.',
  role: 'general contractor',
};
