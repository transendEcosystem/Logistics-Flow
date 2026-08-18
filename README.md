
# Logistics Flow

This is the stabilized version of the Logistics Flow application, featuring the industrial registry, automated AI discovery, and the forensic engagement engine.

---

## Maintenance & Backups

To save your current work and push your changes to GitHub, run the following sequence in your terminal:

### Step 1: Stage All Your Changes
This command adds all new and modified files to be included in your backup.
```bash
git add .
```

### Step 2: Save Your Changes
Commit your changes with a descriptive message.
```bash
git commit -m "Manual Backup: [Description of your changes]"
```

### Step 3: Push Your Backup to GitHub
This uploads your saved changes to your remote repository.
```bash
git push
```

---

## Restoring Latest Code (Syncing with GitHub)

If your environment is out of sync or you want to fetch the latest code pushed to the repository, use these commands:

### Update Existing Project
```bash
git pull
npm install
```

### Recent Updates: Forensic V15 (Hierarchical Capital Nodes) - PUBLISHED
- **Sub-Node Authorization**: Implemented a selection-driven workflow for partitioning capital. Sub-limits are now explicitly hard-coded to parent ceilings via the `parentId` link.
- **Hierarchical Ledger**: Re-engineered the Expandable UI to render a forensic **Authorization Ledger** sub-table with creator tracking and real-time balance reconciliation.
- **Onboarding Streamlining**: Removed legacy NCA, Footprint, and Management Account steps to optimize the forensic intake velocity.
- **Stakeholder Sync**: Implemented automated `useEffect` triggers to ensure Shareholder and Director forms initialize correctly based on governance counts.
- **Persistence Stability**: Resolved critical API ReferenceErrors and form submission logic to ensure 100% data durability.

## Forensic V14 (The Triple Engine)
- **Commercial Node Ledger**: Partitioned the membership model into **Access Tiers** (for functional limits) and **Data Silos** (for B2B IP).
- **Inbound Interest Ledger**: Implemented "Blind Lead" signal tracking on the Member Dashboard to drive Intelligence upgrades.
- **V14 Forensic Protocol**: Upgraded the AI Scavenger to V14, introduced "Inductive Reconstruction" for social-media bio mining and employee-to-contact resolution.
- **IP Valuation Pitch**: Refactored the Investor Offer to center on **Anonymization as a Commodity** and the Triple Engine model.
- **UI Stability**: Resolved ReferenceErrors in the Pricing Ledger and ensured all Platform Capabilities checkboxes are fully responsive.

## Forensic V13 (The Performance Bridge)
- **Automated Engagement Engine**: Implemented the "Auto-Pilot" dispatch hub and SendGrid webhook listener for forensic bounce tracking.
- **504 Timeout Resolution**: Enforced 500-record query limits and prioritized `updatedAt` sorting.
- **Sectional Mining**: Introduced sectional "Contact Card" mining for single-page industrial websites.
