import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

/**
 * STRATEGIC REGISTRATION API
 * Performs forensic registry lookups to ensure invited partners and leads 
 * are correctly linked to their existing company nodes.
 */
export async function POST(req: NextRequest) {
  const { app, error: initError } = getAdminApp();
  if (initError || !app) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }

  try {
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    const firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || '',
      phoneNumber: decodedToken.phone_number || '',
    };

    if (!firebaseUser.email) {
      throw new Error("Token did not contain an email address.");
    }
    
    let referrerId: string | null = null;
    let declaredPosition: string | null = null;
    try {
      const body = await req.json();
      referrerId = body.referrerId;
      declaredPosition = body.role;
    } catch (e) {}

    const db = getFirestore(app);
    const userDocRef = db.collection('users').doc(firebaseUser.uid);
    const userDocSnap = await userDocRef.get();

    // 1. Check if profile already exists
    if (userDocSnap.exists && userDocSnap.data()?.companyId) {
      return NextResponse.json({ success: true, message: 'User already exists.' });
    }
    
    // 2. FORENSIC LOOKUP: Check Leads AND Partners registries
    const emailLower = firebaseUser.email.toLowerCase();
    const [leadsSnap, partnersSnap] = await Promise.all([
        db.collection('leads').where('email', '==', emailLower).limit(1).get(),
        db.collection('partners').where('email', '==', emailLower).limit(1).get()
    ]);
        
    let existingRecord = null;
    let recordSource = '';
    let registryRef = null;

    if (!partnersSnap.empty) {
        existingRecord = partnersSnap.docs[0].data();
        recordSource = 'partner';
        registryRef = partnersSnap.docs[0].ref;
    } else if (!leadsSnap.empty) {
        existingRecord = leadsSnap.docs[0].data();
        recordSource = 'lead';
        registryRef = leadsSnap.docs[0].ref;
    }

    const batch = db.batch();
    
    // 3. Resolve Company ID (Use existing from registry or create new)
    let companyIdToUse: string;
    let companyRef;
    
    if (existingRecord?.id && recordSource === 'partner') {
        companyIdToUse = existingRecord.id;
        companyRef = db.collection('companies').doc(companyIdToUse);
    } else {
        companyRef = db.collection('companies').doc();
        companyIdToUse = companyRef.id;
    }

    // 4. BIND THE REGISTRY RECORD (The Handshake)
    if (registryRef) {
        batch.update(registryRef, {
            status: 'active',
            companyId: companyIdToUse, // CRITICAL: Save the ID back to the lead for cross-referencing
            invitationStatus: 'registered',
            convertedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });
    }

    const displayName = firebaseUser.displayName.trim();
    const companyName = existingRecord?.companyName || (displayName ? `${displayName}'s Company` : 'My Company');
    const isAssociate = declaredPosition === 'associate';
    const shopType = declaredPosition === 'transporter' ? 'transporter' : 'vendor';

    const newCompanyData: any = {
        id: companyIdToUse,
        ownerId: firebaseUser.uid,
        companyName: companyName,
        membershipId: isAssociate ? 'free' : 'free',
        isBillable: !isAssociate,
        walletBalance: 0,
        pendingBalance: 0,
        availableBalance: 0,
        loyaltyTier: 'bronze',
        status: 'active',
        shopType: shopType, 
        declaredRole: declaredPosition,
        leadId: existingRecord?.id || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
    
    const finalReferrer = referrerId || existingRecord?.referrerId;
    if (finalReferrer) {
        newCompanyData.referrerId = finalReferrer;
        
        const auditRef = db.collection('auditLogs').doc();
        batch.set(auditRef, {
            action: 'associate_handshake',
            details: `Referral Handshake: ${companyName} joined via node ${finalReferrer}.`,
            companyId: finalReferrer, 
            metadata: { newMemberId: companyIdToUse, source: recordSource },
            timestamp: FieldValue.serverTimestamp()
        });

        const referrerRef = db.collection('companies').doc(finalReferrer);
        batch.update(referrerRef, { 
            referralCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
        });
    }

    const adminEmails = ['mkoton100@gmail.com', 'beyondtransport@gmail.com', 'michael@logisticsflow.co.za'];
    const isAdminUser = adminEmails.includes(firebaseUser.email.toLowerCase()) || declaredPosition === 'admin';

    if (isAdminUser) {
        try {
            await adminAuth.setCustomUserClaims(firebaseUser.uid, { admin: true, superadmin: true, role: 'superadmin' });
        } catch (claimsError: any) {
            console.warn("Could not set custom user claims for admin user:", claimsError?.message);
        }
    }

    const nameParts = (firebaseUser.displayName || '').split(' ');
    const newUserData = {
        id: firebaseUser.uid,
        firstName: existingRecord?.firstName || userDocSnap.data()?.firstName || nameParts[0] || 'New',
        lastName: existingRecord?.lastName || userDocSnap.data()?.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User'),
        email: firebaseUser.email,
        phone: existingRecord?.phone || userDocSnap.data()?.phone || firebaseUser.phoneNumber || '',
        companyId: companyIdToUse,
        role: isAdminUser ? 'superadmin' : 'owner',
        declaredPosition: declaredPosition || (isAdminUser ? 'admin' : 'owner'),
        updatedAt: FieldValue.serverTimestamp(),
    };
    
    if (!userDocSnap.exists) {
        (newUserData as any).createdAt = FieldValue.serverTimestamp();
        try {
            const loyaltyConfigDoc = await db.collection('configuration').doc('loyaltySettings').get();
            const signupPoints = loyaltyConfigDoc.data()?.userSignupPoints || 50;
            newCompanyData.rewardPoints = signupPoints;
            
            if (finalReferrer) {
                const partnerReferralPoints = loyaltyConfigDoc.data()?.partnerReferralPoints || 200;
                const referrerCompanyRef = db.collection('companies').doc(finalReferrer);
                batch.set(referrerCompanyRef, { rewardPoints: FieldValue.increment(partnerReferralPoints) }, { merge: true });
            }
        } catch (pointError) {
            console.warn("Could not award points:", pointError);
        }
    }
    
    batch.set(companyRef, newCompanyData, { merge: true });
    batch.set(userDocRef, newUserData, { merge: true });
    
    await batch.commit();

    return NextResponse.json({ success: true, message: 'Member account verified and synchronized.' });

  } catch (error: any) {
    console.error(`Error in checkAndCreateUser:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
