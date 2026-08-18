'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, Sparkles, Video, Download, PlayCircle, Save, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface VideoGeneratorCardProps {
    title?: string;
    description?: string;
    icon?: any;
    presetPrompt?: string;
}

export default function VideoGeneratorCard({ 
    title = "AI Video Studio", 
    description = "Create high-impact industrial overviews using Gemini Veo.",
    icon: Icon = Video,
    presetPrompt = ""
}: VideoGeneratorCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState(presetPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && presetPrompt && !prompt) {
        setPrompt(presetPrompt);
    }
  }, [isOpen, presetPrompt, prompt]);

  const handleGenerate = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt) {
      toast({
        variant: 'destructive',
        title: 'Prompt is required',
        description: 'Please describe the video you want to create.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedVideo(null);

    try {
      const response = await fetch('/api/generateVideo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: finalPrompt })
      });

      const result = await response.json();

      if (!response.ok || !result || result.success === false) {
          throw new Error(result?.error || 'Video generation timed out or failed.');
      }

      if (!result.videoDataUri) {
          throw new Error('AI returned an empty response.');
      }

      setGeneratedVideo(result.videoDataUri);
      toast({
        title: 'Video Generated!',
        description: 'Your new asset is ready for your pitch sequences.',
      });
    } catch (e: any) {
      let description: React.ReactNode = e.message;
      if (e.message?.includes('403 Forbidden') || e.message?.includes('API is not enabled')) {
          description = (
              <>
                  The AI API is not enabled for your project.
                  <Button asChild variant="link" className="p-0 h-auto ml-1 text-xs">
                      <Link href="/docs/enable-gemini-api.md" target="_blank">View Guide</Link>
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
    if (!generatedVideo) return;
    const link = document.createElement('a');
    link.href = generatedVideo;
    link.download = `lf-asset-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className={cn("text-left", presetPrompt ? "border-primary/20 bg-primary/5" : "")}>
      <CardHeader className="text-left">
        <CardTitle className="flex items-center gap-2 text-left">
          <Icon className={cn(presetPrompt ? "text-primary h-6 w-6" : "h-5 w-5")} /> {title}
        </CardTitle>
        <CardDescription className="text-left">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-left">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant={presetPrompt ? "default" : "outline"}>
                {presetPrompt ? "Configure & Generate" : "Open Video Studio"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[725px] flex flex-col max-h-[90vh] text-left text-foreground">
            <DialogHeader>
              <DialogTitle className="text-left">AI Video Studio: {title}</DialogTitle>
              <DialogDescription className="text-left">
                Review the command and generate your industrial asset. For best results, keep the cinematic keywords intact.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2 text-left">
                <div className="space-y-2 text-left">
                  <Label htmlFor="generate-prompt" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">AI Forensic Command</Label>
                  <Textarea 
                    id="generate-prompt" 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    placeholder="Describe your industrial sequence..." 
                    className="min-h-[150px] font-mono text-xs leading-relaxed bg-slate-50"
                  />
                </div>
                
                <div className="relative aspect-video w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center bg-muted overflow-hidden shadow-inner">
                     {isLoading ? (
                        <div className="text-center space-y-2">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Rendering 4K Sequence...</p>
                        </div>
                    ) : generatedVideo ? (
                        <video src={generatedVideo} controls autoPlay className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center opacity-30 space-y-2">
                            <PlayCircle className="h-16 w-16 mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">Asset Preview</p>
                        </div>
                    )}
                </div>

                {generatedVideo && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-left">
                        <h4 className="text-xs font-black uppercase text-primary mb-2 flex items-center gap-2">
                            <Save className="h-3.5 w-3.5" />
                            Recommended Storage
                        </h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed text-left">
                            Since this is a high-fidelity intelligence asset, we recommend downloading it and uploading it to your <strong>Google Cloud Storage</strong> bucket. This provides a direct, unbranded link you can use in your forensic email sequences.
                        </p>
                    </div>
                )}
            </div>
            <DialogFooter className="mt-auto pt-4 border-t justify-between">
              <div className="flex gap-2">
                {generatedVideo && (
                    <Button variant="secondary" onClick={handleDownload} disabled={isLoading}>
                    <Download className="mr-2 h-4 w-4" /> Download MP4
                    </Button>
                )}
                {presetPrompt && (
                    <Button variant="ghost" onClick={() => setPrompt(presetPrompt)} disabled={isLoading}>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Reset Prompt
                    </Button>
                )}
              </div>
              <Button onClick={() => handleGenerate()} disabled={isLoading} className={!generatedVideo ? 'w-full' : 'ml-auto'}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {generatedVideo ? 'Re-generate Asset' : 'Trigger AI Generation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
