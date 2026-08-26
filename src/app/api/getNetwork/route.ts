
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore, FieldPath, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

// Helper to serialize Firestore Timestamps
function serializeTimestamps(docData: any): any {
    if (!docData) return docData;
    const newDocData: { [key: string]: any } = {};
    for (const key in docData) {
        const value = docData[key];
        if (value instanceof Timestamp) {
            newDocData[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            newDocData[key] = serializeTimestamps(value);
        } else {
            newDocData[key] = value;
        }
    }
    return newDocData;
}

async function getRequestContext(req: NextRequest) {
    const { app, error: initError } = getAdminApp();
    if (initError || !app) throw new Error('Firebase administration is unavailable.');

    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('Unauthorized: Missing or invalid token.');

    const decodedToken = await getAuth(app).verifyIdToken(authorization.slice('Bearer '.length));
    const db = getFirestore(app);
    const userDocSnap = await db.collection('users').doc(decodedToken.uid).get();
    const companyId = userDocSnap.data()?.companyId;
    if (!companyId) throw new Error('Could not determine your company to find referrals.');
    const companySnap = await db.collection('companies').doc(companyId).get();
    const companyData = companySnap.data() || {};
    const hasPaidIntelligence = Boolean(companyData.intelligenceMembershipId || (companyData.membershipId && companyData.membershipId !== 'free'));
    const hasTransactionMembership = Boolean(companyData.transactionMembershipId);
    if (!hasPaidIntelligence && !hasTransactionMembership) {
        const error: any = new Error('A paid Intelligence or Transaction membership is required to access referral selling tools.');
        error.status = 403;
        throw error;
    }

    return { db, companyId };
}

export async function GET(req: NextRequest) {
    try {
        const { db, companyId } = await getRequestContext(req);
        const [companiesSnap, leadsSnap] = await Promise.all([
            db.collection('companies').where('referrerId', '==', companyId).get(),
            db.collection('leads').where('referrerId', '==', companyId).get(),
        ]);
        const ownerIds = companiesSnap.docs.map(doc => doc.data().ownerId);
        const usersSnap = ownerIds.length
            ? await db.collection('users').where(FieldPath.documentId(), 'in', ownerIds.slice(0, 10)).get()
            : null;
        const userDetailsMap = new Map<string, any>();
        usersSnap?.forEach(doc => {
            const data = doc.data();
            userDetailsMap.set(doc.id, { 
                email: data.email, 
                name: `${data.firstName || ''} ${data.lastName || ''}`.trim()
            });
        });

        const leadByCompanyId = new Map(leadsSnap.docs.map(doc => [doc.data().companyId, doc]));
        const members = companiesSnap.docs.map(doc => {
            const companyData = doc.data();
            const ownerDetails = userDetailsMap.get(companyData.ownerId) || { email: 'N/A', name: 'N/A' };
            const lifecycleLead = leadByCompanyId.get(doc.id);
            return {
                ...serializeTimestamps(companyData),
                source: 'Member',
                sourceLeadId: lifecycleLead?.id || null,
                email: ownerDetails.email,
                contactPerson: ownerDetails.name,
                ownerEmail: ownerDetails.email,
                ownerName: ownerDetails.name
            };
        });
        const leads = leadsSnap.docs
            .filter(doc => !doc.data().companyId)
            .map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data()), source: 'Lead' }));

        return NextResponse.json({ success: true, data: [...leads, ...members] });

    } catch (error: any) {
        console.error('Error in /api/getNetwork:', error);
        if (error.code?.startsWith('auth/')) {
            return NextResponse.json({ success: false, error: 'Authentication error.' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error.status || 'Internal Server Error.' }, { status: error.status || 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { db, companyId } = await getRequestContext(req);
        const { lead } = await req.json();
        if (!lead || typeof lead !== 'object') {
            return NextResponse.json({ success: false, error: 'Lead data is required.' }, { status: 400 });
        }

        const leadId = typeof lead.id === 'string' ? lead.id : '';
        const allowedFields = ['companyName', 'contactPerson', 'firstName', 'lastName', 'email', 'phone', 'role', 'status', 'notes'];
        const leadData = Object.fromEntries(
            allowedFields.filter(field => lead[field] !== undefined).map(field => [field, lead[field]])
        );

        if (leadId) {
            const leadRef = db.collection('leads').doc(leadId);
            const existingLead = await leadRef.get();
            if (!existingLead.exists || existingLead.data()?.referrerId !== companyId) {
                return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
            }
            await leadRef.set({ ...leadData, updatedAt: new Date().toISOString() }, { merge: true });
            return NextResponse.json({ success: true, id: leadId });
        }

        if (typeof leadData.companyName !== 'string' || !leadData.companyName.trim()) {
            return NextResponse.json({ success: false, error: 'Company name is required.' }, { status: 400 });
        }

        const leadRef = await db.collection('leads').add({
            ...leadData,
            referrerId: companyId,
            status: leadData.status || 'new',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, id: leadRef.id });
    } catch (error: any) {
        console.error('Error in /api/getNetwork POST:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error.' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { db, companyId } = await getRequestContext(req);
        const { leadId, memberCompanyId } = await req.json();
        if (memberCompanyId) {
            const memberRef = db.collection('companies').doc(String(memberCompanyId));
            const member = await memberRef.get();
            if (!member.exists || member.data()?.referrerId !== companyId) {
                return NextResponse.json({ success: false, error: 'Network member not found.' }, { status: 404 });
            }
            const batch = db.batch();
            batch.update(memberRef, { referrerId: FieldValue.delete(), updatedAt: new Date().toISOString() });
            if (leadId) batch.delete(db.collection('leads').doc(String(leadId)));
            await batch.commit();
            return NextResponse.json({ success: true });
        }
        const leadRef = db.collection('leads').doc(String(leadId || ''));
        const lead = await leadRef.get();
        if (!lead.exists || lead.data()?.referrerId !== companyId) {
            return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
        }
        await leadRef.delete();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting network lead:', error);
        return NextResponse.json({ success: false, error: error.message || 'Unable to delete the lead.' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { db, companyId } = await getRequestContext(req);
        const { leadId, channel, subject, action, type, notes, title } = await req.json();
        const leadRef = db.collection('leads').doc(String(leadId || ''));
        const lead = await leadRef.get();
        if (!lead.exists || lead.data()?.referrerId !== companyId) {
            return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
        }

        if (action === 'addCommunication') {
            await leadRef.collection('communications').add({ type, subject, notes: notes || '', timestamp: new Date().toISOString() });
            return NextResponse.json({ success: true });
        }

        if (action === 'addTask') {
            await leadRef.collection('tasks').add({ title, description: notes || '', status: 'pending', createdAt: new Date().toISOString() });
            return NextResponse.json({ success: true });
        }

        const timestamp = new Date().toISOString();
        await Promise.all([
            leadRef.set({
                status: lead.data()?.status === 'new' ? 'contacted' : lead.data()?.status,
                lastOutreachChannel: channel,
                lastOutreachSubject: subject,
                lastOutreachAt: timestamp,
                updatedAt: timestamp,
            }, { merge: true }),
            leadRef.collection('communications').add({
                type: channel,
                subject,
                notes: 'Member network engagement launched.',
                timestamp,
            }),
        ]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error logging network engagement:', error);
        return NextResponse.json({ success: false, error: error.message || 'Unable to record engagement.' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { db, companyId } = await getRequestContext(req);
        const { leadId } = await req.json();
        const leadRef = db.collection('leads').doc(String(leadId || ''));
        const lead = await leadRef.get();
        if (!lead.exists || lead.data()?.referrerId !== companyId) return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
        const [communications, tasks] = await Promise.all([
            leadRef.collection('communications').limit(50).get(),
            leadRef.collection('tasks').limit(50).get(),
        ]);
        return NextResponse.json({ success: true, data: {
            communications: communications.docs.map(entry => ({ id: entry.id, ...serializeTimestamps(entry.data()) })),
            tasks: tasks.docs.map(entry => ({ id: entry.id, ...serializeTimestamps(entry.data()) })),
        } });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Unable to load client activity.' }, { status: 500 });
    }
}
