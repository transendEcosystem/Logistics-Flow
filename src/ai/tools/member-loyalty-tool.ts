
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'genkit';
import { getAdminApp } from '@/lib/firebase-admin';

const MemberLoyaltyInputSchema = z.object({
    companyId: z.string().describe('The ID of the company to check.'),
});

const MemberLoyaltyOutputSchema = z.object({
    loyaltyTier: z.string().describe('The current loyalty tier of the member (e.g., bronze, silver, gold).'),
    rewardPoints: z.number().describe('The current number of reward points the member has.'),
});

export const getMemberLoyaltyTool = ai.defineTool(
    {
        name: 'getMemberLoyalty',
        description: 'Retrieves the loyalty status and reward points for a given company.',
        inputSchema: MemberLoyaltyInputSchema,
        outputSchema: MemberLoyaltyOutputSchema,
    },
    async (input) => {
        const { app, error: initError } = getAdminApp();
        if (initError || !app) {
            throw new Error(`Admin SDK not initialized: ${initError}`);
        }
        const db = getFirestore(app);

        const companyDoc = await db.collection('companies').doc(input.companyId).get();

        if (!companyDoc.exists) {
            throw new Error(`Company with ID ${input.companyId} not found.`);
        }
        
        const companyData = companyDoc.data()!;
        
        return {
            loyaltyTier: companyData.loyaltyTier || 'bronze',
            rewardPoints: companyData.rewardPoints || 0,
        };
    }
);
