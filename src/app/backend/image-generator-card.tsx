
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

export default function ImageGeneratorCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState(
    "A clean, professional studio photograph of a [Your Product Name, e.g., chrome truck exhaust pipe] on a white background. The lighting should be bright and highlight the product's details."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        variant: 'destructive',
        title: 'Prompt is required',
        description: 'Please describe the image you want to create.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const result = await generateImage({ prompt });
      setGeneratedImage(result.imageDataUri);
      toast({
        title: 'Image Generated!',
        description: 'Your new image is ready.',
      });
    } catch (e: any) {
      let description: React.ReactNode = e.message;
      if (e.message?.includes('403 Forbidden') || e.message?.includes('API is not enabled')) {
          description = (
              <>
                  The AI API is not enabled for your project, or billing is not set up.
                  <Button asChild variant="link" className="p-0 h-auto ml-1 text-xs -translate-y-px">
                      <Link href="/docs/enable-gemini-api.md" target="_blank">View Setup Guide</Link>
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
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon /> AI Image Generator
        </CardTitle>
        <CardDescription>
          Create a new image from a text description using Imagen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Start Generating</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[725px] flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>AI Image Generator (Text-to-Image)</DialogTitle>
              <DialogDescription>
                Describe the image you want to create in detail.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-4 -mr-4">
                <div className="space-y-2">
                  <Label htmlFor="generate-prompt">Your Prompt</Label>
                  <Textarea
                    id="generate-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A red Scania truck driving on a mountain pass at sunset"
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
                         <Image src={generatedImage} alt="Generated" fill className="rounded-md object-contain" />
                    ) : (
                        <p className="text-sm text-muted-foreground">Your generated image will appear here.</p>
                    )}
                </div>
            </div>
            <DialogFooter className="mt-auto pt-4 border-t justify-between">
              {generatedImage && (
                <Button variant="secondary" onClick={handleDownload} disabled={isLoading}>
                  <Download className="mr-2 h-4 w-4" /> Download Image
                </Button>
              )}
              <Button onClick={handleGenerate} disabled={isLoading} className={!generatedImage ? 'w-full' : 'ml-auto'}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {generatedImage ? 'Generate Again' : 'Generate Image'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
