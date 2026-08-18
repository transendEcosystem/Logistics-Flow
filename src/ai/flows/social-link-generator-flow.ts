'use server';
/**
 * @fileOverview An AI-powered flow to suggest social media links for a shop.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';
import { SocialLinkGeneratorInputSchema, SocialLinkGeneratorOutputSchema } from '../schemas';

export type SocialLinkGeneratorInput = z.infer<typeof SocialLinkGeneratorInputSchema>;
export type SocialLinkGeneratorOutput = z.infer<typeof SocialLinkGeneratorOutputSchema>;

export async function generateSocialLinks(input: SocialLinkGeneratorInput): Promise<SocialLinkGeneratorOutput> {
  return socialLinkGeneratorFlow(input);
}

const socialLinkGeneratorFlow = ai.defineFlow(
  {
    name: 'socialLinkGeneratorFlow',
    inputSchema: SocialLinkGeneratorInputSchema,
    outputSchema: SocialLinkGeneratorOutputSchema,
  },
  async (input: SocialLinkGeneratorInput) => {
    try {
        const response = await ai.generate({
            model: geminiModel,
            prompt: `You are an assistant that creates plausible social media URLs for a business.
            Given the shop name "${input.shopName}", create conventional, best-guess URLs.`,
            output: {
                schema: SocialLinkGeneratorOutputSchema
            }
        });

        return response.output || {};
    } catch (e: any) {
        console.error("AI Flow Error in socialLinkGeneratorFlow:", e);
        return {};
    }
  }
);
