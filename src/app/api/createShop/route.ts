import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    const { app, error: initError } = getAdminApp();
    if (initError || !app) {
        return NextResponse.json({ success: false, error: `Admin SDK not initialized: ${initError}` }, { status: 500 });
    }

    const authorization = req.headers.get('authorization');
    const token = authorization?.split('Bearer ')[1];
    if (!token) {
        return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    
    try {
        const { nodeType = 'default' } = await req.json().catch(() => ({}));
        const adminAuth = getAuth(app);
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const db = getFirestore(app);
        
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        if (!userData || !userData.companyId) {
            return NextResponse.json({ success: false, error: 'User has no associated company.' }, { status: 400 });
        }
        const companyId = userData.companyId;
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();
        const companyData = companyDoc.data();

        if (!companyData?.transactionMembershipId) {
            return NextResponse.json({ success: false, error: 'A transaction membership is required before creating a business profile.' }, { status: 403 });
        }

        const normalizedNodeType = String(nodeType).toLowerCase();
        const requiredRoleByNodeType: Record<string, string> = {
            supplier: 'supplier',
            transport: 'transporter',
            loads: 'broker',
            warehouse: 'warehouseManager',
            finance: 'lender',
            'buy-sell': 'dealer',
            distribution: 'distributor',
        };
        const requiredRole = requiredRoleByNodeType[normalizedNodeType];
        const activeRoles = new Set([
            companyData?.primaryBusinessDomain, companyData?.declaredRole, companyData?.shopType,
            userData?.primaryBusinessDomain, userData?.declaredRole, userData?.declaredPosition,
            ...(companyData?.activeBusinessRoles || []),
        ].filter(Boolean).map((role: string) => role.toLowerCase()));
        const hasActiveMembershipRole = requiredRole && (companyData?.roleMemberships?.[requiredRole]?.status === 'active' || (requiredRole === 'lender' && companyData?.roleMemberships?.finance?.status === 'active'));
        const roleAliases: Record<string, string[]> = {
            supplier: ['supplier', 'vendor'],
            transporter: ['transporter'],
            broker: ['broker'],
            warehouseManager: ['warehousemanager'],
            lender: ['lender', 'finance'],
            dealer: ['dealer'],
            distributor: ['distributor'],
        };
        if (requiredRole && !hasActiveMembershipRole && !roleAliases[requiredRole].some(role => activeRoles.has(role))) {
            return NextResponse.json({ success: false, error: `An active ${requiredRole} business role is required before opening this Shop.` }, { status: 403 });
        }

        const isServiceProfile = requiredRole ? !['supplier', 'dealer'].includes(requiredRole) : false;

        // Fetch loyalty settings
        const [transactionPlanDoc, loyaltyConfigDoc] = await Promise.all([
            db.collection('memberships').doc(companyData.transactionMembershipId).get(),
            db.collection('configuration').doc('loyaltySettings').get(),
        ]);
        if (!transactionPlanDoc.exists || transactionPlanDoc.data()?.isActive === false || !transactionPlanDoc.data()?.features?.includes('shop:digital_branch')) {
            return NextResponse.json({ success: false, error: 'The selected transaction membership does not include business profile access.' }, { status: 403 });
        }
        const loyaltyConfig = loyaltyConfigDoc.data();
        
        // Differentiate points based on role
        const pointsToAward = isServiceProfile 
            ? (loyaltyConfig?.serviceProfileCreationPoints || 100)
            : (loyaltyConfig?.shopCreationPoints || 100);

        const shopCollectionRef = companyRef.collection('shops');
        const newShopRef = shopCollectionRef.doc();
        const rootShopRef = db.collection('shops').doc(newShopRef.id);

        const shopTypeByRole: Record<string, string> = { supplier: 'vendor', transporter: 'transporter', broker: 'broker', warehouseManager: 'warehouseManager', lender: 'finance', dealer: 'dealer', distributor: 'distributor' };
        const shopLabelByRole: Record<string, string> = { supplier: 'Shop', transporter: 'Transport Shop', broker: 'Load Shop', warehouseManager: 'Warehouse Shop', lender: 'Finance Shop', dealer: 'Buy & Sell Shop', distributor: 'Distribution Shop' };
        const shopType = requiredRole ? (shopTypeByRole[requiredRole] || 'vendor') : 'vendor';
        const shopLabel = requiredRole ? (shopLabelByRole[requiredRole] || 'Shop') : 'Shop';

        const newShopData = {
          ownerId: uid,
          companyId: companyId,
          status: 'draft',
          nodeType: normalizedNodeType,
          shopType,
          shopName: `${decodedToken.name || 'My'}'s New ${shopLabel}`,
          category: '',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          id: newShopRef.id,
        };
        
        const batch = db.batch();
        batch.set(newShopRef, newShopData);
        batch.set(rootShopRef, newShopData);
        batch.update(companyRef, { 
            shopId: newShopRef.id,
            rewardPoints: FieldValue.increment(pointsToAward),
            updatedAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();

        return NextResponse.json({ success: true, shopId: newShopRef.id });
    } catch (error: any) {
        console.error('Error creating shop:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
