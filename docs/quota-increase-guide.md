
# How to Handle "Resource Exhausted" Errors (429 Rate Limits)

If you are encountering "Resource Exhausted" or "429" errors, it typically means you are hitting a specific API's rate limit or quota. This is most common when using AI features (Gemini) or frequent external API calls.

---

## Step 1: Identify the Exhausted Resource

1.  Open the **[Quotas page in the Google Cloud Console](https://console.cloud.google.com/iam-admin/quotas?project=ecosystem-hub)**.
2.  Use the **"Filter"** bar at the top to search for the service.

### For AI and Generative Features (Gemini):
1.  Search for **"Generative Language API"**.
2.  Look for quotas like:
    *   `Generate content requests per minute per project`
    *   `Generate content requests per day per project`
3.  On the free tier, Gemini has a strict limit (typically 15 requests per minute).

---

## Step 2: How to Resolve

### 1. Wait a Minute
Most "Requests Per Minute" (RPM) limits reset every 60 seconds. If you were performing heavy tasks (like generating multiple leads or using the Marketing Studio), simply waiting a moment will often resolve the issue.

### 2. Request a Quota Increase
If you consistently hit these limits on a Blaze (pay-as-you-go) plan:
1.  Check the box next to the quota you want to increase (e.g., `Generate content requests per minute`).
2.  Click **"EDIT QUOTAS"** at the top of the list.
3.  Enter your desired new limit (e.g., 60 or 100).
4.  Provide a brief justification (e.g., "Onboarding many transporters using AI lead tools and content generation").
5.  Submit the request. Many are approved automatically within minutes.

### 3. Check API Key Tier
If you are using a Gemini API Key from Google AI Studio, ensure you haven't exceeded the free monthly limits. You can enable billing in AI Studio to move to a higher tier with significantly higher rate limits.

---

## Technical Note
The application uses optimized Firestore listeners and memoized components to minimize non-AI API usage. If you see "Resource Exhausted" outside of AI features, please contact technical support to check for potential infinite loops in custom components.
