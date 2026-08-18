# Setting up Your Gemini API Key

To enable the AI features in your application, you need a Gemini API key.

## Step 1: Get Your Gemini API Key

1.  Visit the **[Google AI Studio](https://makersuite.google.com/app/apikey)**.
2.  You may be prompted to log in with your Google account and agree to the terms of service.
3.  Click the "**Create API key**" button.
4.  A new API key will be generated for you. **Copy this key immediately** and save it somewhere safe. This is your `GEMINI_API_KEY`.

**Important:** If you see multiple keys listed (e.g., "Gemini API Key" and "Generative Language API Key"), you must choose the one named **"Generative Language API Key"**. This is the key the application is configured to use.

## Step 2: Update Your `.env` File

You now have the required key. Paste it into your `.env` file in the root of your project.

```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

## Step 3: Enable the API & Restart

For the key to work, you must also enable the correct API in your Google Cloud project.

Please see the full instructions in the **`docs/enable-gemini-api.md`** guide. After updating your `.env` file, you must **restart your application**.
