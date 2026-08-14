'use server';
/**
 * @fileOverview AI Social Media Copywriter for Logistics Flow expansion.
 * Optimized for South African industry groups with structured prompt templates.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

const SocialCopyInputSchema = z.object({
  topic: z.string().min(3, "Please provide a topic."),
  criticalPoints: z.string().min(10, "Please provide some critical points to cover."),
  audience: z.enum(['transporters', 'suppliers', 'drivers', 'investors']).default('transporters'),
  tone: z.enum(['professional', 'community_casual', 'urgent', 'provocative']).default('community_casual'),
});
export type SocialCopyInput = z.infer<typeof SocialCopyInputSchema>;

const SocialCopyOutputSchema = z.object({
  posts: z.array(z.object({
    headline: z.string(),
    body: z.string(),
    hashtags: z.array(z.string()),
    imagePrompt: z.string().describe('Prompt for the AI Image generator to create a matching visual.'),
  })).describe('Distinct post options for social media based on the topic.'),
});
export type SocialCopyOutput = z.infer<typeof SocialCopyOutputSchema>;

export async function generateSocialCopy(input: SocialCopyInput): Promise<SocialCopyOutput> {
  return socialCopyFlow(input);
}

const socialCopyFlow = ai.defineFlow(
  {
    name: 'socialCopyFlow',
    inputSchema: SocialCopyInputSchema,
    outputSchema: SocialCopyOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: geminiModel,
      system: `You are an elite social media growth strategist for the South African transport industry.
      Your goal is to write high-engagement Facebook posts that drive signups for "Logistics Flow".
      
      POST STRATEGY:
      1. VALUE FIRST: Focus on breaking industry constraints (high costs, empty miles, lack of capital).
      2. LOCAL CONTEXT: Use South African terms (e.g., "Horses & Trailers", "Bakkie builders", "Rand per KM").
      3. DIRECT HOOK: Address the owner or operator directly.
      4. CTA: Always include a placeholder "[TRACKING_LINK]" at the end.`,
      prompt: `Generate 3 high-conversion Facebook posts for an audience of ${input.audience}. 
      Topic: ${input.topic} 
      Critical Points to cover: ${input.criticalPoints}
      Tone: ${input.tone}. 
      
      Ensure image prompts are professional and ready for Imagen 4.`,
      output: { schema: SocialCopyOutputSchema }
    });
    
    return response.output || { posts: [] };
  }
);
