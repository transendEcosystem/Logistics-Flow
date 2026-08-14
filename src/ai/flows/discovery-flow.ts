'use server';
/**
 * @fileOverview Automated industrial discovery agent V13.
 * INDUCTIVE RECONSTRUCTION PROTOCOL: Stitches fragments from multiple sources.
 * SOCIAL HUB RESILIENT: Optimized for Facebook Pages and South African business directories.
 * STAKEHOLDER MANDATE: Specifically extracts CEO, Marketing, Operations, and Technical Managers.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';
import { googleSearchTool } from '../tools/google-search';

const DiscoveryInputSchema = z.object({
  category: z.string(),
  type: z.enum(['supplier', 'finance', 'transporter', 'driver', 'warehouse', 'distributor']),
  batchSize: z.number().optional().default(30),
});
export type DiscoveryInput = z.infer<typeof DiscoveryInputSchema>;

const ContactSchema = z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    mobile: z.string().nullable()
});

const DiscoveryOutputSchema = z.object({
    results: z.array(z.object({
        record_id: z.string(),
        companyName: z.string(),
        industrial_category: z.string(),
        website: z.string().nullable(),
        email: z.string().nullable().describe('General company email.'),
        phone: z.string().nullable().describe('Company landline.'),
        address: z.string().nullable().describe('PRIORITIZE FACEBOOK BIO ADDRESS.'),
        marketingManager: ContactSchema.nullable(),
        operationsManager: ContactSchema.nullable(),
        technicalManager: ContactSchema.nullable(),
        ceo: ContactSchema.nullable(),
        primaryContactRole: z.enum(['marketingManager', 'ceo', 'operationsManager', 'technicalManager']).default('marketingManager'),
        minedServiceWording: z.string().nullable().describe('Verbatim technical profile (approx 300 words).'),
        notes: z.string().optional()
    })).describe('A list of verified professional entities.'),
});
export type DiscoveryOutput = z.infer<typeof DiscoveryOutputSchema>;

export async function runDiscovery(input: DiscoveryInput): Promise<DiscoveryOutput> {
  return discoveryFlow(input);
}

const discoveryFlow = ai.defineFlow(
  {
    name: 'discoveryFlow',
    inputSchema: DiscoveryInputSchema,
    outputSchema: DiscoveryOutputSchema,
  },
  async (input) => {
    try {
        const { category, type, batchSize } = input;
        
        const systemPrompt = `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V13 - INDUCTIVE RECONSTRUCTION).
        RETURN ONLY RAW JSON. NO MARKDOWN. NO CODE BLOCKS. NO PREAMBLE.
        
        REQUIRED INVESTIGATION PROTOCOL PER RECORD:
        1. ACRONYM EXPANSION: Identify full legal names from initials.
        2. INDUCTIVE STITCHING: Combine data fragments from multiple sources.
        3. SOCIAL HUB RESILIENCY: For SA hauliers without websites, the FACEBOOK PAGE BIO is the source of truth for the ADDRESS and WHATSAPP.
        4. IDENTITY RESOLUTION: You MUST identify the direct CONTACT details (Email/Mobile) for the CEO, Marketing Manager, Operations Manager, and Technical Manager.
        
        CRITICAL INTEGRITY SHIELD:
        1. REAL DATA ONLY: DO NOT RETURN MOCK OR PLACEHOLDER DATA.
        2. EVIDENCE MANDATE: Every field must be derived from actual snippet evidence.
        
        ID: GENERATE A UNIQUE ID STARTING WITH 'DISC_${type.toUpperCase()}_'.`;

        const response = await ai.generate({
            model: geminiModel,
            tools: [googleSearchTool],
            system: systemPrompt,
            prompt: `EXTRACT ${batchSize} UNIQUE VERIFIED PROFESSIONAL RECORDS FOR ${category} IN SOUTH AFRICA. PRIORITIZE FACEBOOK AND DIRECTORIES IF WEBSITES ARE MISSING. FIND ALL MANAGER CONTACTS.`,
            output: {
                schema: DiscoveryOutputSchema
            }
        });
        
        return response.output || { results: [] };

    } catch (e: any) {
        console.error("[DISCOVERY_V13] Error:", e);
        throw e;
    }
  }
);
