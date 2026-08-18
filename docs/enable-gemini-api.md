# How to Fix AI Feature "403 Forbidden" or "404 Not Found" Errors

If you are seeing a "403 Forbidden", "404 Not Found", or "API is blocked" error when using AI features, it means your `GEMINI_API_KEY` is missing, incorrect, or the API it uses is not enabled in your Google Cloud project.

**This is the most common error when using AI features for the first time.** Follow these steps carefully to resolve it.

---

### Step 1: Go to Google AI Studio and Select Your Project

1.  **Open Google AI Studio:**
    **[https://aistudio.google.com/](https://aistudio.google.com/)**

2.  **Sign in** if you aren't already. Use the account associated with your Google Cloud / Firebase project.

3.  **CRITICAL:** In the top-left corner, there is a dropdown menu. Click it and select your Google Cloud project (`ecosystem-hub`). This ensures that any API key you create is linked to the correct project where billing and APIs are managed.

    ![Select Project in AI Studio](https://storage.googleapis.com/static.aistudio.google.com/documentation/assets/project_picker.png)

### Step 2: Get Your API Key

1.  After selecting your project, click on the **"Get API key"** option in the left-hand navigation menu.

2.  A dialog will appear. Click the **"Create API key"** button.

3.  A new API key will be generated for you. **Copy this key immediately** and save it. This is your `GEMINI_API_KEY`.

### Step 3: Add the Key to Your `.env` File

1.  In the root directory of your project, find or create a file named `.env`.
2.  Add the following line, pasting the key you just copied:

    ```
    GEMINI_API_KEY=PASTE_YOUR_API_KEY_HERE
    ```

### Step 4: Enable the "Generative Language API"

This API must be enabled for your key to work. It's possible you have a key, but the service it talks to is turned off for your project.

1.  Go to the API Library page for the Generative Language API using this direct link for your project:
    **[https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=ecosystem-hub]**(https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=ecosystem-hub)

2.  Click the blue **"Enable"** button. If it says "Manage", the API is already enabled.

---

### Step 5: Restart Your Application

After saving the `.env` file, you must **restart your application** for the changes to take effect. If you are running `npm run dev`, stop the server (Ctrl+C) and run it again.

This process will resolve the API key and model access errors.
