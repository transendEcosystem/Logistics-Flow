
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(req: NextRequest) {
    console.log("uploadImageAsset: API route started.");
    const { app, error: initError } = getAdminApp();
    if (initError || !app) {
        console.error("uploadImageAsset: Admin SDK init error:", initError);
        return NextResponse.json({ success: false, error: `Server error: ${initError}` }, { status: 500 });
    }
    
    const authorization = req.headers.get('authorization');
    const token = authorization?.split('Bearer ')[1];
    if (!token) {
        console.error("uploadImageAsset: Unauthorized, no token provided.");
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const adminAuth = getAuth(app);
        await adminAuth.verifyIdToken(token);
        console.log("uploadImageAsset: Token verified.");

        const { fileDataUri, folder, fileName, contentType: providedContentType } = await req.json();
        console.log(`uploadImageAsset: Received request for folder '${folder}' and file '${fileName}'.`);
        
        if (!fileDataUri || !folder || !fileName) {
            console.error("uploadImageAsset: Missing file data or path info.");
            return NextResponse.json({ success: false, error: 'Missing file data or path info.' }, { status: 400 });
        }

        const matches = fileDataUri.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            console.error("uploadImageAsset: Invalid data URI format.");
            return NextResponse.json({ success: false, error: 'Invalid data URI format.' }, { status: 400 });
        }
        
        const contentType = providedContentType || matches[1];
        const fileBuffer = Buffer.from(matches[2], 'base64');
        
        const bucket = getStorage(app).bucket("ecosystem-hub-files");
        
        console.log(`uploadImageAsset: Explicitly using bucket: ${bucket.name}`);
        const filePath = `${folder}/${fileName}`;
        const file = bucket.file(filePath);
        console.log(`uploadImageAsset: File path set to: ${filePath}`);
        
        console.log("uploadImageAsset: Calling file.save()...");
        await file.save(fileBuffer, {
            metadata: { contentType },
        });
        console.log("uploadImageAsset: file.save() completed successfully.");

        // NEW: Instead of constructing a public URL, get a long-lived, token-based download URL.
        const downloadUrl = await getDownloadURL(file);
        console.log(`uploadImageAsset: Generated download URL: ${downloadUrl}`);
        
        return NextResponse.json({ success: true, url: downloadUrl });

    } catch (error: any) {
        console.error("CRITICAL ERROR in /api/uploadImageAsset:", error);
        
        if (error.code === 403 || error.message?.includes('storage.objects.create access')) {
            return NextResponse.json({
                success: false,
                error: 'Permission Denied on Server: This can happen if the backend service account does not have the "Storage Object Admin" role in Google Cloud IAM, or if Firebase Storage is not fully enabled. Please check the setup guide.'
            }, { status: 403 });
        }
        
        if (error.message?.includes('The specified bucket does not exist') || error.code === 404) {
             return NextResponse.json({
                success: false,
                error: `Bucket Not Found on Server. The backend tried to access the Storage bucket but it could not be found. Please ensure Firebase Storage is enabled and the bucket name in the code is correct.`
            }, { status: 404 });
        }
        
        if (error.message?.includes('Bucket name not specified')) {
             return NextResponse.json({
                success: false,
                error: `Bucket name not specified or invalid. This has been fixed in the code; please try again.`
            }, { status: 500 });
        }
        
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
