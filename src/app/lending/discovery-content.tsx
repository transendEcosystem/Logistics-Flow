
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { FileSearch, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function DiscoveryContent() {

    // Placeholder data - in a real implementation, this would be fetched from the backend.
    const discoveryCases = [
        { id: '1', clientName: 'ABC Transporters', status: 'Documents Pending', lastUpdate: '2024-07-25' },
        { id: '2', clientName: 'Swift Logistics', status: 'In Review', lastUpdate: '2024-07-24' },
        { id: '3', clientName: 'SA Hauliers', status: 'Completed', lastUpdate: '2024-07-22' },
    ];

    const columns = useMemo(() => [
        { accessorKey: 'clientName', header: 'Client' },
        { accessorKey: 'status', header: 'Status' },
        { accessorKey: 'lastUpdate', header: 'Last Update' },
        { id: 'actions', header: 'Actions', cell: () => <Button variant="outline" size="sm">View Case</Button> },
    ], []);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <FileSearch className="h-6 w-6" />
                        Discovery & KYC
                    </CardTitle>
                    <CardDescription>Manage the KYC/FICA process, collect necessary documents, and build a complete client profile for funding applications.</CardDescription>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Start New Discovery
                </Button>
            </CardHeader>
            <CardContent>
                <DataTable columns={columns} data={discoveryCases} />
            </CardContent>
        </Card>
    );
}
