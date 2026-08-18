
# Enabling Firebase Storage

The application uses Firebase Storage to save and manage user-uploaded assets like shop images, product photos, and AI-generated content. For the upload functionality to work, you must first enable the Storage service in your Firebase project and ensure the backend has the correct permissions.

---

## Step 1: Go to the Firebase Console

1.  Open the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project (`ecosystem-hub`).

## Step 2: Navigate to Storage

1.  In the left-hand navigation menu, under the **Build** section, click on **Storage**.

## Step 3: Get Started with Storage

1.  If Storage is not enabled, you will see a "Get started" button. Click it.
2.  A dialog will appear to guide you through setting up security rules. It is recommended to start in **Production mode**. Click **Next**.
    *   *Production mode* starts with all reads and writes disallowed, which is a secure default. The application's own security rules (`storage.rules`) will be applied automatically to grant the necessary permissions.
3.  You will then be asked to choose a location for your Storage bucket. The default location selected for you is usually the best choice. Click **Done**.

It may take a moment for your Storage bucket to be created.

**After you click "Done", the setup is complete.** You will be taken to the file browser view. You should see your bucket name (e.g., `ecosystem-hub.appspot.com`) at the top, and there will be no more "Get Started" button. This means you are finished with this step.

---

## Step 4: Grant Backend Permissions (The Critical Step)

This is the most important step to solve upload and deployment errors. Your App Hosting backend runs using a specific service account, and this account needs permission to manage your Storage bucket.

### 4.1: Find Your Backend's Service Account Email

1.  Go to the Google Cloud Console's main **IAM** page for your project: **[IAM & Admin](https://console.cloud.google.com/iam-admin/iam?project=ecosystem-hub)**
2.  In the list of principals (members), find the one named **"Compute Engine default service account"**. This is the service account your backend code uses by default.
3.  Its email address will look like `[your-project-number]-compute@developer.gserviceaccount.com`. Copy this email address.

### 4.2: Grant the Correct "Storage Admin" Role

**Important:** Make sure you are on the main **IAM** page, which lists all principals (members). The "+ GRANT ACCESS" button is located at the top of this main page.

1.  On the main **IAM** page, click the **+ GRANT ACCESS** button at the top.
2.  In the **"New principals"** field that appears, paste the service account email you just copied.
3.  In the **"Select a role"** dropdown, search for and select **"Storage Admin"**. This role provides the necessary permissions for the backend to find and manage the storage bucket, which is required to fix the "Bucket Not Found" error and deployment issues.
4.  Click **Save**. A "Policy updated" message will appear. It may take a minute or two for permissions to take effect.

After completing these steps, the deployment functionality within your application will work correctly. You do not need to make any further configuration changes.
