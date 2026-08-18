'use server';
/**
 * @fileOverview High-fidelity Industrial Research Agent V13.1.
 * INDUCTIVE RECONSTRUCTION PROTOCOL: Stitches together fragments from multiple sources.
 * SOCIAL-RESILIENT: Prioritizes Facebook and Business Directories if official domains are missing.
 * STAKEHOLDER MANDATE: Extracts CEO, Marketing Lead, Operations Manager, and Technical Manager.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';
import { googleSearchTool } from '../tools/google-search';

const ContactInfoSchema = z.object({
  name: z.string().nullable().describe('Full verified human name.'),
  email: z.string().nullable().describe('Direct professional email address.'),
  mobile: z.string().nullable().describe('Direct mobile number (+27 format).'),
});

const EnrichPartnerInputSchema = z.object({
  companyName: z.string(),
});
export type EnrichPartnerInput = z.infer<typeof EnrichPartnerInputSchema>;

const EnrichPartnerOutputSchema = z.object({
  email: z.string().nullable().describe('Primary general/professional email.'),
  phone: z.string().nullable().optional().describe('Primary landline.'),
  mobile: z.string().nullable().optional().describe('Primary direct mobile.'),
  website: z.string().nullable().describe('Official corporate domain or Facebook URL.'),
  address: z.string().nullable().describe('Full verified physical operational address. PRIORITIZE FACEBOOK BIO OVER DIRECTORIES.'),
  industrial_category: z.string().nullable().describe('Refined industrial classification.'),
  minedServiceWording: z.string().nullable().describe('A 300-word technical profile extracted from the website or social content.'),
  marketingManager: ContactInfoSchema.nullable().describe('Full contact details for the Marketing Manager.'),
  operationsManager: ContactInfoSchema.nullable().describe('Full contact details for the Operations Manager.'),
  technicalManager: ContactInfoSchema.nullable().describe('Full contact details for the Technical/Maintenance Manager.'),
  ceo: ContactInfoSchema.nullable().describe('Full contact details for the CEO/MD/Owner.'),
  primaryContactRole: z.enum(['marketingManager', 'ceo', 'operationsManager', 'technicalManager']).default('marketingManager'),
});
export type EnrichPartnerOutput = z.infer<typeof EnrichPartnerOutputSchema>;

export async function enrichPartner(input: EnrichPartnerInput): Promise<EnrichPartnerOutput> {
  return enrichPartnerFlow(input);
}

const enrichPartnerFlow = ai.defineFlow(
  {
    name: 'enrichPartnerFlow',
    inputSchema: EnrichPartnerInputSchema,
    outputSchema: EnrichPartnerOutputSchema,
  },
  async (input) => {
    const company = input.companyName.trim();
    if (!company) {
      throw new Error("Company name is required for enrichment.");
    }

    // SEARCH STRATEGY V13.1: INDUCTIVE RECONSTRUCTION (AGGRESSIVE CONTACT RESOLUTION)
    const siteResults = await googleSearchTool({ 
        query: `${company} South Africa official website contact management team CEO Operations Technical` 
    });
    
    const teamResults = await googleSearchTool({ 
        query: `${company} South Africa "Operations Manager" OR "Technical Manager" OR "Marketing Manager" contact email mobile` 
    });

    const socialResults = await googleSearchTool({
        query: `${company} South Africa Facebook page bio "About" section address email mobile whatsapp`
    });

    const directoryResults = await googleSearchTool({
        query: `${company} South Africa infoisinfo yellosa brabys contact details physical address`
    });

    const leaderResolveResults = await googleSearchTool({
        query: `${company} South Africa CEO Managing Director Marketing Manager direct professional email mobile number`
    });

    const allContent = [
        ...(siteResults || []), 
        ...(teamResults || []), 
        ...(socialResults || []), 
        ...(directoryResults || []),
        ...(leaderResolveResults || [])
    ]
        .map(res => `SOURCE: ${res.link}\nTITLE: ${res.title}\nSNIPPET: ${res.snippet}`)
        .join('\n---\n');

    const extraction = await ai.generate({
        model: geminiModel,
        system: `ACT AS AN ELITE SOUTH AFRICAN INDUSTRIAL RESEARCH AGENT (V13.1 - INDUCTIVE RECONSTRUCTION).
        
        INVESTIGATION MANDATE:
        1. ACRONYM EXPANSION: Resolve acronyms (e.g. EC, JH) to full legal names.
        2. SOCIAL HUB RESILIENCY: For SA hauliers, the FACEBOOK PAGE BIO is the PRIMARY source of truth for the PHYSICAL ADDRESS and WHATSAPP. Use it even if directories show different data.
        3. IDENTITY RESOLUTION: You MUST bridge names to contact details. If you find a name (e.g. Barry Burger), aggressively search the snippets for their email/mobile.
        4. FRAGMENT STITCHING: Combine data from all snippets (Directories, Social, LinkedIn) to eliminate nulls.
        5. MANDATE: Resolve all 4 management roles: CEO, Marketing, Operations, and Technical.
        
        MATE: Return RAW JSON only.`,
        prompt: `PERFORM THE V13.1 INDUCTIVE HUNT FOR "${company}" USING THIS SEARCH EVIDENCE:\n\n${allContent}`,
        output: {
            schema: EnrichPartnerOutputSchema
        }
    });
    
    const result = extraction.output as EnrichPartnerOutput;
    
    return result || { 
        email: null, 
        phone: null, 
        mobile: null, 
        website: null, 
        address: null, 
        industrial_category: null, 
        minedServiceWording: null, 
        marketingManager: null, 
        operationsManager: null, 
        technicalManager: null, 
        ceo: null, 
        primaryContactRole: 'marketingManager' as const 
    } as EnrichPartnerOutput;
  }
);
