# Deploying Your Application to Firebase App Hosting

This guide will walk you through the process of publishing your Next.js application, making it live on the internet for everyone to access.

**Prerequisites:**

Before you can deploy, you may need to have the Firebase Command Line Interface (CLI) installed and be logged into your Firebase account from the terminal.

### Step 1: Install the Firebase CLI (If Needed)

If you haven't already installed the Firebase CLI, open a terminal in your project and run the following command. You only need to do this once.

```bash
npm install -g firebase-tools
```

### Step 2: Log in to Firebase (If Needed)

If you aren't logged in via the terminal, run the following command. This will open a new browser window for you to sign in to the Google account associated with your Firebase project.

```bash
firebase login
```

---

## The Deployment Process

Once you are logged into the Firebase CLI, deploying your app is a two-step process.

### Step 3: Build Your Application

Before deploying, you need to create a production-ready version of your app. This command compiles your code, optimizes your assets, and gets everything ready for the server.

In the terminal, run:

```bash
npm run build
```

You will see output in the terminal as Next.js builds your pages. Wait for this process to complete.

### Step 4: Deploy to Firebase App Hosting

This is the final step. The following command will take your built application and upload it to Firebase App Hosting, making it live at your project's public URL.

In the terminal, run:

```bash
firebase deploy --only apphosting
```

The CLI will show you the progress of the deployment. When it's finished, it will display the public URL where your app is now live! It will look something like `https://your-project-name.web.app`.

That's it! Your application is now published and accessible to the world.
