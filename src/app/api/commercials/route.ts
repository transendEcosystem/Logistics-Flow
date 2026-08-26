import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/firebase-admin';

function serialize(value: any): any {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  return value;
}

function timestampValue(value: any): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { db } = await verifyAdmin(req);
    const [companiesSnapshot, usersSnapshot, leadsSnapshot, commissionsSnapshot, revenueSnapshot] = await Promise.all([
      db.collection('companies').get(),
      db.collection('users').get(),
      db.collection('leads').get(),
      db.collectionGroup('commissionLedger').get(),
      db.collection('platformTransactions').get(),
    ]);

    const companies = companiesSnapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }));
    const usersByCompanyId = new Map(usersSnapshot.docs.map(entry => {
      const user = entry.data();
      return [user.companyId, { firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '' }];
    }));
    const leads = leadsSnapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }));
    const commissions = commissionsSnapshot.docs.map(entry => {
      const path = entry.ref.path.split('/');
      return serialize({ id: entry.id, path: entry.ref.path, ownerCompanyId: path[path.indexOf('companies') + 1], ...entry.data() });
    }).sort((left: any, right: any) => timestampValue(right.earnedAt) - timestampValue(left.earnedAt));
    const revenue = revenueSnapshot.docs.map(entry => serialize({ id: entry.id, ...entry.data() }));
    const commissionRevenue = {
      intelligence: commissions.filter((entry: any) => entry.type === 'membership_revenue_share').reduce((sum: number, entry: any) => sum + Number(entry.grossAmount || 0), 0),
      transaction: commissions.filter((entry: any) => entry.type === 'transaction_revenue_share').reduce((sum: number, entry: any) => sum + Number(entry.retainedPlatformRevenue || 0), 0),
      products: commissions.filter((entry: any) => entry.type === 'incentives_product_revenue_share').reduce((sum: number, entry: any) => sum + Number(entry.retainedPlatformRevenue || 0), 0),
    };
    const transactionRevenue = revenue.reduce((totals: any, entry: any) => {
      const amount = Number(entry.amount || entry.retainedPlatformRevenue || 0);
      const type = String(entry.type || entry.revenueType || entry.category || '').toLowerCase();
      if (type.includes('reward_retention') || type.includes('cashback_retention')) totals.supplierRewardRetention += amount;
      else if (type.includes('finance_origination')) totals.financeOriginationCommission += amount;
      else if (type.includes('load_brokerage')) totals.loadBrokerageCommission += amount;
      else if (type.includes('buy_sell_brokerage') || type.includes('vehicle_brokerage')) totals.buySellBrokerageCommission += amount;
      else if (type.includes('brokerage') || type.includes('origination')) totals.brokerageCommission += amount;
      else if (type.includes('product') || type.includes('incentive')) totals.products += amount;
      else if (type.includes('transaction') || type.includes('mall') || type.includes('commission')) totals.transaction += amount;
      else if (type.includes('membership') || type.includes('intelligence') || type.includes('access')) totals.intelligence += amount;
      else totals.unclassified += amount;
      return totals;
    }, { intelligence: 0, transaction: 0, products: 0, supplierRewardRetention: 0, financeOriginationCommission: 0, loadBrokerageCommission: 0, buySellBrokerageCommission: 0, brokerageCommission: 0, unclassified: 0 });
    const actualRevenue = {
      intelligence: Math.max(commissionRevenue.intelligence, transactionRevenue.intelligence),
      transaction: Math.max(commissionRevenue.transaction, transactionRevenue.transaction),
      products: Math.max(commissionRevenue.products, transactionRevenue.products),
      supplierRewardRetention: transactionRevenue.supplierRewardRetention,
      financeOriginationCommission: transactionRevenue.financeOriginationCommission,
      loadBrokerageCommission: transactionRevenue.loadBrokerageCommission,
      buySellBrokerageCommission: transactionRevenue.buySellBrokerageCommission,
      brokerageCommission: transactionRevenue.brokerageCommission,
      unclassified: transactionRevenue.unclassified,
    };

    const networkOwners = companies.map((owner: any) => {
      const referredMembers = companies.filter((company: any) => company.referrerId === owner.id);
      const ownerLeads = leads.filter((lead: any) => lead.referrerId === owner.id);
      const ownerCommissions = commissions.filter((entry: any) => entry.ownerCompanyId === owner.id);
      const ownerUser = usersByCompanyId.get(owner.id) as any;
      const ownerName = [ownerUser?.firstName, ownerUser?.lastName].filter(Boolean).join(' ') || owner.contactPerson || owner.companyName || 'Unnamed member';
      const membershipRevenue = ownerCommissions.filter((entry: any) => entry.type === 'membership_revenue_share').reduce((sum: number, entry: any) => sum + Number(entry.grossAmount || 0), 0);
      const transactionRevenue = ownerCommissions.filter((entry: any) => entry.type === 'transaction_revenue_share').reduce((sum: number, entry: any) => sum + Number(entry.retainedPlatformRevenue || 0), 0);
      const productRevenue = ownerCommissions.filter((entry: any) => entry.type === 'incentives_product_revenue_share').reduce((sum: number, entry: any) => sum + Number(entry.retainedPlatformRevenue || 0), 0);
      const accrued = ownerCommissions.filter((entry: any) => entry.status === 'accrued').reduce((sum: number, entry: any) => sum + Number(entry.commissionAmount || 0), 0);
      const due = ownerCommissions.filter((entry: any) => entry.status === 'accrued' && entry.payoutEligibleAt && new Date(entry.payoutEligibleAt) <= new Date()).reduce((sum: number, entry: any) => sum + Number(entry.commissionAmount || 0), 0);
      return {
        companyId: owner.id,
        companyName: owner.companyName || 'Unnamed member',
        ownerName,
        ownerEmail: ownerUser?.email || '',
        leads: ownerLeads.length,
        invited: ownerLeads.filter((lead: any) => lead.status === 'invited').length,
        registrations: referredMembers.length,
        paidMembers: referredMembers.filter((company: any) => company.intelligenceMembershipId || (company.membershipId && company.membershipId !== 'free')).length,
        membershipRevenue,
        transactionRevenue,
        productRevenue,
        accrued,
        due,
        network: [
          ...ownerLeads.map((lead: any) => ({
            id: lead.id,
            kind: 'lead',
            companyName: lead.companyName || 'Unnamed lead',
            contactName: lead.contactPerson || [lead.firstName, lead.lastName].filter(Boolean).join(' '),
            email: lead.email || '',
            status: lead.status || 'new',
            createdAt: serialize(lead.createdAt),
          })),
          ...referredMembers.map((company: any) => {
            const memberUser = usersByCompanyId.get(company.id) as any;
            const memberName = [memberUser?.firstName, memberUser?.lastName].filter(Boolean).join(' ') || company.companyName || 'Member';
            const memberCommissions = ownerCommissions.filter((entry: any) => entry.referredCompanyId === company.id);
            return {
              id: company.id,
              kind: 'member',
              companyName: company.companyName || 'Unnamed member',
              contactName: memberName,
              email: memberUser?.email || '',
              status: company.status || 'active',
              membership: company.intelligenceMembershipId || company.membershipId || 'free',
              commission: memberCommissions.reduce((sum: number, entry: any) => sum + Number(entry.commissionAmount || 0), 0),
              createdAt: serialize(company.createdAt),
            };
          }),
        ],
      };
    }).filter((owner: any) => owner.leads || owner.registrations || owner.accrued);

    const summary = {
      members: companies.length,
      paidMembers: companies.filter((company: any) => company.intelligenceMembershipId || (company.membershipId && company.membershipId !== 'free')).length,
      platformRevenue: revenue.reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0),
      actualRevenue,
      accruedCommissions: commissions.filter((entry: any) => entry.status === 'accrued').reduce((sum: number, entry: any) => sum + Number(entry.commissionAmount || 0), 0),
      dueCommissions: commissions.filter((entry: any) => entry.status === 'accrued' && entry.payoutEligibleAt && new Date(entry.payoutEligibleAt) <= new Date()).reduce((sum: number, entry: any) => sum + Number(entry.commissionAmount || 0), 0),
    };

    return NextResponse.json({ success: true, summary, networkOwners, commissions, revenue });
  } catch (error: any) {
    console.error('Commercial reporting error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to load commercial reporting.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db, adminUid } = await verifyAdmin(req);
    const { commissionPaths, paymentReference } = await req.json();
    if (!Array.isArray(commissionPaths) || commissionPaths.length === 0 || !String(paymentReference || '').trim()) {
      return NextResponse.json({ success: false, error: 'Select due commissions and enter a payment reference.' }, { status: 400 });
    }

    const entries = await Promise.all(commissionPaths.map((path: string) => db.doc(path).get()));
    if (entries.some(entry => !entry.exists)) return NextResponse.json({ success: false, error: 'One or more commission entries were not found.' }, { status: 404 });
    const now = new Date();
    for (const entry of entries) {
      const data = entry.data();
      if (data.status !== 'accrued' || !data.payoutEligibleAt || timestampValue(data.payoutEligibleAt) > now.getTime()) {
        return NextResponse.json({ success: false, error: 'Only accrued commissions due for payment can be settled.' }, { status: 400 });
      }
    }

    const runRef = db.collection('commissionPayoutRuns').doc();
    const batch = db.batch();
    const total = entries.reduce((sum, entry) => sum + Number(entry.data().commissionAmount || 0), 0);
    const ownerTotals = new Map<string, number>();
    entries.forEach(entry => {
      const segments = entry.ref.path.split('/');
      const companyIndex = segments.indexOf('companies');
      const ownerCompanyId = companyIndex >= 0 ? segments[companyIndex + 1] : null;
      if (ownerCompanyId) ownerTotals.set(ownerCompanyId, (ownerTotals.get(ownerCompanyId) || 0) + Number(entry.data().commissionAmount || 0));
    });
    batch.set(runRef, {
      id: runRef.id,
      paymentReference: String(paymentReference).trim(),
      total,
      commissionPaths,
      status: 'wallet_credited',
      paidBy: adminUid,
      paidAt: FieldValue.serverTimestamp(),
    });
    ownerTotals.forEach((amount, ownerCompanyId) => {
      const ownerRef = db.collection('companies').doc(ownerCompanyId);
      const walletTransactionRef = ownerRef.collection('transactions').doc();
      batch.update(ownerRef, {
        walletBalance: FieldValue.increment(amount),
        availableBalance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(walletTransactionRef, {
        transactionId: walletTransactionRef.id,
        companyId: ownerCompanyId,
        type: 'credit',
        amount,
        date: FieldValue.serverTimestamp(),
        description: 'Network commission monthly wallet credit',
        status: 'allocated',
        source: 'commission_payout',
        payoutRunId: runRef.id,
        settlementReference: String(paymentReference).trim(),
        postedBy: adminUid,
      });
    });
    entries.forEach(entry => batch.update(entry.ref, { status: 'paid', payoutRunId: runRef.id, paymentReference: String(paymentReference).trim(), paidAt: FieldValue.serverTimestamp() }));
    await batch.commit();
    return NextResponse.json({ success: true, runId: runRef.id, total });
  } catch (error: any) {
    console.error('Commercial settlement error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to settle commissions.' }, { status: 500 });
  }
}