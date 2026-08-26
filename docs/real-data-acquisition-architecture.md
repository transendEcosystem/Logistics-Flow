# Real Data Acquisition Architecture for Logistics Flow

## Objective

Build the strongest possible system for getting relevant, real-world business data into the app, with a focus on:

- breadth of discovery
- real evidence from live sources
- structured output for app use
- validation and confidence scoring
- freshness over time

The goal is not to rely on a single AI prompt. The goal is to build a data acquisition pipeline that can continue collecting, verifying, and updating records automatically.

---

## Core principle

A single prompt is useful for demos, but not for trustworthy production-grade data collection.

The strongest architecture combines:

1. Discovery
2. Verification
3. Extraction
4. Normalization
5. Storage
6. Refresh

---

## Why the current prompt-based approach is limited

A prompt can help with general research, but the strictest real-data workflows require page-level verification:

- open the real website
- inspect Home / About / Contact / Services pages
- verify business details against the actual page content
- cross-check against social profiles and directories
- record the exact source URLs used

That requires browser automation or a true web-crawl step, not just a Google Search tool.

This app already has a Google Search wrapper in `src/ai/tools/google-search.ts`, which is great for discovery but not sufficient for exact page verification.

---

## Recommended architecture

### 1. Discovery layer

Use multiple discovery sources to find likely business records.

Recommended sources:

- Google Custom Search
- business directories
- company registry data
- social media pages
- industry listings
- tender and procurement databases
- news mentions

Purpose:

- find likely companies
- identify domains and social profiles
- build candidate records for verification

This layer answers: “Who exists and where to look?”

### 2. Verification layer

This is the most important step.

Use browser automation such as Playwright or Puppeteer to:

- open the candidate home page
- inspect navigation and key pages
- review About, Contact, Services, Team pages
- confirm the entity matches the target business
- gather address, phone, email, and service wording directly from the site

Purpose:

- turn a search result into a credible fact
- confirm a company is the correct entity
- avoid stale or fake directory data

This layer answers: “Is this real, relevant, and trustworthy?”

### 3. Extraction layer

Once the site is open, extract structured fields into the app schema.

Recommended fields:

- companyName
- industrial_category
- website
- email
- phone
- address
- socialProfiles
- marketingManager
- operationsManager
- technicalManager
- ceo
- otherStaff
- minedServiceWording
- sourceUrls
- confidence
- conflicts
- unverifiedFields

The extraction should use consistent formats and reject invented or inferred values.

### 4. Normalization layer

Normalize all extracted values before they enter the database.

Examples:

- unify phone formats
- standardize company names and categories
- standardize URLs to full https addresses
- normalize social profile URLs
- clean address strings
- strip irrelevant site navigation or cookie text

This keeps your app internally consistent and easier to search.

### 5. Confidence and validation layer

Every record should receive a confidence score and validation status.

Suggested rules:

- official website + matching social page + consistent contact data = high confidence
- directory-only data = medium confidence
- search snippet only = low confidence
- conflicting sources = mark as conflict and reduce confidence
- missing evidence = record as null, not invented

Never fabricate a field. If the evidence is not visible on a source, set it to null.

### 6. Storage layer

Store both the normalized record and the evidence trail.

Recommended structure:

- canonical record table
- raw source evidence table
- contact history table
- social profile table
- verification log table

This allows the app to show:

- the current verified record
- which URLs were used
- what changed over time
- why a field is null or uncertain

### 7. Refresh and enrichment loop

Data quality improves when the system continues to revisit the same records.

Recommended jobs:

- re-verify website presence weekly or monthly
- refresh stale phone and email data
- check for updated social profiles
- detect new address or ownership changes
- re-score confidence based on new evidence

This keeps the app alive and reduces drift over time.

---

## Best practical implementation for this project

If we want a strong starting point without overengineering, the best near-term solution is:

### Phase 1: Discovery + verification

- Google Custom Search for candidate discovery
- Playwright for page verification of the best few candidates
- extract real company data from Home / About / Contact / Services pages
- capture full URLs as evidence
- save verified fields with confidence

### Phase 2: Structured database ingestion

- map extracted fields into the app schema
- store raw URLs and source snapshots
- store confidence and verification notes

### Phase 3: Refresh automation

- schedule periodic checks
- update stale records
- remove or lower confidence for invalid data

---

## Recommended stack

For a production-quality implementation, I would use:

- Search layer: Google Custom Search API
- Browser layer: Playwright
- Extraction layer: structured LLM extraction with schema validation
- Storage: Postgres or Firestore with normalized structured records
- Search/index: optional vector search or search index for normalized records
- Scheduling: background jobs for periodic refresh and enrichment

This combination is much stronger than a single prompt-based workflow.

---

## Key design principle

Use search for breadth and browser automation for truth.

Search tells you where to look. Browser verification tells you what is actually true.

A good data acquisition system should always prefer evidence over inference.

---

## Bottom line

The most powerful comprehensive approach is:

- search broadly to find candidates
- verify them in a browser
- extract structured data from real pages
- normalize and score the result
- store evidence and refresh over time

That yields better quality, better trust, and much more useful real data than a single AI prompt can provide.

---

## Recommended next step

The next preferred implementation is not a new project or a fresh start. It is to add a focused verification pipeline inside the existing app:

1. discovery service
2. verification browser service
3. extraction and normalization service
4. database write layer
5. scheduled refresh job

This provides the highest value with the least risk of building a fragile one-off prompt solution.

---

## Short summary

If the goal is “get as much relevant real data into the app as possible,” the winning strategy is:

- broad discovery
- real page verification
- structured extraction
- confidence scoring
- ongoing refresh

That is the strongest production architecture for real-world business intelligence.
