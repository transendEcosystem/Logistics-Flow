
'use server';
/**
 * @fileOverview An AI-powered image generation flow.
 *
 * - generateImage - A function that creates an image based on a text prompt.
 * - ImageGenerateInput - The input type for the generateImage function.
 * - ImageGenerateOutput - The return type for the generateImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImageGenerateInputSchema = z.object({
  prompt: z.string().describe('The text prompt describing the desired image.'),
});
export type ImageGenerateInput = z.infer<typeof ImageGenerateInputSchema>;

const ImageGenerateOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe('The generated image as a data URI.'),
});
export type ImageGenerateOutput = z.infer<typeof ImageGenerateOutputSchema>;

export async function generateImage(input: ImageGenerateInput): Promise<ImageGenerateOutput> {
  return imageGenerateFlow(input);
}

const imageGenerateFlow = ai.defineFlow(
  {
    name: 'imageGenerateFlow',
    inputSchema: ImageGenerateInputSchema,
    outputSchema: ImageGenerateOutputSchema,
  },
  async (input: ImageGenerateInput) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: input.prompt,
    });

    if (!media?.url) {
      throw new Error('Image generation failed to return an image.');
    }
    
    return { imageDataUri: media.url };
  }
);
