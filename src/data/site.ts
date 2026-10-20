/**
 * Single source of truth for contact, brokerage and links.
 * Facts: inspo/zillow.md, inspo/instagram.md, inspo/client-intel.md (USER ANSWERS 2026-10-21).
 */
import { CONFIRM } from './confirm';

export const SITE = {
  url: 'https://samnewellrealestate.com',
  name: 'Sam Newell',
  title: CONFIRM.broker ? 'Real estate broker' : 'Real estate agent',
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
  calendly: 'https://calendly.com/sam_newell_real_estate',
};

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

export const FRAMING = {
  name: 'A Framing Company',
  url: 'https://aframingcompany.com/',
};

export const NAV = [
  { href: '/buy/', label: 'Buy' },
  { href: '/sell/', label: 'Sell' },
  { href: '/invest/', label: 'Invest' },
  { href: '/podcast/', label: 'Podcast' },
  { href: '/about/', label: 'About' },
];

export const FOOTER_SAM = [
  ...NAV.slice(0, 4),
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
