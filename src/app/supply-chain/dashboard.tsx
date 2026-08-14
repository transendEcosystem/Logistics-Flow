'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, CheckCircle, RefreshCw, Users, FileText, AlertTriangle, Network } from "lucide-react";

const kpis = [
    {
        title: "On-Time Deliveries",
        value: "98.2%",
        description: "+1.5% from last month",
        icon: CheckCircle
    },
    {
        title: "Inventory Turnover",
        value: "12.5",
        description: "Annualized rate",
        icon: RefreshCw
    },
    {
        title: "Supplier Score",
        value: "95%",
        description: "Average across all suppliers",
        icon: Users
    },
    {
        title: "Open POs",
        value: "14",
        description: "Awaiting delivery",
        icon: FileText
    }
];

const alerts = [
    { id: 1, message: "Critical stock level for Part #SKU-123. Reorder needed.", severity: "high" },
    { id: 2, message: "Shipment #SH-987 from 'Global Parts Inc' delayed by 24 hours.", severity: "medium" },
    { id: 3, message: "Invoice #INV-0045 due for payment tomorrow.", severity: "low" },
];

const alertSeverityClasses = {
    high: 'text-destructive',
    medium: 'text-yellow-600',
    low: 'text-muted-foreground'
};

export default function DashboardContent() {
    return (
        <div className="space-y-8">
             <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6" />
                    Dashboard
                </CardTitle>
                <CardDescription>A high-level overview of your supply chain operations and key metrics.</CardDescription>
            </CardHeader>
            
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Network className="h-6 w-6 text-primary" />
                        What is the Supply Chain Portal?
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This portal is your integrated command center for managing your entire supply chain. It provides tools to oversee your suppliers, streamline procurement, manage inventory levels, and coordinate logistics—all from one place. The goal is to give you the visibility and control needed to reduce costs, improve efficiency, and build a more resilient supply chain.
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <Card key={kpi.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{kpi.value}</div>
                                <p className="text-xs text-muted-foreground">{kpi.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            
            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Critical Alerts</CardTitle>
                        <CardDescription>Items that require your immediate attention.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {alerts.length > 0 ? (
                             <ul className="space-y-4">
                                {alerts.map(alert => (
                                    <li key={alert.id} className="flex items-start gap-3">
                                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${alertSeverityClasses[alert.severity as keyof typeof alertSeverityClasses]}`} />
                                        <p className="text-sm">{alert.message}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No active alerts.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Order Volume (Last 30 Days)</CardTitle>
                        <CardDescription>Chart view is under construction.</CardDescription>
                    </CardHeader>
                     <CardContent className="flex items-center justify-center h-48 bg-muted/50 rounded-lg">
                       <p className="text-muted-foreground">Chart placeholder</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
