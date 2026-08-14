'use server';
/**
 * @fileOverview Google Custom Search Tool for AI Agents.
 * Handles API interactions and provides robust sanitization for the Search Engine ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GoogleSearchInputSchema = z.object({
  query: z.string().describe('The search query.'),
});
type GoogleSearchInput = z.infer<typeof GoogleSearchInputSchema>;

const GoogleSearchResultSchema = z.object({
    title: z.string(),
    link: z.string(),
    snippet: z.string(),
});

const GoogleSearchOutputSchema = z.array(GoogleSearchResultSchema);

export const googleSearchTool = ai.defineTool(
  {
    name: 'googleSearch',
    description: 'Performs a targeted Google search across business directories and social platforms.',
    inputSchema: GoogleSearchInputSchema,
    outputSchema: GoogleSearchOutputSchema,
  },
  async (input: GoogleSearchInput) => {
    const sanitizeId = (val: string | undefined) => {
        if (!val) return '';
        // Handles cases where users copy the full query param 'cx=...'
        const match = val.match(/cx=([a-zA-Z0-9:]+)/);
        if (match) return match[1];
        // General cleanup of hidden characters
        return val.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    };

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY?.trim() || '';
    const cx = sanitizeId(process.env.CUSTOM_SEARCH_ENGINE_ID);

    if (!apiKey) throw new Error(`CONFIG_ERROR: GOOGLE_SEARCH_API_KEY missing.`);
    if (!cx) throw new Error(`CONFIG_ERROR: CUSTOM_SEARCH_ENGINE_ID missing.`);
    if (!input.query || input.query.trim().length === 0) return [];
    
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', input.query.trim());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    try {
        const response = await fetch(url.toString(), { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const apiMessage = errorData.error?.message || response.statusText;
            
            if (response.status === 429 || apiMessage.toLowerCase().includes('quota')) {
                throw new Error(`SEARCH_QUOTA_EXHAUSTED: Daily Google Search limit (100) reached.`);
            }
            if (response.status === 403) {
                throw new Error(`API_ERROR: Access Denied. Ensure "Custom Search API" is enabled in GCP.`);
            }
            throw new Error(`API_ERROR: Google Search failed (${response.status}): ${apiMessage}`);
        }
        
        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            title: item.title || 'Untitled',
            link: item.link || '',
            snippet: item.snippet || '',
        }));

    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error("SEARCH_TIMEOUT: Connection timed out.");
        throw e;
    }
  }
);
