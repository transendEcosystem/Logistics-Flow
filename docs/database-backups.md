# Firestore Database Backups & Data Protection

Protecting your 9,000+ industrial records requires using Google Cloud's native backup and export tools. Seeing a bucket named `ecosystem-hub-backups` is the first step, but you must verify that data is actually being sent there.

---

## 1. How to Check for Existing Backups

1.  **Open the Storage Browser**: Go to [Cloud Storage Buckets](https://console.cloud.google.com/storage/browser?project=ecosystem-hub).
2.  **Enter the Bucket**: Click on the name `ecosystem-hub-backups`.
3.  **Look for Folders**: If the bucket is working, you will see folders named by date/time (e.g., `2025-09-27T11:14:15_78923/`).
4.  **Check the "Last Modified" column**: If the bucket only contains the "Created" date from Sep 2025 and no sub-folders, no backups have been performed recently.

---

## 2. How to Perform a Manual Backup (Recommended Now)

If your bucket is empty, you should perform a manual export immediately to protect your data.

1.  **Go to Firestore Import/Export**: [Firestore Export Page](https://console.cloud.google.com/firestore/databases/-default-/import-export?project=ecosystem-hub).
2.  **Click "EXPORT"**: At the top of the page.
3.  **Select Destination**: Choose the bucket `ecosystem-hub-backups`.
4.  **Select Collections**: You can export "All Collections" or specific ones like `partners` and `leads`.
5.  **Start Export**: This process will run in the background. It may take several minutes for 9,000+ records.

---

## 3. Automated Backups (Point-in-Time Recovery)

If you are on the **Blaze (Pay-as-you-go) plan**, you can enable automatic protection that doesn't require manual exports.

1.  Go to [Firestore Settings](https://console.cloud.google.com/firestore/databases/-default-/settings?project=ecosystem-hub).
2.  Enable **Point-in-Time Recovery (PITR)**.
3.  This allows you to restore your database to any specific second in the last 7 days. This is the ultimate "Undo" button for your data.

---

## 4. Best Practices

*   **Export Before Bulk Actions**: Always perform a manual export before running a "Bulk Import" or "Duplicate Cleaner".
*   **Audit Logs**: The application is already configured to record every create, update, and delete action in the `auditLogs` collection. This provides a "Paper Trail" even if a backup hasn't been run.
*   **Capped Reads**: The app now uses a **100-record hard cap** for all lists. Always use the **Search Bar** to find specific records rather than scrolling, as this saves your data quota.
