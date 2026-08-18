"use server";

import { matchFreight } from '@/ai/flows/ai-freight-matching';
import type { MatchFreightInput } from '@/ai/flows/ai-freight-matching';

export async function handleMatchFreight(data: MatchFreightInput) {
    if (!process.env.GEMINI_API_KEY) {
        return { success: false, error: "GEMINI_API_KEY is not set. Please add it to your .env file." };
    }
    try {
        const result = await matchFreight(data);
        return { success: true, data: result };
    } catch (error) {
        console.error("Error in handleMatchFreight:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: `Failed to match freight: ${errorMessage}` };
    }
}
