# Troubleshooting Outlook "550 5.1.8" Outbound Spam Errors

If you receive an error message containing **'550 5.1.8 Access denied, bad outbound sender AS(42004)'**, your Microsoft 365 account has been restricted from sending external emails.

---

## Why did this happen?
Microsoft 365 uses automated systems to detect "spam-like" behavior. When you send many similar emails (like the Digital Handshake) in a short period, the system flags the account to prevent the server's reputation from being damaged.

---

## Step 1: Unblock Your Account (Immediate Fix)
Only an administrator (or you, if you have admin access) can lift this block.

1.  Log in to the **[Microsoft 365 Defender Portal](https://security.microsoft.com/restrictedusers)**.
2.  In the left-hand navigation, go to **Email & collaboration** > **Review** > **Restricted users**.
3.  Find your email address in the list.
4.  Select the user and click **Unblock**.
5.  Wait about 1 hour for the changes to propagate before sending another email.

---

## Step 2: Prevent Future Blocks
To keep your account active while doing outreach:

1.  **Reduce Velocity**: Do not send more than 20 handshakes per hour. Spread your outreach throughout the day.
2.  **Use Versions**: Rotate between **V1 through V5** in the Engage Wizard. The app now varies the text deterministically for every partner to make each email unique.
3.  **Personalize**: If possible, add a custom sentence at the top of the email before clicking send in Outlook.
4.  **Clear Outbox**: Ensure you don't have a backlog of unsent emails in your Outlook "Outbox" folder, as this can trigger a secondary "Bulk Send" flag.

---

## Step 3: Transition to Professional Sending (Long-Term)
If you plan to send thousands of handshakes, using a personal Outlook inbox is not recommended. You should consider integrating a dedicated transactional service like:
*   **SendGrid**
*   **AWS SES**
*   **Mailchimp (Mandrill)**

These services are built specifically for high-volume outreach and will not block your primary business email.
