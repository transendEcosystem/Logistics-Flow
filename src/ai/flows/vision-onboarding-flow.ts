'use server';
/**
 * @fileOverview Vision-to-Node AI Onboarding V2.
 * High-fidelity extraction for industrial documentation: 
 * RC1, RSA IDs, Company Registration (CK), Trust Deeds, and Bank Statements.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

const VisionOnboardingInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of an industrial document, as a data URI."),
  docType: z.enum(['rc1', 'invoice', 'rsa_id', 'company_formation', 'trust_deed', 'partnership_agreement', 'bank_statement']).default('rc1'),
});
export type VisionOnboardingInput = z.infer<typeof VisionOnboardingInputSchema>;

const VisionOnboardingOutputSchema = z.object({
  extraction: z.object({
    // Identity & Corporate
    name: z.string().nullable().describe("Full Name or Registered Company Name."),
    idNumber: z.string().nullable().describe("13-digit RSA ID number."),
    registrationNumber: z.string().nullable().describe("Company registration (e.g. 20XX/XXXXXX/07)."),
    address: z.string().nullable().describe("Registered or physical address."),
    
    // Asset (RC1)
    make: z.string().nullable().describe("Vehicle make."),
    model: z.string().nullable().describe("Vehicle model/series."),
    year: z.string().nullable().describe("Manufacture year."),
    vin: z.string().nullable().describe("Full VIN or Chassis Number."),
    engineNumber: z.string().nullable().describe("Engine number."),
    registrationId: z.string().nullable().describe("Vehicle register number."),
    ownerName: z.string().nullable().describe("Registered owner name."),

    // Financial
    bankName: z.string().nullable(),
    accountNumber: z.string().nullable(),
    totalAmount: z.number().nullable().describe('For invoices only.'),
  }),
  confidence: z.number().describe('Extraction confidence score (0-1).'),
  summary: z.string().describe('Brief technical summary of the document findings.'),
});
export type VisionOnboardingOutput = z.infer<typeof VisionOnboardingOutputSchema>;

export async function runVisionOnboarding(input: VisionOnboardingInput): Promise<VisionOnboardingOutput> {
  return visionOnboardingFlow(input);
}

const visionOnboardingFlow = ai.defineFlow(
  {
    name: 'visionOnboardingFlow',
    inputSchema: VisionOnboardingInputSchema,
    outputSchema: VisionOnboardingOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: geminiModel,
      system: `ACT AS AN EXPERT INDUSTRIAL AUDITOR AND DOCUMENT ANALYST. 
      Analyze the provided document and extract the technical metadata into the schema provided. 
      
      MANDATES BY DOCUMENT TYPE:
      1. RSA ID: Extract full name and 13-digit ID number.
      2. CK1/Company Doc: Extract registered name and registration number (20XX/XXXXXX/07).
      3. RC1 (Vehicle): Extract VIN, Engine Number, Make, Model, Year, and Owner.
      4. Bank Statement: Extract Bank Name, Account Holder, and Account Number.
      5. Trust Deed / Partnership: Extract legal entity name and identifier.
      6. Invoices: Prioritize Total Amount and the list of parts/services.

      CRITICAL: If a field is not explicitly visible in the document, return null. DO NOT hallucinate.`,
      prompt: [
        { media: { url: input.photoDataUri } },
        { text: `Extract technical data from this ${input.docType.toUpperCase()} document.` }
      ],
      output: { schema: VisionOnboardingOutputSchema }
    });
    
    return response.output!;
  }
);
