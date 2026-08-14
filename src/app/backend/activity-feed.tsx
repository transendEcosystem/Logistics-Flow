'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Activity, User, Building, FileText, ShoppingCart, Users, Mail, MousePointer2, ArrowRight } from 'lucide-react';
import { getClientSideAuthToken } from '@/firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDateSafe, cn } from '@/lib/utils';

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

const getSubjectInfo = (log: any) => {
    const path = log.collectionPath || '';
    const action = log.action || '';

    if (action === 'email_opened') return { name: 'Engagement Email', href: '#', icon: Mail, color: 'text-blue-500' };
    if (action === 'landing_page_accessed') return { name: 'Handshake Link', href: '#', icon: MousePointer2, color: 'text-purple-500' };

    const pathSegments = path.split('/');
    if (pathSegments.includes('staff')) {
        return { name: 'Staff Member', href: `/backend?view=staff`, icon: Users, color: 'text-slate-500' };
    }
    if (pathSegments.includes('shops')) {
        return { name: 'Shop Profile', href: `/backend?view=shops`, icon: ShoppingCart, color: 'text-primary' };
    }
    if (pathSegments.includes('products')) {
        return { name: 'Product', href: `/backend?view=shops`, icon: ShoppingCart, color: 'text-primary' };
    }
    if (path.startsWith('users')) {
        return { name: 'User Profile', href: `/backend?view=wallet&memberId=${log.companyId}`, icon: User, color: 'text-slate-500' };
    }
    if (path.startsWith('companies')) {
        return { name: 'Company Profile', href: `/backend?view=wallet&memberId=${log.documentId}`, icon: Building, color: 'text-slate-500' };
    }
    
    return { name: 'System Record', href: '#', icon: FileText, color: 'text-slate-500' };
};


export default function ActivityFeed() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getClientSideAuthToken();
            if (!token) throw new Error("Authentication failed.");
            
            const result = await fetchFromAdminAPI(token, 'getAuditLogs');
            const sortedLogs = result.data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setLogs(sortedLogs);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);
    
    const actionConfig: { [key: string]: { color: 'default' | 'secondary' | 'destructive' | 'outline', text: string } } = {
        create: { color: 'default', text: 'created a new' },
        update: { color: 'secondary', text: 'updated the' },
        delete: { color: 'destructive', text: 'deleted a' },
        email_opened: { color: 'outline', text: 'opened an' },
        landing_page_accessed: { color: 'outline', text: 'accessed the' }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md text-left">
                <h4 className="font-semibold text-left">Error Loading Activity Feed</h4>
                <p className="text-left">{error}</p>
                 <Button onClick={loadLogs} variant="destructive" className="mt-4">Try Again</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left">
            <CardHeader className="px-0 text-left text-foreground">
                <div className="flex items-center gap-2">
                    <Activity className="h-6 w-6 text-primary" />
                    <CardTitle className="text-left">Platform Activity Feed</CardTitle>
                </div>
                <CardDescription className="text-left text-muted-foreground text-left">A real-time overview of all significant actions and forensic engagement pings.</CardDescription>
            </CardHeader>
             {logs.length > 0 ? (
                <div className="space-y-6 text-left">
                    {logs.map(log => {
                        const subject = getSubjectInfo(log);
                        const actionInfo = actionConfig[log.action] || { color: 'outline', text: log.action };
                        const SubjectIcon = subject.icon;

                        return (
                            <Card key={log.id} className="p-4 bg-white shadow-sm border-none">
                                <div className="flex items-start gap-4 text-left">
                                    <div className={cn("bg-muted p-2 rounded-full mt-1", subject.color)}>
                                        <SubjectIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 space-y-3 text-left">
                                        <div className="flex justify-between items-start text-left">
                                            <div className="text-left">
                                                <p className="text-sm text-left">
                                                    <span className="font-black text-foreground">{log.companyName || log.userName || 'System'}</span>
                                                    {' '}{actionInfo.text}{' '}
                                                    <span className="font-bold text-primary">{subject.name}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground text-left">{formatDateSafe(log.timestamp, "dd MMM yyyy, HH:mm")}</p>
                                            </div>
                                            <Badge variant={actionInfo.color} className="capitalize text-[10px] font-black">{log.action?.replace(/_/g, ' ')}</Badge>
                                        </div>
                                         {log.details && (
                                             <p className="text-xs italic text-muted-foreground bg-slate-50 p-2 rounded border border-dashed text-left">"{log.details}"</p>
                                         )}
                                         <div className="flex items-center gap-2 text-left">
                                            <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest px-0 hover:bg-transparent">
                                                <Link href={`/backend?view=wallet&memberId=${log.companyId}`}>
                                                    Manage Record <ArrowRight className="ml-1 h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-lg opacity-30 text-foreground">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">Registry Standby</h3>
                    <p className="mt-2 text-muted-foreground">Recent platform activities and pings will appear here.</p>
                </div>
            )}
        </div>
    );
}
