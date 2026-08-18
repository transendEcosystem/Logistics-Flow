
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getClientSideAuthToken } from '@/firebase';

async function fetchFromAdminAPI(token: string, action: string, payload?: any) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error for action: ${action}`);
    }
    return result;
}

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  draft: 'secondary',
  pending_review: 'outline',
  approved: 'default',
  rejected: 'destructive',
};

export default function MallDivisionContent() {
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
    const [shops, setShops] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const result = await fetchFromAdminAPI(token, 'getShops');
            if (result.data) {
                const allShops = result.data;

                // De-duplicate the shops based on their ID
                const uniqueShops = Array.from(new Map(allShops.map((shop: any) => [shop.id, shop])).values());

                setStats({
                    total: uniqueShops.length,
                    pending: uniqueShops.filter((s:any) => s.status === 'pending_review').length,
                    approved: uniqueShops.filter((s:any) => s.status === 'approved').length,
                });
                setShops(uniqueShops);
            } else {
                setError("Failed to load shop data.");
            }
        } catch(e: any) {
            setError(e.message)
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
     if (error) {
        return <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md"><h4 className="font-semibold">Error</h4><p>{error}</p></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Mall Division Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardHeader><CardTitle>Total Shops</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
                <Card><CardHeader><CardTitle>Pending Approval</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent></Card>
                <Card><CardHeader><CardTitle>Approved & Live</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.approved}</div></CardContent></Card>
            </div>
             <Card>
                <CardHeader><CardTitle>Recently Created/Updated Shops</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableCell>Shop Name</TableCell><TableCell>Owner ID</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell></TableRow></TableHeader>
                        <TableBody>
                            {shops.slice(0, 5).map(shop => (
                                <TableRow key={shop.id}>
                                    <TableCell className="font-medium">{shop.shopName}</TableCell>
                                    <TableCell className="font-mono text-xs">{shop.ownerId}</TableCell>
                                    <TableCell>{shop.category}</TableCell>
                                    <TableCell><Badge variant={statusColors[shop.status] || 'secondary'} className="capitalize">{shop.status?.replace(/_/g, ' ')}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
