
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'genkit';
import { getAdminApp } from '@/lib/firebase-admin';

const ShopPerformanceInputSchema = z.object({
    shopId: z.string().describe('The ID of the shop to check.'),
    companyId: z.string().describe('The ID of the company that owns the shop.'),
});

const ShopPerformanceOutputSchema = z.object({
    productCount: z.number().describe('The number of products listed in the shop.'),
    // In a real scenario, you would calculate this from transaction data.
    // For this example, we will return a placeholder.
    totalSalesVolume: z.number().describe('The total sales volume of the shop (placeholder).'), 
});

export const getShopPerformanceTool = ai.defineTool(
    {
        name: 'getShopPerformance',
        description: 'Retrieves performance metrics for a given shop, such as product count and sales volume.',
        inputSchema: ShopPerformanceInputSchema,
        outputSchema: ShopPerformanceOutputSchema,
    },
    async (input) => {
        const { app, error: initError } = getAdminApp();
        if (initError || !app) {
            throw new Error(`Admin SDK not initialized: ${initError}`);
        }
        const db = getFirestore(app);

        const productsSnap = await db.collection(`companies/${input.companyId}/shops/${input.shopId}/products`).get();
        
        // Placeholder for sales volume
        const totalSalesVolume = Math.floor(Math.random() * 50000); 

        return {
            productCount: productsSnap.size,
            totalSalesVolume: totalSalesVolume,
        };
    }
);
