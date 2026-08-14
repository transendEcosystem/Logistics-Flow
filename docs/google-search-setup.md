# Configuring Google Search for the Leads AI Agent

Google has recently changed their policy: **New search engines can no longer search the "Entire Web" without a specialized enterprise agreement.** Instead, they are restricted to a list of up to 50 domains.

To get the Leads AI Agent working, we use a **"Business Whitelist"** strategy. By telling Google to search the 50 most data-rich business sites, the AI can still find almost any company.

---

## Step 1: Update your Search Engine Settings

1.  Go to the [Programmable Search Control Panel](https://programmablesearchengine.google.com/controlpanel/all).
2.  Select your search engine.
3.  On the **Basics** tab, find the **"Sites to search"** section.
4.  If "Search the entire web" is **OFF** and cannot be turned on, you must add the whitelist below.
5.  Click **"ADD"** and copy-paste the following list of domains (one per line). 

### The "Forensic" Whitelist (Optimized for SA Industry)
Copy and paste these into your "Sites to search" list. **Note the `/*` at the end, which is required by Google:**
```text
linkedin.com/*
facebook.com/*
instagram.com/*
twitter.com/*
x.com/*
infoisinfo.co.za/*
government.co.za/*
yep.co.za/*
constructionsite.co.za/*
thinklocal.co.za/*
yellosa.co.za/*
toprated.co.za/*
southafricayp.co.za/*
braby.com/*
sayellow.com/*
easyinfo.co.za/*
hotfrog.co.za/*
cylex.net.za/*
yalwa.co.za/*
foursquare.com/*
yelp.com/*
glassdoor.com/*
crunchbase.com/*
bloomberg.com/*
reuters.com/*
news24.com/*
moneyweb.co.za/*
businesstech.co.za/*
businesslive.co.za/*
itweb.co.za/*
engineeringnews.co.za/*
transportworldafrica.co.za/*
logisticsupdateafrica.com/*
fleetwatch.co.za/*
focusontransport.co.za/*
truckandtrailer.co.za/*
autotrader.co.za/*
gumtree.co.za/*
junkmail.co.za/*
bidorbuy.co.za/*
snupit.co.za/*
b2byellowpages.com/*
kompass.com/*
zoominfo.com/*
apollo.io/*
dnb.com/*
whitepages.com/*
local.com/*
chamberofcommerce.com/*
bbb.org/*
manta.com/*
mapquest.com/*
bing.com/*
bizcommunity.com/*
gov.za/*
govpage.co.za/*
sa-tenders.co.za/*
```

---

## Step 2: Get Your Credentials

1.  **API Key:** Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=ecosystem-hub) and create an **API key**.
2.  **Search Engine ID:** Copy the **Search engine ID** from the top of the Search Engine Basics page (e.g., `3457246c678064558`).

---

## Step 3: Enable the API (CRITICAL)

The "403 Access Denied" error means this step was missed.
1.  Click this link: **[Enable Custom Search API](https://console.cloud.google.com/apis/library/customsearch.googleapis.com?project=ecosystem-hub)**.
2.  Click the blue **"ENABLE"** button.

---

## Step 4: Update Your .env File

Paste both values into your `.env` file. **Do not use quotes.**

```text
GOOGLE_SEARCH_API_KEY=YOUR_API_KEY_HERE
CUSTOM_SEARCH_ENGINE_ID=YOUR_ID_HERE
```

## Step 5: Restart Your Server
Stop your terminal (`Ctrl+C`) and run:
```bash
npm run dev
```

The AI agent will now use the "Business Whitelist" to find your leads.
