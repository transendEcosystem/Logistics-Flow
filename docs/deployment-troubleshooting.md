# Troubleshooting First-Time Deployment Errors

If you encounter an "Unexpected Error" immediately after the `Did not find backend(s)` prompt during your first deployment, this guide will help you resolve it.

---

### The Most Common Cause: Service Account Provisioning

The most frequent reason for this error is a simple timing issue. When you deploy to App Hosting for the first time, Firebase creates a new "service account" in the background to manage your app's resources. The CLI tool often shows a warning about this:

```
⚠  Your App Hosting compute service account is still being provisioned in the background. If you encounter an error, please try again after a few moments.
```

It can take a few minutes for all the necessary permissions for this new account to become active across all of Google Cloud's systems. If the deployment command proceeds too quickly, it can fail with a generic "unexpected error" because the permissions aren't ready yet.

### **Primary Solution: Wait and Retry**

1.  **Wait for 3-5 minutes.** This gives the Google Cloud backend time to finish setting up all the necessary permissions.
2.  **Run the exact same command again:**
    ```bash
    firebase deploy --only apphosting
    ```

In over 90% of cases, simply waiting and retrying will resolve the issue, and the deployment will proceed to the next step where it asks for a backend ID.

---

### If the Error Persists: Manually Check Permissions

If you've waited and the error still occurs, you can manually verify the permissions.

1.  **Go to the Google Cloud IAM page for your project:**
    **[https://console.cloud.google.com/iam-admin/iam?project=ecosystem-hub](https://console.cloud.google.com/iam-admin/iam?project=ecosystem-hub)**

2.  **Find the App Hosting service account.** Look for a principal (member) with an email address that looks like:
    `service-[your-project-number]@gcp-sa-apphosting.iam.gserviceaccount.com`

3.  **Check its roles.** Ensure this service account has the **"Firebase App Hosting Deployer"** role. If it is missing, you may need to grant it, but typically this is done automatically. The fact that it's being created indicates the process has started.

If the role is there, it's a strong sign that the issue is still just a propagation delay. Please try waiting another 5-10 minutes before deploying again.

---

### Last Resort

If you are still blocked after a significant amount of time, it's possible the project's provisioning state is stuck. In this very rare case, you can follow the [Project Recovery Guide](docs/project-recovery-from-git.md) to clone your code into a fresh environment, which will start the provisioning process cleanly.
