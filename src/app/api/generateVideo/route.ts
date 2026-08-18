import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/ai/flows/video-generation-flow';
import type { VideoGenerateInput } from '@/ai/schemas';

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ success: false, error: "GEMINI_API_KEY is not set." }, { status: 500 });
    }

    try {
        const body: VideoGenerateInput = await req.json();

        if (!body.prompt) {
            return NextResponse.json({ success: false, error: 'Missing prompt in request body.' }, { status: 400 });
        }
        
        const result = await generateVideo(body);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error in /api/generateVideo:', error);
        return NextResponse.json({ success: false, error: error.message || 'An unknown error occurred.' }, { status: 500 });
    }
}
