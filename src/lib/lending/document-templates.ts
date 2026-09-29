import {
  amountInWords,
  calculatePvLoan,
  formatLongDate,
  formatRand,
  ordinalDay,
  PvLoanResult,
} from './loan-pv-calculations';

export interface DocumentBranding {
  companyName: string;
  registrationNumber: string;
  logoUrl: string;
  addressLines: string[];
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  signatoryName: string;
  signatoryTitle: string;
}

export const DEFAULT_BRANDING: DocumentBranding = {
  companyName: 'Simplyfi Flow (Pty) Ltd',
  registrationNumber: '2017/123456/07',
  logoUrl: '/logo.png',
  addressLines: ['Centex Close', 'Sandton', '2148', 'South Africa'],
  contactEmail: 'lending@logisticsflow.co.za',
  contactPhone: '+27 11 566 2000',
  websiteUrl: 'www.logisticsflow.co.za',
  signatoryName: 'Michael Koton',
  signatoryTitle: 'Director',
};

export interface LoanPvMergeData {
  trackingRef: string;
  documentDate: string;
  clientName: string;
  clientRegistrationNumber: string;
  clientAddress: string;
  clientContact: string;
  clientSignatoryName: string;
  clientSignatoryIdNumber: string;
  ncaStatus: string;
  loanPurpose: string;
  principal: number;
  annualRatePercent: number;
  numberOfInstalments: number;
  firstInstalmentDate: string;
  facilityDate: string;
  approvalAssumptions: string[];
  suspensiveConditions: string[];
  specialConditions: string[];
  signedAtPlace: string;
}

export type DocumentBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[]; numbering?: string[] }
  | { kind: 'keyValueTable'; rows: Array<{ label: string; value: string }> }
  | { kind: 'table'; columns: string[]; rows: string[][] }
  | { kind: 'acceptance'; title: string; body: string[] }
  | { kind: 'signatureBlock'; title: string; fields: string[] }
  | { kind: 'spacer' };

export interface DocumentSection {
  id: string;
  title: string;
  blocks: DocumentBlock[];
}

export interface GeneratedDocumentPack {
  trackingRef: string;
  documentDate: string;
  branding: DocumentBranding;
  recipient: { name: string; registrationNumber: string; addressLines: string[]; attention: string };
  calculation: PvLoanResult;
  sections: DocumentSection[];
}

/** Tracking reference is derived from the case id so every page ties back to the credit case. */
export function buildTrackingRef(caseId: string, productCode = 'LPV'): string {
  const year = new Date().getFullYear();
  return `SFI-${productCode}-${year}-${String(caseId).slice(-6).toUpperCase()}`;
}

const ACCEPTANCE_SIGNATURE_LINES = (data: LoanPvMergeData) => [
  `Signed at ${data.signedAtPlace}`,
  `On ${formatLongDate(data.documentDate)}`,
  '',
  'Signature (SIGN IN FULL)',
  `By ${data.clientSignatoryName}`,
  `for and on behalf of ${data.clientName}`,
  'who warrants that he is duly authorised to sign on their behalf',
];

