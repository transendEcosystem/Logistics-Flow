'use server';

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';
import { MatchFreightInputSchema, MatchFreightOutputSchema } from '../schemas';

export type MatchFreightInput = z.infer<typeof MatchFreightInputSchema>;
export type MatchFreightOutput = z.infer<typeof MatchFreightOutputSchema>;


export async function matchFreight(input: MatchFreightInput): Promise<MatchFreightOutput> {
  return matchFreightFlow(input);
}

const matchFreightFlow = ai.defineFlow(
  {
    name: 'matchFreightFlow',
    inputSchema: MatchFreightInputSchema,
    outputSchema: MatchFreightOutputSchema,
  },
  async (input: MatchFreightInput) => {
    try {
        let prompt = `You are an AI assistant specialized in matching freight loads with transporters.

            Given the following information about a transporter:
            - Origin Location: ${input.location}
            - Destination: ${input.destination}
            - Vehicle Type: ${input.vehicleType}
            - Total Vehicle Capacity: ${input.capacity}`;
        
        if (input.rate) {
            prompt += `
            - Desired Rate: R${input.rate} per kilometer`;
        }

        if (input.isPartLoad && input.palletCount) {
            prompt += `
            - Load Type: This is a PART LOAD. The transporter has space for approximately ${input.palletCount} pallets.`;
        } else {
            prompt += `
            - Load Type: Looking for a FULL LOAD.`;
        }
        
        if (input.preferences) {
            prompt += `
            - Other Preferences: ${input.preferences}`;
        }

        prompt += `\n\nFind available freight loads that match these criteria.`;

        const response = await ai.generate({
            model: geminiModel,
            prompt: prompt,
            output: {
                schema: MatchFreightOutputSchema
            }
        });
        
        return response.output || { matches: [] };
    } catch (e: any) {
        console.error("AI Flow Error in matchFreightFlow:", e);
        return { matches: [] };
    }
  }
);
