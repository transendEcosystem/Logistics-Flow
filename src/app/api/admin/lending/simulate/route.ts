import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';

/** Seeds a complete, clearly-labelled synthetic case so the end-to-end facility workflow can be demonstrated without OCR. */
export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json().catch(() => ({}));
    const label = String(body?.label || 'SIMULATION Transport').trim();
    const agreementType = String(body?.agreementType || 'installment-sale-term');
    const requestedAmount = Number(body?.requestedAmount || 850000);
    const now = new Date().toISOString();
    const db = auth.db;

    const clientRef = db.collection('lendingClients').doc();
    await clientRef.set({
      id: clientRef.id,
      name: `${label} (Pty) Ltd`,
      entityType: 'Pty Ltd',
      registrationId: '2019/443512/07',
      status: 'active',
      isSyntheticData: true,
      applicationSource: 'simulation',
      primaryContact: 'Thandi Mokoena',
      email: 'simulation@example.com',
      phone: '082 555 0101',
      workAddress: { street: '14 Diesel Road', suburb: 'Isando', city: 'Kempton Park', province: 'Gauteng', postalCode: '1600' },
      propertyStanding: 'rented',
      landlordDetails: { name: 'Isando Industrial Park', phone: '011 555 0199', email: 'leasing@example.com' },
      leaseTerms: { rentPerMonth: 48000, sinceDate: '2021-03-01', expiryDate: '2027-02-28' },
      directors: [{ name: 'Thandi Mokoena', rsaIdNumber: '8203155009083', maritalStatus: 'married_cop', spouseName: 'Sipho Mokoena', spouseIdNumber: '8006120145087' }],
      shareholders: [{ name: 'Thandi Mokoena', rsaIdNumber: '8203155009083', maritalStatus: 'married_cop' }],
      vehicleAssets: [
        { make: 'Scania', model: 'R460', year: 2021, value: 1250000, outstanding: 640000, lender: 'Standard Bank', registrationNumber: 'JH12KLGP', insuranceStatus: 'insured' },
        { make: 'Isuzu', model: 'FTR850', year: 2018, value: 480000, outstanding: 0, lender: '', registrationNumber: 'KP44BNGP', insuranceStatus: 'insured' },
      ],
      equipmentAssets: [{ description: 'Workshop hoist', make: 'Stertil', model: 'ST1082', year: 2020, value: 190000, outstanding: 0, lender: '', insuranceStatus: 'unknown' }],
      propertyAssets: [],
      bankAccounts: [{
        bankName: 'FNB', accountHolderName: `${label} (Pty) Ltd`, accountNumber: '62812345678',
        months: [
          { month: 'Month 1', openingBalance: 210000, closingBalance: 268000, totalIn: 1420000, totalOut: 1362000 },
          { month: 'Month 2', openingBalance: 268000, closingBalance: 301000, totalIn: 1515000, totalOut: 1482000 },
          { month: 'Month 3', openingBalance: 301000, closingBalance: 356000, totalIn: 1602000, totalOut: 1547000 },
        ],
      }],
      financialSnapshot: { monthlyRevenue: 1520000, monthlyExpenses: 1180000, monthlyDebtRepayments: 196000, cashAtBank: 356000, notes: 'Synthetic simulation data.' },
      insuranceDeclaration: { hasBusinessInsurance: true, insurerName: 'Santam', policyReference: 'SIM-4471', lenderInterestNoted: true },
      insolvencyDeclaration: { hasInsolvencyProceedings: false },
      existingBankFacilityDetails: { bankName: 'Standard Bank', holdsCessionOfBookDebts: true, holdsNotarialBond: false },
      hasJudgements: false,
      hasDefaults: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const globalLimit = 2000000;
    const globalRef = db.collection('facilities').doc();
    await globalRef.set({
      id: globalRef.id, ownerType: 'client', clientId: clientRef.id, facilityClass: 'global', parentId: null,
      type: 'Global Client Facility', limit: globalLimit, approvedLimit: globalLimit, status: 'approved',
      onboardingStage: 'credit', isSyntheticData: true, approvedAt: now, approvedBy: auth.adminUid,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });

    const subRef = db.collection('facilities').doc();
    await subRef.set({
      id: subRef.id, ownerType: 'client', clientId: clientRef.id, facilityClass: 'sub', parentId: globalRef.id,
      type: agreementType, limit: requestedAmount, status: 'pending_credit', onboardingStage: 'application',
      isSyntheticData: true, source: 'client_agreement_application',
      applicantRequest: { amountRequested: requestedAmount, termMonths: 60, description: 'Replacement truck tractor for the Durban corridor contract.' },
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });

    const caseRef = db.collection('lendingApplications').doc();
    await caseRef.set({
      id: caseRef.id, applicationId: caseRef.id, caseType: 'agreement_facility_case', isSyntheticData: true,
      clientId: clientRef.id, masterFacilityId: globalRef.id, facilityId: subRef.id,
      companyName: `${label} (Pty) Ltd`, entityType: 'Pty Ltd', primaryContact: 'Thandi Mokoena',
      email: 'simulation@example.com', phone: '082 555 0101',
      amountRequested: requestedAmount, termMonths: 60, facilityType: agreementType, facilityAgreementType: agreementType,
      fundingNeed: 'asset-acquisition', purposeNarrative: 'Replacement truck tractor for the Durban corridor contract.',
      province: 'Gauteng', city: 'Kempton Park', status: 'submitted',
      sourceCollections: ['lendingClients', 'facilities', 'agreements'],
      sourceSnapshot: { clientId: clientRef.id, masterFacilityId: globalRef.id, facilityId: subRef.id, capturedAt: now },
      createdAt: now, updatedAt: now,
    });
    await subRef.set({ creditCaseId: caseRef.id }, { merge: true });
    await clientRef.set({ globalFacilityId: globalRef.id }, { merge: true });

    await db.collection('auditLogs').add({ action: 'lending_simulation_seeded', caseId: caseRef.id, clientId: clientRef.id, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, clientId: clientRef.id, globalFacilityId: globalRef.id, facilityId: subRef.id, caseId: caseRef.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unable to seed simulation data.' }, { status: 500 });
  }
}
