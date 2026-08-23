# CTS Trailers Partnership Strategy

## Research Summary

### CTS Trailers' business
- Established in 2001 (website also references "25 years of excellence" and LinkedIn shows founded 2003 — minor discrepancy, worth clarifying)
- Based in Stikland, Bellville, Western Cape
- Privately held South African company
- LinkedIn lists 51-200 employees, ~1,323 followers
- Positioning: commercial-vehicle "one-stop shop"
- Products: rigid bodies, semi-trailers, interlink trailers, drawbar/pup trailers, tippers, side-tipping trailers, truck bodies
- Services: repairs, refurbishment, parts sales, service/maintenance, pre-owned trucks and trailers
- Differentiators: high-tensile Domex steel tippers (extra payload), patented curtain-side interlink barrier system, double-deck interlinks (72 pallets), specialised scrap-steel tipper design, 20m3/45m3/50m3 side-tipping interlinks, dedicated service and parts centre
- B-BBEE compliant

### Social presence
- LinkedIn: CTS Trailers (Pty) Ltd
- Instagram: @cts_trailers (~2,402 followers, 215 following) — highlights for Products, Newsletters, Highlights, Golf Days, Vacancies
- Facebook: CTS Trailers | Cape Town
- Mix of product visibility, culture, recruitment, news, brand credibility

### Website security note
CTS's public website (`/products/`) currently exposes injected, unrelated casino-related spam pages (German/French/Polish/Bengali content) alongside real product listings. Likely signs of a compromised WordPress install or spam-injected content/SEO poisoning. Recommend raising this gently as a value-add during the meeting rather than leading with it:
> "During our initial review, we noticed some unrelated indexed content appearing beneath the public website. We can help you identify whether that is an SEO or website-security issue."

## Recommended In-App Exposure

### Shop vs. Mall decision
**Build CTS as a Shop, not a Mall** (at least initially).
- A "Mall" in the existing architecture (`mall/supplier`, `mall/transporter`, etc.) represents a whole category with many competing suppliers — inconsistent for a single company and dilutes exclusivity.
- A "Shop" (as used by `shop-content.tsx` / `ShopContent`) is the correct unit — single company's commercial storefront: profile, products, quote requests, reviews.
- Offer CTS a **Featured/Anchor Shop status** instead — top-of-registry placement, badge, and appearance across every relevant category (tippers, interlinks, parts, repairs) rather than just one, giving mall-like visibility without new page architecture.
- Revisit a real "Trailer & Truck Body Mall" only once multiple manufacturers are signed — present this as a v2 roadmap item to CTS.

### Structuring the Investment Conversation
Separate the two roles explicitly:
1. **As investor**: standard equity/convertible note terms like any other investor — no product favoritism tied to his cash (would undermine registry credibility).
2. **As channel partner (his day job)**: standard partner commercial terms available to any similar-sized supplier — this is what generates his internal KPI credit/commission and drives his personal motivation to push adoption.

### Value Propositions Beyond a Shop Listing (to drive 1,000 paid members @ R500/mo)
1. **Referral commission/attribution engine** — formalize a "CTS Partner Code" using existing `referrerId` / ISA / associate referral infrastructure. CTS (or the marketing director) gets a dashboard of signups plus revenue share or fixed spiff per paid conversion.
2. **Bundled onboarding incentive** — e.g., first 2 months free of the R500 bundle + a CTS service/parts voucher for signups via CTS link.
3. **CTS as a Loyalty redemption partner** — members redeem loyalty points (`connect/rewards`, `connect/loyalty`) for CTS parts/service discounts; two-way value exchange.
4. **Verified fleet financing / trade-in funnel** — pair CTS trailer sales with the lending/funding division ("Buy a CTS trailer, apply for finance through Logistics Flow").
5. **Fleet intelligence hook specific to trailers** — use `intelligence/transporter` and AI freight-matching to flag fleet age/replacement signals and prompt "Get a quote from CTS."
6. **Co-branded onboarding webinar/event** — leverage CTS's existing relationship-marketing style (e.g. "Golf Days") for a joint event/campaign to their customer list.

### Meeting Positioning
Frame as: "We have identified CTS as a high-value industrial node for the fleet and logistics community. We want to give your products direct exposure to transport operators who may need trailer manufacturing, repairs, parts, refurbishment, and specialised equipment." Not: "we want to advertise CTS in our app."

### Suggested Meeting Agenda
1. CTS's current sales channels
2. Strongest product categories
3. Geographic expansion priorities
4. Ideal customer profile
5. Repairs, parts, and after-sales opportunities
6. How they currently receive enquiries
7. Website and SEO health
8. Logistics Flow's verified industrial audience
9. Proposed 90-day exposure pilot
10. Success metrics and next steps

