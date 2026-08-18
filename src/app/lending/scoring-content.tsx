
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, PlusCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

export default function ScoringContent() {
    
    // Placeholder data
    const scoringReports = [
        { id: '1', clientName: 'ABC Transporters', score: 'B+', status: 'Approved', date: '2024-07-25' },
        { id: '2', clientName: 'Swift Logistics', score: 'C', status: 'Manual Review', date: '2024-07-24' },
        { id: '3', clientName: 'SA Hauliers', score: 'A-', status: 'Approved', date: '2024-07-22' },
    ];

    const columns = useMemo(() => [
        { accessorKey: 'clientName', header: 'Client' },
        { accessorKey: 'score', header: 'Credit Score', cell: ({row}: any) => <Badge variant="outline">{row.original.score}</Badge> },
        { accessorKey: 'status', header: 'Status', cell: ({row}: any) => <Badge>{row.original.status}</Badge> },
        { accessorKey: 'date', header: 'Date Assessed' },
        { id: 'actions', header: 'Actions', cell: () => <Button variant="outline" size="sm">View Report</Button> },
    ], []);


    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="h-6 w-6" />
                        Credit Scoring
                    </CardTitle>
                    <CardDescription>Analyze client data to generate risk scores and determine creditworthiness for funding applications.</CardDescription>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Scoring Report
                </Button>
            </CardHeader>
            <CardContent>
                 <DataTable columns={columns} data={scoringReports} />
            </CardContent>
        </Card>
    );
}
