
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, ImageIcon, Download } from 'lucide-react';
import Image from 'next/image';
import { generateImage } from '@/ai/flows/image-generation-flow';
import Link from 'next/link';
import React from 'react';
import { Textarea } from '@/components/ui/textarea';

export default function IconGeneratorCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState(
    "A professional minimalist logo for 'logistics flow'. The design features the words 'logistics' and 'flow' in a clean, modern lowercase sans-serif typography. Include a stylized, dynamic blue ribbon or arrow element that connects the two words, symbolizing movement and efficiency. The logo should be in a high-quality vector style on a plain white background, matching the style of a modern tech-driven logistics brand."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        variant: 'destructive',
        title: 'Prompt is required',
        description: 'Please describe the logo you want to create.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const result = await generateImage({ prompt });
      setGeneratedImage(result.imageDataUri);
      toast({
        title: 'Logo Generated!',
        description: 'Your new logo is ready to be downloaded.',
      });
    } catch (e: any) {
      let description: React.ReactNode = e.message;
      if (e.message?.includes('403 Forbidden') || e.message?.includes('API is not enabled')) {
          description = (
              <>
                  The AI API is not enabled for your project, or billing is not set up.
                  <Button asChild variant="link" className="p-0 h-auto ml-1 text-xs -translate-y-px">
                      <Link href="/docs/enable-gemini-api.md" target="_blank">View AI Setup Guide</Link>
                  </Button>
              </>
          );
      }
      toast({ variant: 'destructive', title: 'Generation Failed', description });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `logo-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="text-left">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon /> AI Logo Generator
        </CardTitle>
        <CardDescription>
          Create a unique company logo using a descriptive prompt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Create Logo</Button>
          </DialogTrigger>
          <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-2xl text-left">
            <DialogHeader>
              <DialogTitle>AI Logo Generator</DialogTitle>
              <DialogDescription>
                Describe the logo you want to create. Be specific for best results.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="generate-prompt">Your Prompt</Label>
                  <Textarea
                    id="generate-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A minimalist logo for 'Logistics Flow' with a stylized blue arrow..."
                    rows={5}
                  />
                </div>
                <div className="relative aspect-square w-full rounded-md border border-dashed flex items-center justify-center bg-muted">
                     {isLoading ? (
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            <p className="mt-2 text-sm text-muted-foreground">Generating...</p>
                        </div>
                    ) : generatedImage ? (
                         <Image src={generatedImage} alt="Generated Logo" fill className="rounded-md object-contain" />
                    ) : (
                        <p className="text-sm text-muted-foreground">Your generated logo will appear here.</p>
                    )}
                </div>
            </div>
            <DialogFooter className="mt-auto pt-4 border-t justify-between">
              {generatedImage && (
                <Button variant="secondary" onClick={handleDownload} disabled={isLoading}>
                  <Download className="mr-2 h-4 w-4" /> Download Logo
                </Button>
              )}
              <Button onClick={handleGenerate} disabled={isLoading} className="ml-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Logo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
