'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, Target, TrendingUp, Handshake, UserCheck, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getClientSideAuthToken, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDateSafe } from '@/lib/utils';
import { format as formatDateFns } from 'date-fns';

export default function PerformanceContent() {
    const { user, isUserLoading } = useUser();
    const [networkData, setNetworkData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const loadNetworkData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("You must be logged in to view your network.");
            
            const response = await fetch('/api/getNetwork', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Failed to fetch network data.');
            
            setNetworkData(result.data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isUserLoading && user) {
            loadNetworkData();
        }
    }, [user, isUserLoading, loadNetworkData]);

    const stats = {
        totalReferrals: networkData.length,
        activeReferrals: networkData.filter(m => m.status === 'active').length,
        conversionRate: networkData.length > 0 ? (networkData.filter(m => m.status === 'active').length / networkData.length) * 100 : 0,
    };

    const memberGrowthData = networkData
        .reduce((acc: Record<string, {name: string, NewMembers: number, date: Date}>, member: any) => {
            if (!member.createdAt) return acc;
            const joinDate = new Date(member.createdAt);
            if (isNaN(joinDate.getTime())) return acc;

            const monthKey = formatDateFns(joinDate, 'yyyy-MMM');
            
            if (!acc[monthKey]) {
                acc[monthKey] = { name: formatDateFns(joinDate, 'MMM yy'), NewMembers: 0, date: joinDate };
            }
            acc[monthKey].NewMembers++;
            return acc;
        }, {} as Record<string, {name: string, NewMembers: number, date: Date}>);
        
    const chartData = (Object.values(memberGrowthData) as Array<{name: string, NewMembers: number, date: Date}>)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-6); // Last 6 months

    const downloadAsCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            toast({
                variant: "destructive",
                title: "No data to export",
            });
            return;
        }
        const header = Object.keys(data[0]);
        const csv = [
            header.join(','),
            ...data.map(row => header.map(fieldName => {
                let value = row[fieldName];
                if (value === null || value === undefined) return '';
                let stringValue = String(value);
                if (/[",\n]/.test(stringValue)) {
                    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(','))
        ].join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleExport = () => {
        const dataToExport = networkData.map(member => ({
            'Member ID': member.id,
            'Company Name': member.companyName,
            'Owner Name': member.ownerName,
            'Owner Email': member.ownerEmail,
            'Membership': member.membershipId,
            'Status': member.status,
            'Joined At': new Date(member.createdAt).toLocaleDateString(),
        }));
        downloadAsCSV(dataToExport, 'my-network.csv');
    };


    if (isLoading || isUserLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md">
                <h4 className="font-semibold">Error Loading Performance Data</h4>
                <p>{error}</p>
                 <Button onClick={loadNetworkData} variant="destructive" className="mt-4">Try Again</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <CardHeader className="px-0 flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <TrendingUp className="h-8 w-8 text-primary"/>
                    <div>
                        <CardTitle>Sales Performance</CardTitle>
                        <CardDescription>
                            An overview of your network growth and referral performance.
                        </CardDescription>
                    </div>
                </div>
                 {networkData.length > 0 && (
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export Network
                    </Button>
                )}
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                        <Handshake className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                        <p className="text-xs text-muted-foreground">Total members who joined using your link.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{stats.activeReferrals}</p>
                        <p className="text-xs text-muted-foreground">Members who have upgraded to a paid plan.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Percentage of referrals who became active.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Referral Growth (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Area type="monotone" dataKey="NewMembers" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorGrowth)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Recent Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Member Name</TableHead><TableHead>Company</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {networkData.slice(0, 5).map(member => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.ownerName}</TableCell>
                                    <TableCell>{member.companyName}</TableCell>
                                    <TableCell><Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="capitalize">{member.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/account?view=network">View Full Network</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