export function generateLoanPvPack(data: LoanPvMergeData, branding: DocumentBranding = DEFAULT_BRANDING): GeneratedDocumentPack {
  const calculation = calculatePvLoan({
    principal: data.principal,
    annualRatePercent: data.annualRatePercent,
    numberOfInstalments: data.numberOfInstalments,
    firstInstalmentDate: data.firstInstalmentDate,
  });

  const coveringLetter: DocumentSection = {
    id: 'covering-letter',
    title: 'Covering Letter',
    blocks: [
      { kind: 'heading', text: `RE: LOAN AGREEMENT – ${data.clientName}` },
      { kind: 'paragraph', text: `Dear ${data.clientSignatoryName},` },
      { kind: 'paragraph', text: 'We confirm that on your request we have agreed to do a loan agreement as detailed in the agreement below.' },
      { kind: 'paragraph', text: 'Assuring you or our best attentions' },
      { kind: 'paragraph', text: 'Regards' },
      { kind: 'spacer' },
      { kind: 'paragraph', text: `${branding.signatoryName} - ${branding.signatoryTitle}` },
    ],
  };

  const basisOfApproval: DocumentSection = {
    id: 'basis-of-approval',
    title: 'Basis of Approval of Loan',
    blocks: [
      { kind: 'heading', text: 'BASIS OF APPROVAL OF LOAN' },
      { kind: 'paragraph', text: 'The Debtor specifically acknowledges that the Lender has approved the loan based on information provided by them and advised them of the following terms in the Loan agreement:' },
      { kind: 'paragraph', text: `The Debtor (${data.clientName}) confirms that:` },
      {
        kind: 'list',
        ordered: true,
        numbering: ['1.1.', '1.2.', '1.3.', '1.4.', '1.5.', '1.6.', '1.7.'],
        items: [
          'Has requested the Creditor to assist them to restructure their current indebtedness to the Creditor.',
          'Confirms that they have approached the Creditor out of their own free will.',
          'They have provided proof that they have means to repay the debt.',
          data.loanPurpose,
          'They have been explained the loan agreement and understand same.',
          'They have not been induced in any way to take up the loan.',
          'No warranties have been given to the Debtor.',
        ],
      },
      { kind: 'paragraph', text: `2.\u00a0\u00a0\u00a0\u00a0That the Creditor (${branding.companyName}) confirms that they:` },
      {
        kind: 'list',
        ordered: true,
        numbering: ['2.1.', '2.2.', '2.3.'],
        items: [
          'Have agreed to assist the Debtor on the terms and conditions as per the facility letter attached hereto.',
          'Are providing the Loan on the express request of the Debtor.',
          'The Debtor has confirmed to them that they are a Juristic as defined by the NCA as at the time that they enter into this agreement as their turnover is greater than R1,000,000.00 per annum and or have assets greater than R1,000,000.00 at the time that they enter into this agreement.',
        ],
      },
      {
        kind: 'acceptance',
        title: 'Acceptance',
        body: [
          'I hereby agree and acknowledge',
          '1.\u00a0\u00a0\u00a0The creditor has relied on information provided by me',
          '2.\u00a0\u00a0\u00a0Acknowledge that should any information provided by me be found to be false, this is an act of fraud on my behalf my agreement and understanding thereof.',
          '3.\u00a0\u00a0\u00a0That the Creditor has explained the above terms and loan agreement to me.',
          ...ACCEPTANCE_SIGNATURE_LINES(data),
        ],
      },
    ],
  };

  const ncaRights: DocumentSection = {
    id: 'nca-rights',
    title: 'NCA Rights',
    blocks: [
      { kind: 'heading', text: 'NCA RIGHTS' },
      { kind: 'paragraph', text: 'The Debtor specifically acknowledges that due to the fact that the Debtor is a Juristic as defined in terms of the National Credit Act, the agreement falls outside Act. Despite this fact, the Creditor has advised them of the following terms of their rights in terms of the NCA (which does not apply to this transaction). Furthermore, they have explained their rights and obligations in the Loan agreement:' },
      { kind: 'paragraph', text: 'We confirm that you are entering into a Loan agreement, the terms of which are summarized in the pre agreement quote. In terms of the National Credit Act N0 34 of 2005, we are obliged to advise you, as per the requirements of section 129(1) of the said Act that although you may sign this agreement today, there is a cooling off period of 5 days. This is to enable you to consult your representative should you need any assistance with explanations.' },
      { kind: 'paragraph', text: 'During the term of the agreement, you may approach:' },
      {
        kind: 'list',
        ordered: true,
        numbering: ['1.', '2.', '3.'],
        items: [
          'Your attorney to assist you with any terms that you may not understand.',
          'A debt counsellor, an alternative dispute resolution agent, consumer court.',
          'Or an ombud with jurisdiction.',
        ],
      },
      { kind: 'paragraph', text: 'With the view to resolve any dispute between the parties under the agreement or approach us to develop and agree on a plan to bring the payments under the agreement up to date. However, we should highlight the disadvantages of debt review in that you will be listed with credit bureaus and will not be able to access any credit while under debt review. Should you fail to pay your instalment on due date, we may cancel the agreement, whereupon the full outstanding balance of capital, interest and costs will become immediately due and payable. You may avail yourself of one of these options at that point.' },
      { kind: 'paragraph', text: 'Yours faithfully,' },
      { kind: 'spacer' },
      { kind: 'paragraph', text: branding.signatoryName },
      {
        kind: 'acceptance',
        title: 'Acceptance',
        body: ['I hereby confirm that my rights as detailed above have been explained to me.', ...ACCEPTANCE_SIGNATURE_LINES(data)],
      },
    ],
  };

  const facilityLetter: DocumentSection = {
    id: 'facility-letter',
    title: 'Facility Letter',
    blocks: [
      { kind: 'heading', text: 'FACILITY LETTER' },
      { kind: 'paragraph', text: 'We are pleased to advise that a facility for finance has been approved under the following terms and conditions.' },
      {
        kind: 'keyValueTable',
        rows: [
          { label: 'Debtor/ Client Name', value: data.clientName },
          { label: 'Debtor/ Client reg #', value: data.clientRegistrationNumber },
          { label: 'Debtor/ Client Address', value: data.clientAddress },
          { label: 'Debtor/ Client contact', value: data.clientContact },
          { label: 'NCA status', value: data.ncaStatus },
          { label: 'Agreement Type', value: 'Loan (PV)' },
          { label: 'Loan amount', value: formatRand(calculation.principal) },
          { label: 'Facility Date', value: formatLongDate(data.facilityDate) },
          { label: 'Rate', value: `${data.annualRatePercent}% pa fixed based on a Present value calculation` },
          { label: '# Instalments', value: String(calculation.numberOfInstalments) },
          { label: 'Frequency', value: 'Monthly in arrears' },
        ],
      },
      {
        kind: 'table',
        columns: ['Date from', 'Date to', 'Instal #', 'Amount'],
        rows: [[
          formatLongDate(calculation.firstInstalmentDate),
          formatLongDate(calculation.finalInstalmentDate),
          String(calculation.numberOfInstalments),
          formatRand(calculation.instalment),
        ]],
      },
      {
        kind: 'keyValueTable',
        rows: [
          { label: 'Cash Amount payable as follows', value: `Total amount payable of ${formatRand(calculation.totalRepayable)} to be affected by way of EFT` },
          { label: 'Validity', value: 'This facility is valid for 7 days from date hereof' },
          { label: 'Documentation to be signed', value: 'Our facility letter\nLoan agreement' },
          { label: 'Cooling off period', value: '5 days after signing by the client' },
          { label: 'Approval assumptions', value: data.approvalAssumptions.join('\n') },
          { label: 'Suspensive conditions', value: data.suspensiveConditions.join('\n') },
          { label: 'Special conditions', value: data.specialConditions.join('\n') || '' },
        ],
      },
      { kind: 'paragraph', text: 'Our Board reserves the right to withdraw from this arrangement should circumstances dictate.' },
      { kind: 'paragraph', text: 'Kindly initial each page and sign in acceptance hereof.' },
      { kind: 'paragraph', text: 'Thank you for placing this business with us and we assure you of our best attentions.' },
      { kind: 'paragraph', text: 'Yours faithfully,' },
      { kind: 'spacer' },
      { kind: 'paragraph', text: branding.signatoryName },
      {
        kind: 'acceptance',
        title: 'Acceptance',
        body: [
          'The above detailed arrangement is subject to the terms and conditions of the Loan/ Acknowledgement and related agreements indicated in this facility letter.',
          'I hereby agree to and confirm the terms and condition as detailed in the above facility.',
          ...ACCEPTANCE_SIGNATURE_LINES(data),
        ],
      },
    ],
  };

  const agreement: DocumentSection = {
    id: 'agreement',
    title: 'Loan / Acknowledgement of Debt',
    blocks: [
      { kind: 'heading', text: `LOAN/ ACKNOWLEDGEMENT OF DEBT – ${data.clientName}` },
      { kind: 'paragraph', text: 'I/We the undersigned,' },
      {
        kind: 'keyValueTable',
        rows: [{ label: `Debtor: ${data.clientName}\nCo reg #: ${data.clientRegistrationNumber}`, value: '(herein referred to as the "principal Debtor")' }],
      },
      { kind: 'paragraph', text: 'I/ We acknowledge that we are/ I am, jointly and severally, truly and lawfully indebted to and in favour of' },
      {
        kind: 'keyValueTable',
        rows: [{ label: `Creditor: ${branding.companyName}\nCo reg #: ${branding.registrationNumber}`, value: '(herein referred to as the "principal Creditor")' }],
      },
      { kind: 'paragraph', text: 'in the amount of' },
      {
        kind: 'keyValueTable',
        rows: [{ label: formatRand(calculation.principal), value: `In words ( ${amountInWords(calculation.principal)} )` }],
      },
      { kind: 'paragraph', text: '("the capital amount")' },
      {
        kind: 'list',
        ordered: true,
        numbering: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '11.'],
        items: [
          `I/We undertake to repay the capital amount by together with interest at a rate of ${data.annualRatePercent}% per annum fixed. Repayable by way of ${calculation.numberOfInstalments} equal instalments of ${formatRand(calculation.instalment)}. The first instalment being due on the ${formatLongDate(calculation.firstInstalmentDate)} with subsequent instalments due on the ${ordinalDay(calculation.paymentDayOfMonth)} day of each successive month with the final instalment being payable on the ${formatLongDate(calculation.finalInstalmentDate)}.`,
          "No extension of time or other indulgence granted by the Creditor to me/us in respect of my/our obligations will constitute a waiver of the Creditor's rights to enforce compliance with the terms hereof, nor will it constitute a novation of this acknowledgement.",
          'I/We agree that a certificate signed by the Creditor, reflecting the amount of my/our indebtedness to the Creditor and the fact that the same is due and payable will be prima facie proof of the amount of my/our indebtedness and the fact that same is due and payable, and will, in the absence of evidence to the contrary, be sufficient proof for the purposes of the Creditor obtaining provisional sentence or judgement against me/us.',
          `I/We choose domicilium citandi et executandi ${data.clientAddress}.`,
          'Should any payment not be made in full on due date, the full outstanding debt of capital, interest and costs will become immediately due and payable.',
          'This acknowledgement constitutes the entire agreement between the Creditor and me/us and no variation hereof will be of any force or effect unless it is in writing and signed by, or on behalf of, the Creditor and me/ourselves.',
          'I/We hereby renounce the benefits of the legal exceptions "non numeratae pecuniae", "non causa debiti", "errori calculi", revision of accounts and no value received, and all other exceptions which could be pleaded as to the validity or enforceability of this acknowledgement, the full meaning and effect of which have all been explained to me/us and I/We am/are acquainted with.',
          "In terms of Section 45 of the Magistrate's Court Act 1944, as amended, I/We consent to the jurisdiction of the Magistrate's Court in respect of any action or proceedings which may be instituted against me/is in terms of or arising out of this acknowledgement. Notwithstanding the aforegoing, the Creditor will be entitled, in its discretion, to institute any action or proceedings against me/us in terms of or arising out of this acknowledgement in the High Court which has jurisdiction.",
          'This acknowledgement will be binding on my/our estate(s), executors, administrators, heirs and successors in title.',
          'I/We agree to pay to the Creditor or its attorneys on demand all tracing fees, legal costs on an attorney/own client scale and collection commission payable by the Creditor in respect of any action or proceedings which may be instituted against me/us in terms of or arising out of this acknowledgement.',
          'I/We undertake to pay on demand the costs incurred in the preparation and stamping of this acknowledgement.',
        ],
      },
      {
        kind: 'signatureBlock',
        title: 'FOR THE CREDITOR',
        fields: [`SIGNED AT: ${data.signedAtPlace}`, `ON: ${formatLongDate(data.documentDate)}`, `BY: ${branding.signatoryName}`, 'SIGNATURE:', `FOR AND ON BEHALF OF: ${branding.companyName}`, 'WARRANTY: who warrants that he is duly authorised to sign on their behalf', `CO REG #: ${branding.registrationNumber}`],
      },
      {
        kind: 'signatureBlock',
        title: 'FOR THE PRINCIPAL DEBTOR',
        fields: [`SIGNED AT: ${data.signedAtPlace}`, 'ON:', `BY: ${data.clientSignatoryName}`, 'SIGNATURE:', `FOR AND ON BEHALF OF: ${data.clientName}`, 'WARRANTY: who warrants that he is duly authorised to sign on their behalf', `RSA ID: ${data.clientSignatoryIdNumber}`],
      },
      {
        kind: 'table',
        columns: ['AS WITNESS', '', 'AS PRINCIPAL DEBTOR', ''],
        rows: [
          ['Signed at', data.signedAtPlace, 'Signed at', data.signedAtPlace],
          ['On', '', 'On', ''],
          ['Signature', '', 'Signature', ''],
          ['Name', '', 'Name/ Company', data.clientName],
          ['Address', '', 'Co Reg #/ RSA ID', data.clientRegistrationNumber],
        ],
      },
      {
        kind: 'table',
        columns: ['AS WITNESS', '', 'AS PRINCIPAL CREDITOR', ''],
        rows: [
          ['SIGNED AT', data.signedAtPlace, 'ON', formatLongDate(data.documentDate)],
          ['Signature', '', 'Signature', ''],
          ['Name', '', 'Name/ Company', `By ${branding.signatoryName} for and on behalf of ${branding.companyName} who warrants their to bind the company hereto`],
          ['Address', '', 'Co Reg #/ RSA ID', branding.registrationNumber],
        ],
      },
    ],
  };

  const addendum: DocumentSection = {
    id: 'addendum-1',
    title: 'Addendum 1 – Repayment Schedule',
    blocks: [
      { kind: 'heading', text: 'ADDENDUM 1' },
      { kind: 'paragraph', text: `Repayment schedule for the capital amount of ${formatRand(calculation.principal)} at ${data.annualRatePercent}% per annum fixed, calculated on a present value basis over ${calculation.numberOfInstalments} monthly instalments in arrears.` },
      {
        kind: 'table',
        columns: ['Instal #', 'Due date', 'Opening balance', 'Instalment', 'Interest', 'Capital', 'Closing balance'],
        rows: calculation.schedule.map((row) => [
          String(row.instalmentNumber),
          formatLongDate(row.dueDate),
          formatRand(row.openingBalance),
          formatRand(row.instalment),
          formatRand(row.interest),
          formatRand(row.capital),
          formatRand(row.closingBalance),
        ]),
      },
      {
        kind: 'keyValueTable',
        rows: [
          { label: 'Total capital advanced', value: formatRand(calculation.principal) },
          { label: 'Total interest', value: formatRand(calculation.totalInterest) },
          { label: 'Total amount repayable', value: formatRand(calculation.totalRepayable) },
        ],
      },
    ],
  };

  const declaration: DocumentSection = {
    id: 'declaration',
    title: 'Declaration Made by the Customer',
    blocks: [
      { kind: 'heading', text: 'DECLARATION MADE BY THE CUSTOMER:' },
      { kind: 'paragraph', text: 'I confirm that:' },
      {
        kind: 'list',
        ordered: true,
        numbering: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16', '1.17', '1.18', '1.19'],
        items: [
          'I have explained the terms and conditions of this Agreement to me and I understand my rights and obligations under, and the risks and costs of this Agreement.',
          'I have been informed that I can refer any further questions I may have to the Finance company at any time.',
          'I am aware of the importance of the wording printed in bold.',
          'I accept the offer of the agreement contained and the related terms and conditions and further confirm that, I have been given copies of the Agreement.',
          'I can afford the capital and interest payments and the fees referred to in this Agreement.',
          'I have fully and truthfully disclosed my income and expenses to you and have fully and truthfully answered all your requests for information leading up to the conclusion of this Agreement and I have disclosed complete and authentic documentation to the finance company to enable them to conduct an affordability assessment;',
          'I have disclosed to the finance company all other applications I have made to third parties for credit, whether processed or not at the date of my application for this Agreement.',
          'I have not been required or induced to enter into any supplementary agreements or documents other than those comprising this Agreement.',
          'the finance company has not made me an offer which would automatically have resulted in an Agreement had I not declined the offer.',
          'the Finance company has not induced, harassed, or forced me to enter into this Agreement.',
          'the benefits of credit insurance in relation to this Agreement have been fully explained to me and unless the Cost of Credit expressly provides otherwise, I have chosen not to take out such insurance.',
          'I am not under debt counselling or subject to debt review, nor have I applied for debt review at the date when I signed this Agreement.',
          'I have the necessary legal capacity to enter into this Agreement and no court has declared me mentally unfit.',
          'Accepting and entering into this Agreement will not cause me to become over-indebted as contemplated in the NCA.',
          'I am aware that I must not accept this Agreement unless I understand my rights and obligations and the risks and costs of the obligation.',
          'This Agreement was completed in full at the time when I signed it.',
          'I am aware that when this Agreement takes effect section 69(2) of the NCA requires you to report the relevant details of this Agreement (e.g. my name and address etc.) to the National Credit Register or a registered credit bureau and that these details will be disclosed for this purpose; and',
          'I have been free to secure independent advice in respect of the contents of this Agreement.',
          'I am aware that if I am married in community of property then I am required to obtain the written consent of my spouse, in terms of the Matrimonial Property Act 88 of 1984, before entering into this Agreement:',
        ],
      },
      {
        kind: 'list',
        ordered: true,
        numbering: ['1.19.1', '1.19.2', '1.19.3'],
        items: [
          'I hereby confirm that the required consent is held; or',
          'I hereby confirm that I am applying for the agreement I the ordinary course not required; or',
          'I hereby confirm that I am not married in community of property.',
        ],
      },
      {
        kind: 'acceptance',
        title: 'Acceptance',
        body: ['I hereby confirm that my rights as detailed above have been explained to me.', ...ACCEPTANCE_SIGNATURE_LINES(data)],
      },
    ],
  };

  return {
    trackingRef: data.trackingRef,
    documentDate: data.documentDate,
    branding,
    recipient: {
      name: data.clientName,
      registrationNumber: data.clientRegistrationNumber,
      addressLines: data.clientAddress.split(',').map((line) => line.trim()).filter(Boolean),
      attention: data.clientSignatoryName,
    },
    calculation,
    sections: [coveringLetter, basisOfApproval, ncaRights, facilityLetter, agreement, addendum, declaration],
  };
}
