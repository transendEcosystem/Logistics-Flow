
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: input.prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error?.message || 'Gemini image generation failed.');
    }

    const imagePart = result?.candidates?.flatMap((candidate: any) => candidate?.content?.parts || [])
      .find((part: any) => part?.inlineData?.data && String(part.inlineData.mimeType || '').startsWith('image/'));
    if (!imagePart) throw new Error('Gemini did not return an image.');

    return { imageDataUri: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` };
  }
);
