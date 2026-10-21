/**
 * Claims that need Sam's sign-off. Flags ON = the user confirmed the claim is real (2026-10-21,
 * client-intel "USER ANSWERS"). Flags OFF = never rendered; scripts/claims-lint.mjs fails the
 * build if the words appear in dist/.
 *
 * [SAM TO CONFIRM] notes live only in this file's comments, never on the page.
 */
export const CONFIRM = {
  /** $450M+ closed volume. Confirmed real by the user 2026-10-21. */
  volume450M: true,
  /** 2,000+ doors owned/managed through MFI Club. Confirmed by the user 2026-10-21. */
  doors2000: true,
  /** Multifamily Investment Club (est. 2018) section on /invest/. Confirmed by the user 2026-10-21. */
  mfiClub: true,
  /** "Broker" in copy and JSON-LD. User: Sam is a broker. [FLAGGED to the user 2026-10-21: Zillow lists licence 6862779-SA00; the SA suffix
   *  means sales agent in Utah, so "Broker" may need to change. Left as is until the user decides.]
   *  Licence number: the user overrode "stays off the site" on 2026-10-21; it is shown exactly as Zillow shows it (LICENCE in site.ts). */
  broker: true,
  /** CCIM designation. [SAM TO CONFIRM] */
  ccim: false,
  /** "Top 1%" (no third-party source). [SAM TO CONFIRM] */
  top1: false,
  /** "Investing since 2010 / bought at the bottom of the recession as a BYU student". [SAM TO CONFIRM] */
  since2010: false,
  /** [SAM: working Calendly/booking link] — set BOOKING_URL in src/data/site.ts; until then CTAs go to /contact/#message. */
  bookingLink: false,
  /** BYU construction-management degree. Kept: it is in Sam's own long-standing bio. [SAM TO CONFIRM wording] */
  byu: true,
} as const;
