'use client';

import { useUser } from '@/firebase';
import { PremiumFeaturePrompt } from '@/components/PremiumFeaturePrompt';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles, ImageIcon, Wand2, Video, Film, Palette } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

import ImageGeneratorCard from "@/app/backend/image-generator-card";
import ImageEditorCard from "@/app/backend/image-editor-card";
import VideoGeneratorCard from "@/app/backend/video-generator-card";
import IconGeneratorCard from "@/app/backend/icon-generator-card";

export default function MarketingStudio() {
    const { user, isUserLoading } = useUser();
    const isAdmin = user?.claims?.admin === true || user?.email === 'mkoton100@gmail.com' || user?.email === 'beyondtransport@gmail.com';
    const hasPremiumPlan = user?.companyData?.membershipId && user.companyData.membershipId !== 'free';
    const isAssociate = user?.declaredPosition === 'associate' || user?.role === 'associate';

    if (isUserLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Initializing Studio...</p>
                </div>
            </div>
        );
    }

    // Associates get access regardless of paid plan to empower recruitment
    if (!isAdmin && !hasPremiumPlan && !isAssociate) {
        return (
            <PremiumFeaturePrompt 
                icon={Sparkles} 
                title="AI Marketing Studio" 
                description="This suite of powerful AI tools helps you create professional marketing assets in minutes." 
            />
        );
    }
  
  return (
    <div className="space-y-8 text-left">
      <CardHeader className="px-0">
          <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-xl">
                  <Palette className="h-8 w-8 text-primary"/>
              </div>
              <div className="text-left">
                  <CardTitle className="text-2xl font-black font-headline">AI Marketing Studio</CardTitle>
                  <CardDescription className="text-left">
                      Create professional-grade 4K narrative assets for your network outreach.
                  </CardDescription>
              </div>
          </div>
      </CardHeader>
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            <ImageGeneratorCard />
            <IconGeneratorCard />
            <ImageEditorCard />
            <VideoGeneratorCard />
            
            <Card className="border-dashed border-2 bg-muted/20 opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-left">
                  <Film className="h-5 w-5" /> Narrative Sequencer
                </CardTitle>
                <CardDescription className="text-left">
                  Stitch generated scenes into a 60-second industrial narrative.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Button className="w-full" variant="outline" disabled>Developing Preview...</Button>
              </CardContent>
            </Card>
        </div>
    </div>
  );
}
