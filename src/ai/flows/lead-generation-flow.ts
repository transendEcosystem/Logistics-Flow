'use server';
/**
 * @fileOverview An AI-powered research agent for generating potential sales leads.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { googleSearchTool } from '../tools/google-search';
import { z } from 'genkit'; 

const LeadGenerationInputSchema = z.object({
  prompt: z.string().min(20, 'Please provide a detailed prompt.').describe('A detailed prompt for the AI agent, instructing it what to research.'),
});
export type LeadGenerationInput = z.infer<typeof LeadGenerationInputSchema>;

const LeadGenerationOutputSchema = z.object({
    leads: z.array(z.object({
        companyName: z.string().describe('The name of the potential lead company.'),
        role: z.string().describe('The likely role of this company in the ecosystem (e.g., Vendor, Buyer, Partner).'),
        address: z.string().nullable().optional().describe("The company's physical address, if found."),
        website: z.string().url().nullable().optional().describe("The company's website URL, if found."),
        phone: z.string().nullable().optional().describe("The company's primary phone number, if found."),
        email: z.string().email().nullable().optional().describe("A general contact email for the company (e.g., info@, sales@), if found."),
        contactPerson: z.string().nullable().optional().describe("A potential contact person's name, if found."),
    })).describe('A list of potential leads based on the research topic.'),
});
export type LeadGenerationOutput = {
    leads: z.infer<typeof LeadGenerationOutputSchema>['leads'];
    error?: string;
};

export async function leadGenerationFlow(input: LeadGenerationInput): Promise<LeadGenerationOutput> {
  try {
    const result = await leadGenerationAIFlow(input);
    return result;
  } catch (error: any) {
    console.error("Lead Gen Flow Error:", error);
    let message = error.message || "Could not connect to AI service.";
    // Standardized detection for Resource Exhausted (429)
    if (message.includes('429') || message.includes('Quota') || message.includes('exhausted') || message.includes('parse stream')) {
        message = "AI Rate Limit Reached (429). The system is under high load. Please wait 60 seconds before generating more leads.";
    }
    return {
      leads: [],
      error: message
    };
  }
}

const leadGenerationAIFlow = ai.defineFlow(
  {
    name: 'leadGenerationAIFlow',
    inputSchema: LeadGenerationInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    const response = await ai.generate({
        model: geminiModel,
        tools: [googleSearchTool],
        system: "Expert South African market research agent. Sourcing leads from real-world web data. You strictly ignore results from outside South Africa. RETURN ONLY RAW JSON.",
        prompt: input.prompt,
        output: {
            schema: LeadGenerationOutputSchema
        }
    });
    
    return response.output || { leads: [] };
  }
);
