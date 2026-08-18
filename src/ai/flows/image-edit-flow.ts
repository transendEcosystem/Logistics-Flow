
'use server';
/**
 * @fileOverview An AI-powered image editing flow.
 *
 * - imageEdit - A function that edits an image based on a text prompt.
 * - ImageEditInput - The input type for the imageEdit function.
 * - ImageEditOutput - The return type for the imageEdit function.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';

const ImageEditInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to edit, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().describe('The text prompt describing the desired edit.'),
});
export type ImageEditInput = z.infer<typeof ImageEditInputSchema>;

const ImageEditOutputSchema = z.object({
  enhancedImageDataUri: z
    .string()
    .describe('The edited image as a data URI.'),
});
export type ImageEditOutput = z.infer<typeof ImageEditOutputSchema>;

export async function imageEdit(input: ImageEditInput): Promise<ImageEditOutput> {
  return imageEditFlow(input);
}

const imageEditFlow = ai.defineFlow(
  {
    name: 'imageEditFlow',
    inputSchema: ImageEditInputSchema,
    outputSchema: ImageEditOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: geminiModel,
      prompt: [
        { media: { url: input.photoDataUri } },
        { text: input.prompt },
      ],
      config: {
          responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed to return an image.');
    }
    
    return { enhancedImageDataUri: media.url };
  }
);
