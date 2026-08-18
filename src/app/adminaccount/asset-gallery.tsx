
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GalleryVertical } from "lucide-react";

export default function AssetGallery() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <GalleryVertical className="h-6 w-6" />
                    Asset Gallery
                </CardTitle>
                <CardDescription>This section is under construction. A gallery of marketing assets will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">View and manage all generated images, videos, and other marketing assets.</p>
            </CardContent>
        </Card>
    );
}