### Questions to Ask CTS
- Which trailer categories have the strongest margins?
- Growing manufacturing, repairs, parts, or refurbishment?
- Priority provinces outside the Western Cape?
- Ideal fleet operator customer profile?
- More new-build enquiries or after-sales work?
- Do they finance trailers or work with preferred finance providers?
- Quote response time?
- Product catalogues/brochures/technical data sheets available?
- Comfortable receiving leads through a digital portal?
- Aware of the unrelated casino content on their website?

### Recommended First Implementation
1. CTS partner record in the supplier/strategic-partner registry
2. Dedicated CTS profile page
3. Product categories and searchable tags
4. Featured partner badge
5. "Request a Quote" action
6. Tracked external website link
7. Partner-specific engagement and enquiry log
8. Basic exposure report

Suggested tags:
```
trailer-manufacturer
truck-bodies
tippers
interlinks
drawbar-trailers
side-tipping
repairs
refurbishment
parts
western-cape
fleet-equipment
```

## Discount / Incentive Mechanism (Revised)

Rather than a discount on the bundled Logistics Flow membership, the incentive should be a **discount on CTS's own sales**, locked in upfront and only applied to pre-tagged/matched customers. This is funded by CTS's own margin (not Logistics Flow revenue), is performance-based, and gives a clean attribution story for the marketing director.

### 1. Lock terms upfront via a Commercial Agreement record
Reuse the existing negotiation/agreement pattern (`proposeCommercialAgreement`, `runNegotiation`, `commercial-negotiations.tsx`, `brokerAgreements`) as a **Partner Discount Agreement**:
```
partnerAgreements/{agreementId}
  partnerId: "cts-trailers"
  discountType: "percentage" | "fixed"
  discountValue: e.g. 5 (%)
  appliesTo: "cts-sales-only"
  eligibilityRule: "tagged-customer" | "any-member"
  status: "proposed" | "accepted" | "active" | "expired"
  effectiveFrom / effectiveTo
  signedBy: marketing director's name/email
```
This is the single source of truth referenced everywhere the discount is displayed/applied.

### 2. Pre-populate CTS's customer list as tagged registry records
- Import CTS's customer/relationship list into `leads` or `partners` (via existing `BulkImportDialog.tsx`).
- Tag each record:
```
sourcePartnerId: "cts-trailers"
sourceType: "cts-existing-customer"
discountEligible: true
```
- Match on company name + phone/email so a new signup reconciles to the pre-existing tagged record (similar to the forensic lookup already done in `checkAndCreateUser` against `leads`/`partners` by email).

### 3. Auto-apply eligibility at signup, not at checkout
At membership signup (`/join` -> `checkAndCreateUser`):
```
if (matchedLeadOrPartner?.sourcePartnerId === 'cts-trailers' && matchedLeadOrPartner?.discountEligible) {
  companyDoc.cts_discount_eligible = true;
  companyDoc.cts_discount_ref = agreementId;
}
```
The flag travels permanently with the member's company record and is checked at CTS transaction time, not membership checkout — consistent with "discount on CTS sales, not on membership."

### 4. Enforce at the point of a CTS transaction
Wherever a member requests a quote or completes a purchase from the CTS Shop node, pull the flag + linked agreement and apply/display the discount (e.g., "CTS Preferred Customer Discount Applied").

### 5. Marketing page copy
Safe to advertise broadly since eligibility is silent until matched:
> "Existing CTS Trailers customers get an exclusive discount when they transact through Logistics Flow."

### Decision still open: silent auto-apply vs. claimable code
- **(a) Silent auto-apply** — best UX, harder for CTS to audit customer-by-customer.
- **(b) Named/trackable discount code** (e.g., "CTS-LF-XXXX") tied to the agreement ID — easier for CTS's sales/finance team to reconcile, and gives a clean redemption log for quarterly attribution reporting back to CTS.
- Leaning toward (b) given the need to prove attribution to the marketing director for renewal/expansion of the relationship.

### Next Implementation Steps (not yet built)
1. `partnerAgreements` collection + simple admin UI to create/lock CTS discount terms (reusing existing commercial-negotiation UI pattern)
2. Bulk-import tagging (`sourcePartnerId`, `discountEligible`) on top of existing `BulkImportDialog`
3. Signup-time reconciliation check in `checkAndCreateUser`
4. Display/apply discount on the CTS Shop's quote/purchase flow
