'use server';
/**
 * @fileOverview An AI-powered video generation flow.
 *
 * - generateVideo - A function that creates a video based on a text prompt.
 * - VideoGenerateInput - The input type for the generateVideo function.
 * - VideoGenerateOutput - The return type for the generateVideo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VideoGenerateInputSchema = z.object({
  prompt: z.string().describe('The text prompt describing the desired video.'),
  imageDataUri: z.string().optional().describe("An optional starting image for the video, as a data URI."),
  durationSeconds: z.number().optional().describe('The duration of the video in seconds.'),
});
export type VideoGenerateInput = z.infer<typeof VideoGenerateInputSchema>;

const VideoGenerateOutputSchema = z.object({
  videoDataUri: z
    .string()
    .describe('The generated video as a data URI.'),
});
export type VideoGenerateOutput = z.infer<typeof VideoGenerateOutputSchema>;

export async function generateVideo(input: VideoGenerateInput): Promise<VideoGenerateOutput> {  
  return videoGenerateFlow(input);
}

const videoGenerateFlow = ai.defineFlow(
  {
    name: 'videoGenerateFlow',
    inputSchema: VideoGenerateInputSchema,
    outputSchema: VideoGenerateOutputSchema,
  },
  async (input: VideoGenerateInput) => {
    const { prompt, imageDataUri, durationSeconds } = input;
    
    const promptParts: any[] = [{ text: prompt }];
    if (imageDataUri) {
      promptParts.push({ media: { url: imageDataUri } });
    }
    
    let { operation } = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: promptParts,
      config: {
        durationSeconds: durationSeconds || 5,
        aspectRatio: '16:9',
      },
    });
  
    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }
  
    // Wait until the operation completes.
    while (!operation.done) {
      operation = await ai.checkOperation(operation);
      // Sleep for 5 seconds before checking again.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  
    if (operation.error) {
      throw new Error('Failed to generate video: ' + operation.error.message);
    }
  
    const video = operation.output?.message?.content.find((p: any) => !!p.media);
    if (!video) {
      throw new Error('Failed to find the generated video in the operation output.');
    }

    // The Veo API returns a URL that needs an API key to download.
    // We'll fetch it on the server and convert it to a data URI to send to the client.
    const videoDownloadResponse = await fetch(
        `${video.media!.url}&key=${process.env.GEMINI_API_KEY}`
    );

    if (!videoDownloadResponse.ok) {
        throw new Error(`Failed to download generated video. Status: ${videoDownloadResponse.status}`);
    }
    
    const arrayBuffer = await videoDownloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Video = buffer.toString('base64');
    
    return { videoDataUri: `data:video/mp4;base64,${base64Video}` };
  }
);
