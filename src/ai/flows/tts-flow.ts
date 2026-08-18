
'use server';
/**
 * @fileOverview An AI-powered Text-to-Speech (TTS) flow.
 *
 * - generateAudio - A function that converts text to speech.
 * - TTSInput - The input type for the generateAudio function.
 * - TTSOutput - The return type for the generateAudio function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';

const TTSInputSchema = z.object({
  script: z.string().min(1, 'Script cannot be empty.'),
  voice: z.string().optional().default('Algenib'),
});
export type TTSInput = z.infer<typeof TTSInputSchema>;

const TTSOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});
export type TTSOutput = z.infer<typeof TTSOutputSchema>;

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export async function generateAudio(input: TTSInput): Promise<TTSOutput> {
  return ttsFlow(input);
}

const ttsFlow = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: TTSInputSchema,
    outputSchema: TTSOutputSchema,
  },
  async (input: TTSInput) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: input.voice || 'Algenib' },
          },
        },
      },
      prompt: input.script,
    });

    if (!media) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    return {
      audioDataUri: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);
