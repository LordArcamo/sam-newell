/**
 * Single source of truth for site content.
 * Facts sourced from samnewellrealestate.com + public profiles
 * (LinkedIn, LoopNet, mficlub.com, Apple Podcasts, Zillow) — July 2026.
 */

export const CONTACT = {
  phone: '(801) 995-2220',
  phoneHref: 'tel:+18019952220',
  calendly: 'https://calendly.com/sam_newell_real_estate',
  base: 'Lehi, Utah',
  serving: 'Salt Lake & Utah County — the Wasatch Front',
};

export const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/samnewellrealestate/', handle: '@samnewellrealestate' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@samnewellinvests', handle: '@samnewellinvests' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCClcLF9jO5jqJb8LDK7VDlw', handle: 'Sam Newell Real Estate' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sam-newell-70336642/', handle: 'Sam Newell' },
  { label: 'Facebook', href: 'https://www.facebook.com/SamNewellRealtor/', handle: 'Sam Newell, Realtor' },
  { label: 'Zillow', href: 'https://www.zillow.com/profile/Sam-Newell/', handle: 'Sam Newell' },
];

export const ZILLOW_PROFILE = 'https://www.zillow.com/profile/Sam-Newell/';

export const STATS = [
  { value: 450, prefix: '$', suffix: 'M+', label: 'Closed transaction volume' },
  { value: 2000, prefix: '', suffix: '+', label: 'Multifamily doors owned & managed' },
  { value: 15, prefix: '', suffix: '+', label: 'Years in Utah real estate' },
  { value: 4.8, prefix: '', suffix: '★', label: 'Get Leveraged podcast rating', decimals: 1 },
];

export const PODCAST = {
  name: 'Get Leveraged',
  episodes: '104 episodes',
  rating: '4.8★ on Apple Podcasts',
  apple: 'https://podcasts.apple.com/us/podcast/id1484472973',
  spotify: 'https://open.spotify.com/show/2MV6OkJ598NYN3llRjSgGv',
  blurb:
    'Straight talk on multifamily investing, passive income, and building wealth that outlasts the market cycle — from someone who owns the units, not just the opinions.',
};

export const SERVICES = [
  {
    slug: 'real-estate',
    icon: 'house' as const,
    title: 'Utah Real Estate',
    kicker: 'Buy · Sell · Invest',
    blurb:
      'Top-producing broker across the Wasatch Front. Whether it’s your first home in Lehi or your fifteenth door in Provo, Sam negotiates like it’s his own money on the line — because for 15 years, it has been.',
    href: '/real-estate/',
    image: '/images/real-estate-hero.jpg',
  },
  {
    slug: 'multi-investments',
    icon: 'buildings' as const,
    title: 'Multifamily Investments',
    kicker: 'MFI Club · Est. 2018',
    blurb:
      'Founder & CEO of Multifamily Investment Club — a private firm acquiring value-add properties across the US, held long-term for cash flow and appreciation. 2,000+ doors and counting.',
    href: '/multi-investments/',
    image: '/images/multi-invest.jpg',
  },
  {
    slug: 'framing',
    icon: 'hammer' as const,
    title: 'Framing',
    kicker: 'A Framing Company',
    blurb:
      'A decade of expert framing for custom homes, attached housing, production homes, and small commercial builds — precision-built for Utah’s climate and codes.',
    href: '/framing/',
    image: '/images/framing-hero.jpg',
  },
  {
    slug: 'parenting',
    icon: 'heart' as const,
    title: 'Parenting & Family',
    kicker: 'Real Talk · Real Growth',
    blurb:
      'Husband to Lauren, dad to Heidi and Liam. Honest conversations about building a strong home — the kind that has nothing to do with square footage.',
    href: '/parenting/',
    image: '/images/parenting-1.jpg',
  },
];

/**
 * Real listings scraped from the live site's Zillow deep links, with the
 * property photos it used (zillowstatic). Prices/status live on Zillow —
 * cards link out so data never goes stale.
 */
