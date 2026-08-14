
# Setting up Google Analytics

To view detailed analytics and track user behavior in your application, you need to connect it to a Google Analytics 4 (GA4) property. This guide will walk you through creating a property, getting your Measurement ID, and adding it to your project.

## Step 1: Create a Google Analytics 4 Property

1.  Go to the [Google Analytics homepage](https://analytics.google.com/). You may need to create an account or sign in if you haven't already.

2.  Navigate to the **Admin** section. You can find this by clicking the gear icon (⚙️) in the bottom-left corner.

3.  In the "Property" column, click the dropdown and select **"Create Property"**.

4.  **Property Setup:**
    *   **Property name:** Enter a name for your property (e.g., "Logistics Flow App").
    *   **Reporting time zone:** Select your local time zone.
    *   **Currency:** Select your currency (e.g., South African Rand).
    *   Click **Next**.

5.  **Business details:**
    *   Select your **Industry category** (e.g., "Travel > Ground Transport").
    *   Select your **Business size**.
    *   Click **Next**.

6.  **Business objectives:**
    *   Choose your objectives. A good starting point is "Generate leads" and "Examine user behavior".
    *   Click **Create**.

7.  **Data Collection:**
    *   You'll be asked to choose a platform. Select **"Web"**.
    *   **Website URL:** Enter the URL where your app is hosted. If you're running it locally for now, you can use `http://localhost:3000`.
    *   **Stream name:** Give your data stream a name (e.g., "Web App Stream").
    *   Ensure **"Enhanced measurement"** is turned ON. This automatically tracks important events like page views and scrolls.
    *   Click **"Create stream"**.

## Step 2: Get Your Measurement ID

1.  After creating your stream, you will be taken to the "Web stream details" page.

2.  In the top-right corner, you will see your **Measurement ID**. It will look like `G-XXXXXXXXXX`.

3.  **Copy this Measurement ID**. This is your `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`.

## Step 3: Update Your `.env` File

1.  Open the `.env` file in the root directory of your project.

2.  Add a new line and paste the Measurement ID you copied. It should look like this:

    ```
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
    ```

    (Replace `G-XXXXXXXXXX` with your actual ID).

3.  **Save the `.env` file.**

4.  **IMPORTANT:** You must restart your development server for this change to take effect. If your app is running, stop it (e.g., by pressing `Ctrl+C` in the terminal) and start it again (`npm run dev`).

## Step 4: Verify the Connection

1.  Open your application in your browser.

2.  Go back to your Google Analytics dashboard. Navigate to **Reports > Realtime**.

3.  You should see yourself as an active user within a minute or two. As you navigate around your app and click on the elements we've tagged, you will see events like `page_view`, `intent_capture`, and `view_supplier_profile` appear in the "Event count by Event name" card.

That's it! Your application is now sending detailed analytics data to Google Analytics.
