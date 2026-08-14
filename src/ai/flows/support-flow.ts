'use server';
/**
 * @fileOverview An AI-powered customer support agent.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

const SupportInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() })),
  })).optional().describe('Conversation history.'),
  query: z.string().min(1, "Query cannot be empty.").describe('User question.'),
});
export type SupportInput = z.infer<typeof SupportInputSchema>;

const SupportOutputSchema = z.object({
  response: z.string().describe("Helpful response."),
});
export type SupportOutput = z.infer<typeof SupportOutputSchema>;

export async function supportQuery(input: SupportInput): Promise<SupportOutput> {
  try {
    return await supportFlow(input);
  } catch (error: any) {
    console.error("Support Flow Error:", error);
    const message = error.message || "";
    // Standardized detection for Resource Exhausted (429)
    if (message.includes('429') || message.includes('Quota') || message.includes('exhausted') || message.includes('parse stream')) {
        return { response: "I'm currently processing too many requests. Please wait 60 seconds for my quota to reset. [Quota Exceeded]" };
    }
    return { response: "I'm experiencing technical difficulties connecting to my brain. Please try again shortly." };
  }
}

const supportFlow = ai.defineFlow(
  {
    name: 'supportFlow',
    inputSchema: SupportInputSchema,
    outputSchema: SupportOutputSchema,
  },
  async (input) => {
    const historyMessages = (input.history || []).map((msg) => ({
      role: msg.role as 'user' | 'model',
      content: msg.content,
    }));

    const response = await ai.generate({
      model: geminiModel,
      system: "Helpful and friendly AI assistant for Logistics Flow. You are an industrial expert.",
      messages: [
        ...historyMessages,
        { role: 'user' as const, content: [{ text: input.query }] }
      ] as any,
    });
    
    return { response: response.text || "I'm sorry, I couldn't generate a response." };
  }
);