export const LISTINGS = [
  { address: '758 W Cedar View Dr', city: 'Saratoga Springs, UT 84045', image: '/images/listings/cedar-view.webp', href: 'https://www.zillow.com/homedetails/758-W-Cedar-View-Dr-Saratoga-Springs-UT-84045/117648363_zpid/' },
  { address: '2887 Marrcrest W', city: 'Provo, UT 84604', image: '/images/listings/marrcrest.webp', href: 'https://www.zillow.com/homedetails/2887-Marrcrest-W-Provo-UT-84604/11933641_zpid/' },
  { address: '680 W 1310 N', city: 'Lehi, UT 84043', image: '/images/listings/lehi-1310.webp', href: 'https://www.zillow.com/homedetails/680-W-1310-N-Lehi-UT-84043/63224007_zpid/' },
  { address: '2291 N 1430 E', city: 'Provo, UT 84604', image: '/images/listings/provo-1430.webp', href: 'https://www.zillow.com/homedetails/2291-N-1430-E-Provo-UT-84604/53356663_zpid/' },
  { address: '433 E 1600 S', city: 'Orem, UT 84058', image: '/images/listings/orem-1600.webp', href: 'https://www.zillow.com/homedetails/433-E-1600-S-Orem-UT-84058/11923739_zpid/' },
  { address: '45 N 300 E', city: 'Provo, UT 84606', image: '/images/listings/provo-300e.webp', href: 'https://www.zillow.com/homedetails/45-N-300-E-Provo-UT-84606/11888838_zpid/' },
  { address: '430 S 1450 E', city: 'Provo, UT 84606', image: '/images/listings/provo-1450.webp', href: 'https://www.zillow.com/homedetails/430-S-1450-E-Provo-UT-84606/11903141_zpid/' },
  { address: '1825 E Cosmos Dr #E1', city: 'Eagle Mountain, UT 84005', image: '/images/listings/cosmos.webp', href: 'https://www.zillow.com/homedetails/1825-E-Cosmos-Dr-UNIT-E1-Eagle-Mountain-UT-84005/122537373_zpid/' },
  { address: '1792 E Skyline Dr #G6', city: 'Eagle Mountain, UT 84005', image: '/images/listings/skyline.webp', href: 'https://www.zillow.com/homedetails/1792-E-Skyline-Dr-G6-Eagle-Mountain-UT-84005/241987824_zpid/' },
  { address: '565 E 900 S', city: 'Orem, UT 84097', image: '/images/listings/orem-900s.webp', href: 'https://www.zillow.com/homedetails/565-E-900-S-Orem-UT-84097/11900173_zpid/' },
  { address: '4182 W 9800 N', city: 'Cedar Hills, UT 84062', image: '/images/listings/cedar-hills.webp', href: 'https://www.zillow.com/homedetails/4182-W-9800-N-Cedar-Hills-UT-84062/11938472_zpid/' },
];

/**
 * The John H quote is verbatim from the old site. The rest are
 * paraphrased from public Zillow review snippets — attributed by
 * context, not name, until verbatim text is re-sourced.
 */
export const TESTIMONIALS = [
  {
    quote:
      'I would definitely work with Sam and Oscar again. Their crew repaired a framing job that another crew messed up and just walked off the job.',
    name: 'John H.',
    role: 'General Contractor',
    verbatim: true,
  },
  {
    quote:
      'Straightforward, easy to work with, and prompt getting back to us — Sam made finding our place in Eagle Mountain simple.',
    name: 'Zillow review',
    role: 'Eagle Mountain client',
    verbatim: false,
  },
  {
    quote:
      'Great knowledge of the area and always available to answer questions. We’ve now bought multiple properties with Sam.',
    name: 'Zillow review',
    role: 'Repeat investor client',
    verbatim: false,
  },
  {
    quote:
      'Quick to respond, quick to provide insight — and he practices what he preaches. We’ve done several transactions together.',
    name: 'Zillow review',
    role: 'Referred client',
    verbatim: false,
  },
  {
    quote:
      'Sam got us the right house at the right price, faster than we expected. An easy process from start to finish.',
    name: 'Zillow review',
    role: 'Utah County buyer',
    verbatim: false,
  },
];

export const PARTNERS = [
  {
    name: 'Multifamily Investment Club',
    image: '/images/partner-mfic.png',
    href: 'https://www.mficlub.com/',
    blurb:
      'A privately held real estate investment firm buying value-add properties across the US — held long-term for cash flow and appreciation.',
  },
  {
    name: 'A Framing Company',
    image: '/images/partner-aframing.png',
    href: 'https://aframingcompany.com/',
    blurb:
      'A decade of expert framing for custom homes, attached housing, production homes, and small commercial buildings.',
  },
  {
    name: 'Preferred Lending Partner',
    image: '/images/partner-lender.png',
    href: null,
    blurb:
      'Helping buyers stand out in competitive markets with faster loan approval and stronger purchase offers.',
  },
];

export const BIO_SHORT =
  'Sam Newell is a Utah real estate broker and investor with 15+ years in the game — $450M+ in closed volume, 2,000+ multifamily doors owned and managed, and a CCIM designation to back it up. Beyond the deals, he hosts the Get Leveraged podcast, and he’ll tell you his best investment is the one at home: his wife Lauren and their kids.';

export const QUOTES = [
  'Everything in life goes back to how you make people feel.',
  'Success is the combination of a lot of work and a little bit of luck.',
];
