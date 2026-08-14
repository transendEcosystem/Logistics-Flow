# How to Fix `git push` Authentication Errors

If you're having trouble pushing your code to GitHub and are being asked for a username and password (or a token), it's almost always because your environment needs a **Personal Access Token (PAT)**. GitHub no longer allows password authentication for Git operations.

---

### Step 1: Go to Your GitHub Developer Settings

1.  Go directly to the **Personal Access Tokens** page on GitHub by clicking this link:
    **[https://github.com/settings/tokens](https://github.com/settings/tokens)**

2.  You may be asked to sign in to your GitHub account.

### Step 2: Generate a New Token

1.  On the Personal Access Tokens page, click the **"Generate new token"** button. Select **"Generate new token (classic)"**.
2.  **Note:** Give your token a descriptive name so you remember what it's for, e.g., "Firebase Studio App".
3.  **Expiration:** Set an expiration date. 30 days is a good default for security.
4.  **CRITICAL - Select Scopes:** This is the most important part. You must give the token permission to access your repositories. Check the box next to **`repo`**. 
5.  Scroll to the bottom and click the green **"Generate token"** button.

### Step 3: Copy and Save Your New Token

1.  After generating the token, you will be shown your new token string. It will start with `ghp_`.
2.  **This is the only time you will see this token.** Copy it immediately and save it somewhere safe and private.

---

### Step 4: Update Your Identity (For Google Workspace Transition)

If you have switched to a professional email like `michael@logisticsflow.co.za`, you should update your Git configuration in the terminal so your commits are attributed correctly.

1.  Open the terminal in Firebase Studio.
2.  Run the following commands:
    ```bash
    git config --global user.name "Michael"
    git config --global user.email "michael@logisticsflow.co.za"
    ```

---

### Step 5: Use the Token to Push Your Code

1.  Run the `git push` command:
    ```bash
    git push
    ```
2.  The terminal will prompt you for your `Username`. Enter your **GitHub username**.
3.  The terminal will then prompt for your `Password`. **Do NOT enter your GitHub password.** Instead, **paste the Personal Access Token (PAT)** you copied in Step 3.

*Note: When you paste the token, it might not show any characters. Just paste and press Enter.*