import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'approve') {
      const { db } = await verifyAdmin(req);
      const applicationId = String(body.applicationId || '').trim();
      if (!applicationId) return NextResponse.json({ success: false, error: 'Application ID is required.' }, { status: 400 });

      const applicationRef = db.collection('partners').doc(applicationId);
      const application = await applicationRef.get();
      const applicationData = application.data();
      if (!application.exists || applicationData?.type !== 'isa' || !applicationData.linkedCompanyId) {
        return NextResponse.json({ success: false, error: 'ISA application was not found.' }, { status: 404 });
      }

      const batch = db.batch();
      batch.set(applicationRef, {
        status: 'active',
        applicationStatus: 'approved',
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      batch.set(db.collection('companies').doc(applicationData.linkedCompanyId), {
        isaStatus: 'active',
        isaPartnerId: applicationId,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (applicationData.taskId) {
        batch.set(db.collection('platformTasks').doc(applicationData.taskId), {
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();
      return NextResponse.json({ success: true });
    }

    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    }

    const db = getFirestore(app);
    const decodedToken = await getAuth(app).verifyIdToken(authorization.slice('Bearer '.length));
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const user = userDoc.data();
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ success: false, error: 'Could not determine your company.' }, { status: 400 });

    const existing = await db.collection('partners').where('linkedCompanyId', '==', companyId).where('type', '==', 'isa').limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ success: false, error: 'An ISA application already exists for this member.' }, { status: 409 });
    }

    const applicationRef = db.collection('partners').doc();
    const taskRef = db.collection('platformTasks').doc();
    const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || decodedToken.name || 'Member';
    const batch = db.batch();
    batch.set(applicationRef, {
      id: applicationRef.id,
      type: 'isa',
      status: 'pending',
      applicationStatus: 'pending',
      linkedCompanyId: companyId,
      companyName: user?.companyName || `${displayName}'s ISA Network`,
      contactPerson: displayName,
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: String(user?.email || decodedToken.email || '').toLowerCase(),
      phone: user?.phone || '',
      taskId: taskRef.id,
      source: 'member-application',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(taskRef, {
      id: taskRef.id,
      title: `ISA APPLICATION: ${displayName}`,
      description: `${displayName} has applied to become an Independent Sales Agent. Review and approve from Marketing > ISA Agents.`,
      status: 'pending',
      priority: 'high',
      type: 'isa_application',
      targetId: applicationRef.id,
      targetCollection: 'partners',
      relatedCompanyId: companyId,
      relatedToName: displayName,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return NextResponse.json({ success: true, applicationId: applicationRef.id });
  } catch (error: any) {
    console.error('Error in /api/isaApplications:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to process the ISA application.' }, { status: 500 });
  }
}