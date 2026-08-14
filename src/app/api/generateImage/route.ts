
import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/ai/flows/image-generation-flow';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ success: false, error: "GEMINI_API_KEY is not set." }, { status: 500 });
    }

    const { app, error: initError } = getAdminApp();
    if (initError || !app) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }

    const authorization = req.headers.get('authorization');
    const token = authorization?.split('Bearer ')[1];

    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ success: false, error: 'Missing prompt in request body.' }, { status: 400 });
        }
        
        const result = await generateImage({ prompt });

        // If user is authenticated, track usage and award points
        if (token) {
            const adminAuth = getAuth(app);
            const decodedToken = await adminAuth.verifyIdToken(token);
            const uid = decodedToken.uid;
            const db = getFirestore(app);

            const userDoc = await db.collection('users').doc(uid).get();
            const companyId = userDoc.data()?.companyId;

            if (companyId) {
                const batch = db.batch();
                
                // Log the AI instance usage
                const logRef = db.collection('auditLogs').doc();
                batch.set(logRef, {
                    userId: uid,
                    companyId: companyId,
                    action: 'ai_image_generation',
                    prompt: prompt.slice(0, 100) + '...',
                    timestamp: FieldValue.serverTimestamp()
                });

                // Award loyalty points for using AI tech
                const loyaltyConfigDoc = await db.collection('configuration').doc('loyaltySettings').get();
                const aiPoints = loyaltyConfigDoc.data()?.aiUsagePoints || 10;
                
                const companyRef = db.collection('companies').doc(companyId);
                batch.update(companyRef, { 
                    rewardPoints: FieldValue.increment(aiPoints),
                    updatedAt: FieldValue.serverTimestamp() 
                });

                await batch.commit();
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error in /api/generateImage:', error);
        return NextResponse.json({ success: false, error: error.message || 'An unknown error occurred.' }, { status: 500 });
    }
}
