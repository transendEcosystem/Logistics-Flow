# App Hosting Backend Creation Guide

You are seeing these prompts because this is the first time you are deploying to Firebase App Hosting. The command needs to create a "backend" resource in your Firebase project, which is a one-time setup.

After you select `Y` (yes) to create a new backend, you will be asked a few more questions. Here is a guide on how to answer them.

---

### Question 1: "Please specify a backend id"

This is just a name for your backend instance within Firebase. A simple, standard name is best.

**➡️ Recommended Answer:** Type `app` and press Enter.

---

### Question 2: "Please select a location"

This is the physical region where your app's server will run. You'll see a list of options.

**➡️ Recommended Answer:** Use the arrow keys to select `us-central1 (Iowa)` and press Enter. This is a good, general-purpose default.

---

### Question 3: "Please select a service account"

This is the identity your backend uses to operate. The deployment tool will create and suggest a default for you.

**➡️ Recommended Answer:** The prompt will show a default email address like `[your-project-number]-compute@developer.gserviceaccount.com`. Simply press **Enter** to accept the default.

---

After you answer these questions, the deployment will continue automatically. You will not be asked these questions again for future deployments.
