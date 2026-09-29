# Delivery Status

Last updated: 2026-08-27

## Lending platform

- [x] Resolve TypeScript compile errors
- [x] Create lending application operating-layer model
- [x] Add lending application create/read API
- [x] Add borrower intake queue
- [x] Add validated application lifecycle transitions
- [x] Add audit logging for application decisions
- [x] Add operator controls for review, approval, decline, and disbursement
- [x] Add decision notes, risk band, and approval-limit editor to the operator UI
- [x] Add conditions and offer acceptance workflow
- [x] Add repayment schedule, payment posting, arrears, and closure workflow
- [x] Add client-authenticated lending account API and `/account` lending view
- [x] Expose client applications, offers, schedules, raised status, balances, invoices, ledger activity, and document downloads
- [x] Define separate physical-asset ownership and receivable-rights architecture for lending agreements
- [x] Distinguish agreement assets from security and collateral registers
- [x] Prevent discounting agreements from claiming ownership of the underlying asset
- [x] Capture structured borrower, purpose, asset, liability, security, and surety disclosures at application intake
- [x] Add Client Protocol Terminal steps for bank statements, management accounts, AFS, auditors, trading history, assets, and collateral granted
- [x] Add case-scoped Discovery register preserving declarations and auditable source-based variances
- [x] Add controlled public discovery spider for company and asset evidence cross-checking
- [ ] Build the credit evaluation pack and credit-committee decision workflow from Discovery evidence
	- [x] Include existing-client internal agreement conduct and transaction-ledger position in the credit evaluation pack
	- [x] Identify new clients explicitly where no internal credit history exists
	- [x] Add typed repayment schedule calculation
	- [x] Raise installment amounts as debit transactions
	- [x] Post bank receipts as credit transactions
	- [x] Support debit and credit adjustment journals
	- [x] Add idempotent transaction references
	- [x] Require a settled transaction-ledger balance before closure
	- [x] Add operator transaction-ledger controls for schedule selection and installment raising
	- [x] Show raised date/check and record raised installments as now-due debit transactions
	- [x] Support agreement-level installment raising for one selected facility
	- [x] Build global utility installment raising for all active schedules in a stipulated month
	- [x] Require separate installment month and effective run date for global raising
	- [x] Preserve installment date and effective date on raised ledger entries and invoices
	- [x] Ask whether to invoice after global installment raising
	- [x] Generate sequential invoice numbers for raised installments
	- [x] Add installment-sale invoice note: "Ownership does not pass until paid for in full"
	- [x] Attach invoice references to installments and save invoices in client files
	- [x] Store lending invoices in the company invoice collection used by `/account`
	- [x] Existing account billing surface supports invoice viewing and Print / Save PDF
	- [x] Add receipt and adjustment journal entry controls
	- [x] Add arrears view and facility closure controls

## Document intelligence

- [x] Identify standard lending document requirements
- [x] Add upload-only document fields to the client wizard
- [x] Store uploaded originals in Firebase Storage and retain document URLs on the client record
- [x] Persist standard document checklist status on the lending client record
- [ ] Add required-document enforcement at underwriting/approval stage
- [ ] Add OCR and structured field extraction (deferred until lending architecture is complete)
- [ ] Add extraction validation and human correction workflow (deferred)
- [ ] Link verified document fields to underwriting (deferred)

## Asset register architecture

- [x] Distinguish physical assets from receivable rights
- [x] Keep client-owned collateral off stock until enforcement and recovery into lender possession
- [x] Classify installment sale as deferred sale with stock exit at agreement implementation
- [x] Classify lease as stock retained and depreciated during the lease
- [x] Support rent-to-own lease residual/balloon with stock exit only after settlement
- [x] Classify discounting as an out-and-out cession of receivable rights without underlying-asset ownership
- [x] Add idempotent asset-accounting event and journal records
- [x] Define stock-credit journal treatment for installment-sale implementation and rent-to-own residual settlement
- [x] Post depreciation journals while lease assets remain in stock
- [x] Record discounting cession-rights journals without underlying-stock movement
- [x] Add Asset Register controls for posting lifecycle accounting events
- [x] Capture event date, effective date, amount, and reference for each asset event
- [x] Add booking status and facility-letter precondition checklist
- [x] Gate Booking to Live release through authorized admin staff and audit the release
- [x] Automatically issue installment-sale invoice and stock-account journal at Booking to Live release
- [x] Calculate rent-to-own settlement book value and profit/loss against the balloon payment
- [x] Automatically issue rent-to-own invoice when the residual settlement event is posted
- [x] Add Asset Accounting reporting view for lifecycle events, journals, book value, and profit/loss

## External integrations

- [x] Add provider adapter contract and secure credential references
- [x] Reject raw integration secrets and store only Secret Manager/environment references
- [x] Add integration request and response records
- [x] Add integration status, timestamps, error details, and related lending entity references
- [x] Add idempotency-key duplicate protection and integration audit events
- [x] Add provider-neutral accounting journal export and reconciliation records
- [ ] Connect accounting export to a live configured provider
- [ ] Add credit-bureau request, response, consent, and audit workflow
- [x] Add provider-neutral credit-bureau workflow step with consent, deferred/pending outcome, and audit completion
- [ ] Add retry, idempotency, and integration health monitoring

## Release readiness

- [ ] Run end-to-end lending workflow checks
- [ ] Run document and integration security review
- [ ] Run final public-site and production smoke test
