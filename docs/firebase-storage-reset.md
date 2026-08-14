
# How to Safely Reset Firebase Storage

If you are consistently seeing a "Bucket Not Found" error even after verifying all code and permissions, the underlying storage resource in Firebase may not have been provisioned correctly. A hard reset can fix this.

**WARNING:** This process involves deleting your storage bucket. Proceed only if you are sure you have no critical data in it. Since file uploads have been failing, it is likely empty.

---

## Step 1: Delete the Current Bucket (If It Exists)

1.  Open the [Google Cloud Storage Browser for your project](https://console.cloud.google.com/storage/browser?project=ecosystem-hub).
2.  You will see a list of buckets. If you see a bucket named `ecosystem-hub.appspot.com` or `ecosystem-hub-files`, check the box next to it.
3.  Click the **"DELETE"** button at the top.
4.  A confirmation dialog will appear. You will need to type the bucket's name exactly as shown to confirm the deletion. This is a safety measure.
5.  Click the final **"DELETE"** button.

---

## Step 2: Create a New, Custom-Named Bucket (The Definitive Method)

The Firebase Console UI can sometimes fail. This method uses the Google Cloud Console directly and is the most reliable way to create the bucket with the correct settings. It uses a custom name to avoid project policy errors.

1.  **Go to the Google Cloud Storage Browser:**
    **[https://console.cloud.google.com/storage/browser?project=ecosystem-hub](https://console.cloud.google.com/storage/browser?project=ecosystem-hub)**

2.  Click the **"CREATE BUCKET"** button at the top.

3.  **Name your bucket:** This is the most critical step. You **MUST** name your bucket exactly:
    `ecosystem-hub-files`

4.  **Choose where to store your data:** Select a "Region" or "Multi-region" and choose a location (e.g., `us-central1` or `us`). Click **Continue**.

5.  **Choose a storage class:** You can leave the "Standard" default. Click **Continue**.

6.  **CRITICAL: Choose how to control access:**
    *   Select **"Uniform"**.
    *   **UNCHECK** the box that says **"Enforce public access prevention on this bucket"**. This is required for your app to display uploaded images.
    *   Click **Create**.

7.  **FINAL CONFIRMATION:** You may be prompted to confirm that the bucket will be public. Click **"CONFIRM"**. This is necessary for images to be viewable in your app. Your `storage.rules` file will still protect against unauthorized writes.

---

## Step 3: Wait and Retry

After following the steps above, please wait at least **5 minutes** for all permissions and settings to propagate across Google's systems.

After waiting, please return to the application and try uploading an image again. This process will have cleared any underlying configuration errors and will resolve the "Bucket Not Found" issue.
