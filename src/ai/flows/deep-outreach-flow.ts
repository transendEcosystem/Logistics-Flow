
'use server';
/**
 * @fileOverview Suggestion 3: Autonomous Industrial Researcher (Deep Personalization).
 * Takes forensic discovery data and generates hyper-targeted engagement content.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

const DeepOutreachInputSchema = z.object({
  companyName: z.string(),
  minedContent: z.string().describe("Forensic snippets from the website/social discovery."),
  audience: z.string(),
});
export type DeepOutreachInput = z.infer<typeof DeepOutreachInputSchema>;

const DeepOutreachOutputSchema = z.object({
  personalizedEmail: z.object({
    subject: z.string(),
    body: z.string(),
  }),
  videoScript: z.string().describe("A 30-second personalized video script for the ISA Agent."),
  keyPainPoint: z.string().describe("The specific industrial constraint identified."),
});
export type DeepOutreachOutput = z.infer<typeof DeepOutreachOutputSchema>;

export async function generateDeepOutreach(input: DeepOutreachInput): Promise<DeepOutreachOutput> {
  return deepOutreachFlow(input);
}

const deepOutreachFlow = ai.defineFlow(
  {
    name: 'deepOutreachFlow',
    inputSchema: DeepOutreachInputSchema,
    outputSchema: DeepOutreachOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: geminiModel,
      system: `ACT AS AN ELITE SALES STRATEGIST FOR THE SOUTH AFRICAN TRANSPORT SECTOR.
      Using the mined forensic evidence, identify a CRITICAL PAIN POINT for this business.
      Generate a hyper-personalized email and a 30-second video script that explicitly mentions their technical profile. 
      STRICTLY USE SOUTH AFRICAN BUSINESS CONTEXT.`,
      prompt: `Analyze ${input.companyName} for a ${input.audience} audience. Evidence:\n\n${input.minedContent}`,
      output: { schema: DeepOutreachOutputSchema }
    });
    
    return response.output!;
  }
);
