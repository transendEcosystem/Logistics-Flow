
'use server';

import { generateVideo } from '@/ai/flows/video-generation-flow';

/**
 * GENERATE SHOWCASE VIDEO
 * High-fidelity prompt designed for the "Industrial Brain" pitch.
 */
export async function generateShowcaseVideo() {
    try {
        const result = await generateVideo({
            prompt: `ACT AS A HIGH-END CINEMATIC LOGISTICS BRAND DIRECTOR. 
            Create an 8-second professional marketing sequence for "Logistics Flow". 
            
            SCENE: Start with a dark, high-tech industrial map of South Africa. 
            ACTION: Glowing data points pulse and connect across the provinces. The camera pulls back to reveal a clean, modern dashboard titled "THE INDUSTRIAL BRAIN" being used in a sleek corporate office. 
            
            AESTHETIC: High-contrast, forest green and slate grey tones. No generic cartoons. Professional 4K cinematic look. Focus on precision and connection.`,
            durationSeconds: 8
        });
        
        if (!result.videoDataUri) {
            throw new Error('Video generation failed to return a video URI.');
        }
        
        return { success: true, videoDataUri: result.videoDataUri };
    } catch (e: any) {
        console.error("Error generating showcase video:", e);
        return { success: false, error: e.message || "An unknown error occurred during video generation." };
    }
}

/**
 * GENERATE INTELLIGENCE BRIEFING
 * Focused on the forensic registry aspect of the app.
 */
export async function generateIntelligenceBriefing() {
    try {
        const result = await generateVideo({
            prompt: `SCENE: Close up of a fingerprint scan on a futuristic glass tablet. 
            ACTION: The scan confirms, and the screen instantly populates with a deep-scroll list of verified company names and direct phone numbers. 
            TEXT OVERLAY (Subtle): "Absolute Transparency". 
            
            AESTHETIC: Tech-noir, sharp focus, very high detail on the digital UI elements. Cyber-security and industrial intelligence theme.`,
            durationSeconds: 8
        });
        
        if (!result.videoDataUri) {
            throw new Error('Briefing generation failed.');
        }
        
        return { success: true, videoDataUri: result.videoDataUri };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
