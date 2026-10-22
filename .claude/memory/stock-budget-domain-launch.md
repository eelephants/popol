---
name: stock-budget-domain-launch
description: "Open items from the 2026-10 move to stock-budget.site, search registration and AdSense — dated deadlines and things not to remove yet"
metadata:
  node_type: memory
  type: project
  originSessionId: 46a01f89-ad34-4897-b9ba-ad5658f9de32
  modified: 2026-10-22T15:52:53.852Z
---

On 2026-10-22/23 the site moved to `https://stock-budget.site` (Gabia DNS → Vercel; www and popol-topaz.vercel.app 308 → apex via next.config.mjs), Google Search Console + Naver Search Advisor were registered, and AdSense (`ca-pub-1677771029100125`, Vercel env `ADSENSE_CLIENT`, production only) was deployed and submitted for review.

Open items:
- **Keep `GOOGLE_SITE_VERIFICATION`** (verifies the old popol-topaz.vercel.app property) until Search Console's change-of-address has completed.
- **Keep the vercel.app → stock-budget.site redirect** at least 180 days, i.e. until ~2027-04-23.
- **AdSense review pending** (applied 2026-10-23). After approval: turn off anchor ads (they collide with the fixed bottom NavBar); consider vignette ads off on calculator screens.
- Around 2026-11-06, check indexing: Search Console pages report and Naver collection status for the new domain.
- Not done, user-optional: `FINNHUB_API_KEY` is not set in Vercel (valuation badges off; reader stock P/E falls back to price ÷ last FY EPS); Korean-stock EPS autofill via DART API was suggested.

**Why:** These are time-bound or "don't delete yet" facts that nothing in the repo records.
**How to apply:** Before removing env vars, redirects, or changing ad settings, check this list; surface the pending checks when the user asks what's next.

Related: [[popol-deploy-habits]]
