'use server';
/**
 * @fileOverview An AI-powered agent for negotiating commercial agreements with members.
 */

import { ai, geminiModel } from '@/ai/genkit';
import { z } from 'genkit';
import { getShopPerformanceTool } from '../tools/shop-performance-tool';
import { getMemberLoyaltyTool } from '../tools/member-loyalty-tool';
import { NegotiationInputSchema, NegotiationOutputSchema } from '../schemas';

export type NegotiationInput = z.infer<typeof NegotiationInputSchema>;
export type NegotiationOutput = z.infer<typeof NegotiationOutputSchema>;

export async function negotiateAgreement(input: NegotiationInput): Promise<NegotiationOutput> {
    return negotiationAgentFlow(input);
}

const negotiationAgentFlow = ai.defineFlow(
    {
        name: 'negotiationAgentFlow',
        inputSchema: NegotiationInputSchema,
        outputSchema: NegotiationOutputSchema,
    },
    async (input) => {
        try {
            const { companyId, shopId, proposedRate } = input;

            const response = await ai.generate({
                model: geminiModel,
                tools: [getShopPerformanceTool, getMemberLoyaltyTool],
                system: `You are a commercial negotiation agent for a logistics platform.
                
                Platform Standard Commission Rate: 2.5%
                Platform Target Rate (for high-value partners): 1.5%

                Evaluate a commission rate proposal from a member.`,
                prompt: `Evaluate the proposal from company ${companyId} for shop ${shopId}. They have proposed a commission rate of ${proposedRate}%.`,
                output: {
                    schema: NegotiationOutputSchema
                }
            });
            
            const toolRequests = response.toolRequests;
            const agentTrace = toolRequests ? toolRequests.map(req => `Used tool: ${req.toolRequest.name}`) : [];

            const output = response.output;
            if (!output) {
                throw new Error("The negotiation agent failed to produce a decision.");
            }
            
            return { ...output, agentTrace };
        } catch (e: any) {
            console.error("AI Flow Error in negotiationAgentFlow:", e);
            // Explicitly cast the decision to satisfy the Zod enum and TypeScript literal types
            return {
                decision: 'counter' as const,
                counterOfferRate: 2.25,
                justification: "System currently experiencing issues. Reverting to standard counter-offer.",
                agentTrace: ["Agent execution failed."]
            };
        }
    }
);
