/**
 * Zillow reviews, VERBATIM as displayed on https://www.zillow.com/profile/Sam%20Newell (read 2026-10-21,
 * inspo/zillow.md). Typos kept. Never use #14 (1-star), #23 (possible family member) or #4 (trailing "??").
 * Every `excerpts` entry must be a contiguous span of `text` (checked by src/lib/reviews.test.ts).
 * User OK to quote verbatim with the name as displayed, date, town and transaction type (2026-10-21).
 * All 27 usable reviews of the 30 Zillow loaded (user: "have the reviews", 2026-10-21). Transaction lines are normalised
 * the same way throughout ("Bought a Condo home in 2026 in Murray, UT" → "Bought a condo in 2026 in Murray");
 * zip-only lines keep the zip, with the town slug mapped from it (84005 Eagle Mountain, 84601 Provo, 84062 Pleasant Grove,
 * 84043 Lehi).
 */
export interface Review {
  n: number;
  name: string;
  date: string; // ISO
  rating: number;
  what: string; // transaction line as shown on Zillow
  town?: string; // towns.json slug
  text: string;
  excerpts: Record<string, string>;
}

export const REVIEWS: Review[] = [
  {
    n: 1, name: 'Keaton', date: '2026-04-21', rating: 5, what: 'Bought a home in 2026',
    text: 'Sam was incredible! He had reliable resources in all parts of the process. He had connections to lenders, inspectors and even roofers for us. What we appreciated the most was the honest feedback he provided at each home. He showed us the good, the bad and the ugly! Most importantly he helped us understand when homes weren\'t right and what was right.',
    excerpts: { home: 'What we appreciated the most was the honest feedback he provided at each home. He showed us the good, the bad and the ugly!', buy: 'He had connections to lenders, inspectors and even roofers for us.' },
  },
  {
    n: 2, name: 'apbarnes2016', date: '2026-03-17', rating: 5, what: 'Bought a condo in 2026 in Murray', town: 'murray',
    text: 'Sam was great to work with during our first home purchase. He was very responsive and was patient with us while we figured out what we wanted. He even understood when we needed to put our search on hold for a bit. Overall, he made the process easy and relatively stress-free. We\'re grateful for his guidance and look forward to working with him again in the future.',
    excerpts: { town: 'He even understood when we needed to put our search on hold for a bit.' },
  },
  {
    n: 3, name: 'Harry Galer', date: '2025-10-04', rating: 5, what: 'Bought a condo in 2025 in South Jordan', town: 'south-jordan',
    text: 'Working with Sam was an incredible experience from start to finish. We found him through Zillow, and from our very first conversation, he was professional, responsive, and genuinely focused on helping us find the right home — not just any home. Sam was patient as we toured multiple properties and always gave honest feedback, never pushing us into something that didn\'t feel right. He explained every step of the process clearly, from making an offer to negotiating and closing, which really helped ease the stress of buying a home.',
    excerpts: { town: 'Sam was patient as we toured multiple properties and always gave honest feedback, never pushing us into something that didn\'t feel right.' },
  },
  {
    n: 5, name: 'Jordan Fraughton', date: '2025-09-28', rating: 5, what: 'Bought a home in 2025',
    text: 'Sam sincerely cared about helping us buy our first home. He was extremely kind, knowledgeable, and professional. As first time home buyers he walked us through every step of the process and helped us find the perfect home. He also got us an amazing deal on the house and negotiated some awesome repairs for us. Having Sam as a realtor feels like having your best friend be the best realtor in the game.',
    excerpts: { buy: 'He also got us an amazing deal on the house and negotiated some awesome repairs for us.' },
  },
  {
    n: 6, name: 'Robert Jarman', date: '2025-06-13', rating: 5, what: 'Bought a condo in 2024 in Millcreek', town: 'millcreek',
    text: 'Sam was absolutely amazing throughout the entire home buying process, and we feel so fortunate that he reached out to us on Zillow. While there were challenges along the way, he handled everything with such a positive and realistic approach. His dedication, especially when advocating for us with the seller\'s agent, didn\'t go unnoticed. As first time home buyers, we\'re grateful we had such a knowledgeable, friendly and real go getter of an agent. Don\'t think twice, reach out to Sam if you\'re looking for a home.',
    excerpts: { town: 'While there were challenges along the way, he handled everything with such a positive and realistic approach.' },
  },
  {
    n: 7, name: 'Dwight Wride', date: '2025-06-09', rating: 5, what: 'Bought a townhouse in 2025 in Lehi', town: 'lehi',
    text: 'Sam was there in a timely manner every step of the way in my townhouse purchase. He made it easy and comfortable. I highly recommend Sam if you\'re looking for a real estate agent',
    excerpts: { town: 'Sam was there in a timely manner every step of the way in my townhouse purchase. He made it easy and comfortable.' },
  },
  {
    n: 8, name: 'Scott Miller', date: '2025-02-18', rating: 5, what: 'Showed home in 2025 in Salt Lake County',
    text: 'It was an absolute pleasure to work with. Looking to relocate to Utah from out of state and Sam was very helpful in helping us navigate the present state of the real estate market in Utah, helped provide feedback on pros and cons to various neighborhoods. He brings additional insight and knowledge with both a background involving construction and as a real estate investor, helping to sort through the available options. He has a low pressure, informative style which is also appreciated. I wouldn\'t hesitate to recommend him to anyone looking to buy real estate in Northern Utah.',
    excerpts: { builder: 'He brings additional insight and knowledge with both a background involving construction and as a real estate investor, helping to sort through the available options.' },
  },
  {
    n: 9, name: 'eg despain1', date: '2025-01-27', rating: 5, what: 'Bought a townhouse in 2025 in American Fork', town: 'american-fork',
    text: 'As a first-time home buyer, Sam was great to work with. We felt very taken care of. He was genuine and responded well to all of our questions and opinions as we looked at homes. He was flexible with our schedule and when it came time to buy he was on top of everything. Can\'t recommend him enough!',
    excerpts: { town: 'He was flexible with our schedule and when it came time to buy he was on top of everything.' },
  },
  {
    n: 10, name: 'sjsukhan19', date: '2025-01-25', rating: 5, what: 'Bought a condo in 2025 in Herriman', town: 'herriman',
    text: 'We had the pleasure of working with Sam Newell as first-time home buyers, and we couldn\'t be more grateful for his expertise and support throughout the entire process. Sam made our experience smooth and stress-free with his friendly, down-to-earth personality. He genuinely cared about helping us find the perfect home and went above and beyond to make it happen. Whenever we found a property we were interested in, Sam would schedule a showing for us either the same day or the next day—he was always so quick to respond. His years of experience in real estate really showed, and we felt confident in his advice every step of the way. We highly recommend Sam to anyone looking for a knowledgeable, responsive, and caring realtor. He made our first home-buying experience unforgettable!',
    excerpts: { town: 'Whenever we found a property we were interested in, Sam would schedule a showing for us either the same day or the next day—he was always so quick to respond.' },
  },
  {
    n: 11, name: 'Will', date: '2024-10-02', rating: 5, what: 'Bought a single family home in 2024 in North Salt Lake', town: 'north-salt-lake',
    text: 'We recently purchased our first home with the help of Sam, and we couldn\'t be happier with the experience. From start to finish, Sam was the epitome of professionalism. He was always incredibly responsive (at night and on weekends), ensuring that all our questions were answered promptly. His deep knowledge of the market was evident, and he provided invaluable insights that helped us make informed decisions. Sam\'s expertise in negotiating was a game-changer, securing us the best possible deal. We highly recommend Sam to anyone looking to buy a home – his dedication and expertise are unmatched!',
    excerpts: { town: 'He was always incredibly responsive (at night and on weekends), ensuring that all our questions were answered promptly.', sell: 'Sam\'s expertise in negotiating was a game-changer, securing us the best possible deal.' },
  },
  {
    n: 12, name: 'Brandi Darling', date: '2024-03-06', rating: 5, what: 'Sold a single family home in 2024 in Clinton',
    text: 'Sam has been very knowledgeable and has had better results in getting people to be interested in our home. He has walked us through every step of the way.',
    excerpts: { sell: 'Sam has been very knowledgeable and has had better results in getting people to be interested in our home.' },
  },
  {
    n: 13, name: 'Cody Eddington', date: '2022-01-21', rating: 5, what: 'Bought a single family home in 2014 in Provo', town: 'provo',
    text: 'I have worked with Sam for years. There isn\'t a more passionate, knowledgeable and hard-working individual on this planet. He understands real estate commercially and residentially to perfection and makes his clients feel like family. Sam is simply real estate at its best!',
    excerpts: { town: 'He understands real estate commercially and residentially to perfection and makes his clients feel like family.' },
  },
  {
    n: 15, name: 'henrysasquatch7', date: '2018-08-09', rating: 5, what: 'Helped me rent a townhouse in Eagle Mountain', town: 'eagle-mountain',
    text: 'Sam was great! Very straightforward and easy to work with. He was prompt about getting back to me when I couldn\'t get ahold of him. He was clear and easy to understand in the details of the whole process and it felt easy. Very efficient. I would recommend him to anyone.',
    excerpts: {},
  },
  {
    n: 16, name: 'rickchungsiu3', date: '2018-08-07', rating: 5, what: 'Bought a home in 2017 in UT 84005', town: 'eagle-mountain',
    text: 'I\'ve worked with Sam on purchasing several properties. He has a great knowledge of the area and is always available to answer questions. I know he is very busy but he always gets back to me to answer any questions I have.',
    excerpts: { town: 'I\'ve worked with Sam on purchasing several properties. He has a great knowledge of the area and is always available to answer questions.', invest: 'I\'ve worked with Sam on purchasing several properties.' },
  },
  {
    n: 17, name: 'megan31313', date: '2018-08-06', rating: 5, what: 'Bought and sold a multiple occupancy home in 2016 in Orem', town: 'orem',
    text: 'We were referred to Sam a few years ago. Since then he has been our agent on a number of transactions and has been excellent to work with. He\'s quick to respond, provide insight, and always practices what he preaches. We look forward to working with Sam for years to come.',
    excerpts: { town: 'He\'s quick to respond, provide insight, and always practices what he preaches.', sell: 'Since then he has been our agent on a number of transactions and has been excellent to work with.' },
  },
  {
    n: 18, name: 'JoelRagar', date: '2018-08-06', rating: 5, what: 'Bought a home in 2017',
    text: 'Sam got us the right house at the right price faster than I thought possible. It was an easy easy process. If you are looking for someone to show the care needed to help you make the emotional decision of buying a house and balance the business side with easy then you need Sam.',
    excerpts: {},
  },
  {
    // Zillow renders this review with its first sentence pair duplicated mid-word ("…reliable dilige he has helped me…");
    // this is the single, un-duplicated text (inspo/zillow.md #19).
    n: 19, name: 'jordschipper', date: '2018-08-06', rating: 5, what: 'Bought a condo in 2018 in Sandy',
    text: 'He has helped me with the number of really unique real estate investment deals and they have all exceeded my expectations. Sam is a trustworthy, reliable diligent and intelligent agent. I will use him any chance I can.',
    excerpts: {},
  },
  {
    n: 20, name: 'blairvandyke0', date: '2018-08-06', rating: 5, what: 'Bought a single family home in 2018 in Pleasant Grove', town: 'pleasant-grove',
    text: 'I just bought my third rental with Sam. He is exceptional. Existing properties or new construction, Sam provides careful, accurate and experience-based analysis. He gives inexperienced investors a greater capacity to learn the business without making unnecessary and costly mistakes. He is very service-oriented and committed to the success of his clients. Sam is fair, honest, and genuine. I am comfortable recommending his services to family, close friends, colleagues, and acquaintances. Work with Sam, your competence and confidence will rise as you build your portfolio from 1 to 100 properties. Good luck',
    excerpts: { town: 'I just bought my third rental with Sam. He is exceptional.', invest: 'Existing properties or new construction, Sam provides careful, accurate and experience-based analysis.' },
  },
  {
    n: 21, name: 'ruthmosesbergau', date: '2018-03-22', rating: 5, what: 'Bought a single family home in 2016 in Orem', town: 'orem',
    text: 'Sam is an excellent realtor. He was with us every step of the way. Was available to show homes we wanted to see. We couldn\'t have asked for better service.',
    excerpts: {},
  },
  {
    n: 22, name: 'Shahshjssjs', date: '2018-03-20', rating: 5, what: 'Sold a single family home in 2017 in Nampa, ID',
    text: 'He\'s professional, great at communicating, thorough, personable, reliable, and very knowledgeable about the trade. We\'re so glad we went with Sam!!! If you\'re on the hunt for a good realtor, your hunt is over. He\'s your man.',
    excerpts: {},
  },
  {
    n: 24, name: 'R McClain', date: '2016-11-09', rating: 5, what: 'Showed home in 2016 in UT 84601', town: 'provo',
    text: 'Sam is an amazing realtor with tons of experience and knowledge. While working with Sam, he has really helped me to better understand the market and find the best option for me at this time. Sam definitely goes the extra mile and I have loved working with him.',
    excerpts: {},
  },
  {
    n: 25, name: 'Joshua Zippro', date: '2016-11-09', rating: 5, what: 'Showed home in 2016 in UT 84601', town: 'provo',
    text: 'Sam gives me great real estate advice. He knows a ton about investing and sells a lot of investment properties I would not hesitate to refer Sam to a friend or family member!',
    excerpts: {},
  },
  {
    n: 26, name: 'Ryan Nielson', date: '2016-11-08', rating: 5, what: 'Sold a single family home in 2015 in Kosciusko, MS',
    text: 'Sam made getting into my first home pretty simple he made my dream come true of getting my first house. Sam always was professional and worked hard for me.',
    excerpts: {},
  },
  {
    n: 27, name: 'ruthbergau', date: '2016-08-15', rating: 5, what: 'Bought a single family home in 2016 in Orem', town: 'orem',
    text: 'Sam was awesome to work with. He held our hands every step of the way to purchase our home. Every time we had a question or was unsure of what the next process was Sam was there. He even came to our home to make sure we understood all that was going on. You won\'t find a better realtor than Sam Newell. We are very excited and happy to have made this decision to stay in Utah.',
    excerpts: {},
  },
  {
    n: 28, name: 'Annette Bean', date: '2016-08-08', rating: 5, what: 'Bought a home in 2013 in UT 84062', town: 'pleasant-grove',
    text: 'Sam was helpful, competent, and easy to work with. He put us on an email list so we would receive listings that fit our interests, as they became available - which was very helpful.',
    excerpts: {},
  },
  {
    n: 29, name: 'gardner nielson', date: '2016-08-02', rating: 5, what: 'Showed home in 2016 in UT 84043', town: 'lehi',
    text: 'Sam is a great agent. We had bad experiences with other agents before, but he was top notch. We went through some difficult decisions throughout our home buying experience, but Sam was always there to help when we needed it. Sam goes the extra mile to make sure things get done quickly and really cares about his clients.',
    excerpts: {},
  },
  {
    n: 30, name: 'saldanapadri', date: '2016-07-28', rating: 5, what: 'Bought a single family home in 2016 in Pleasant Grove', town: 'pleasant-grove',
    text: 'Sam, is the best realtor that we know, after having a bad experience with a previous realtor we ended up loosing $1,000+ when Sam heard of this he immediately offered to take $1,000 off to make up for our loss! Sam is always available to meet with us or take a call with any questions he is very flexible, always has our best interest and makes sure everything is going smooth. I highly recommend Sam for anyone who is looking for a great experience!',
    excerpts: {},
  },
];

/** The kind of help, for the /reviews/ filter. "Bought and sold" counts as both. */
export type ReviewKind = 'bought' | 'sold' | 'showed' | 'rented';
export const reviewKinds = (r: Review): ReviewKind[] => {
  const w = r.what.toLowerCase();
  const k: ReviewKind[] = [];
  if (/\bbought\b/.test(w)) k.push('bought');
  if (/\bsold\b/.test(w)) k.push('sold');
  if (/^showed\b/.test(w)) k.push('showed');
  if (/\brent\b/.test(w)) k.push('rented');
  return k;
};

export const review = (n: number) => {
  const r = REVIEWS.find((x) => x.n === n);
  if (!r) throw new Error(`review #${n} not in the approved set`);
  return r;
};

export const reviewDate = (iso: string) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Apple Podcasts listener reviews (verbatim, inspo/instagram.md). */
export const PODCAST_REVIEWS = [
  { name: 'Marcuuspolo', date: '2024-10-02', text: 'Highly recommend this podcast! The host and the guest provide so much valuable insight not only in the business world but also just life in general.' },
  { name: 'MegVunn', date: '2020-05-13', text: 'Sam is awesome to work with and this podcast is a testament to the excellent advice he gives investors. Excited to listen to more episodes!' },
];
