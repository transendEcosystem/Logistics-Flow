'use server';
/**
 * @fileOverview Lending Scorecard AI Agent.
 * Performs the "Triple Engine" synthesis:
 * 1. Mined Data (Digital Footprint)
 * 2. Onboarded Data (Wizard/Vision)
 * 3. Credit Data (External Bureau)
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

const ScorecardInputSchema = z.object({
  minedData: z.any().describe("Forensic data harvested from the web scavenger."),
  onboardedData: z.any().describe("Data provided by the member during onboarding/Vision AI."),
  creditData: z.any().describe("Simulated or fetched credit bureau metadata."),
});
export type ScorecardInput = z.infer<typeof ScorecardInputSchema>;

const ScorecardOutputSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  trustScore: z.number().describe("0-100 score based on data alignment."),
  dataConsistencyReport: z.object({
    isAddressMatch: z.boolean(),
    isPrincipalVerified: z.boolean(),
    isFleetAlignmentVerified: z.boolean(),
    discrepancyNotes: z.string(),
  }),
  recommendation: z.string().describe("Final audit recommendation."),
  generatedAt: z.string(),
});
export type ScorecardOutput = z.infer<typeof ScorecardOutputSchema>;

export async function generateScorecard(input: ScorecardInput): Promise<ScorecardOutput> {
  return lendingScorecardFlow(input);
}

const lendingScorecardFlow = ai.defineFlow(
  {
    name: 'lendingScorecardFlow',
    inputSchema: ScorecardInputSchema,
    outputSchema: ScorecardOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: geminiModel,
      system: `ACT AS AN ELITE INDUSTRIAL UNDERWRITER AND FRAUD INVESTIGATOR.
      You are performing a "Triple Engine" analysis for a South African logistics lender.
      
      YOUR TASK:
      Compare the 'Mined Data' (what we found online) against the 'Onboarded Data' (what the client provided).
      Identify any "Silence Taxes" or "Information Constraints" (discrepancies).
      Evaluate the 'Credit Data' in the context of their operational footprint.
      
      STRICTLY USE SOUTH AFRICAN LENDING CONTEXT (NCA, POPI, and industrial norms).`,
      prompt: `PERFORM ANALYSIS FOR: ${input.onboardedData?.name || 'Applicant'}.
      
      MINED EVIDENCE: ${JSON.stringify(input.minedData)}
      ONBOARDED DATA: ${JSON.stringify(input.onboardedData)}
      CREDIT METADATA: ${JSON.stringify(input.creditData)}`,
      output: { schema: ScorecardOutputSchema }
    });
    
    return response.output!;
  }
);
