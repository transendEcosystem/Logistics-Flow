
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Wand2, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { imageEdit } from '@/ai/flows/image-edit-flow';

export default function ImageEditorCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setEditedImage(null); // Clear previous edit
    };
    reader.readAsDataURL(file);
  };
  
  const clearOriginalImage = () => {
    setOriginalImage(null);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  const handleEdit = async () => {
    if (!originalImage || !prompt) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please upload an image and provide an edit prompt.',
      });
      return;
    }

    setIsLoading(true);
    setEditedImage(null);

    try {
      const result = await imageEdit({
        photoDataUri: originalImage,
        prompt: prompt,
      });

      setEditedImage(result.enhancedImageDataUri);
      toast({
        title: 'Image Edited!',
        description: 'Your enhanced image is ready.',
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
      toast({ variant: 'destructive', title: 'Editing Failed', description });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 /> AI Image Editor
        </CardTitle>
        <CardDescription>
          Edit an existing image with a text prompt using Gemini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Start Editing</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[725px] flex flex-col max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>AI Image Editor (Image-to-Image)</DialogTitle>
              <DialogDescription>
                Upload an image and describe the changes you want to make.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 pr-4 -mr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="image-upload">1. Upload Original Image</Label>
                    <Input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  {originalImage && (
                      <div className="relative aspect-square w-full">
                          <Image src={originalImage} alt="Original" fill className="rounded-md object-contain" />
                          <Button variant="destructive" size="sm" onClick={clearOriginalImage} className="absolute top-2 right-2">Change</Button>
                      </div>
                  )}
                   <div className="space-y-2 text-left">
                      <Label htmlFor="prompt">2. Describe Your Edit</Label>
                      <Input id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., place this truck in a forest" />
                   </div>
                </div>
                <div className="space-y-4 text-left">
                  <Label>3. Edited Image</Label>
                  <div className="relative aspect-square w-full rounded-md border border-dashed flex items-center justify-center bg-muted">
                      {isLoading ? (
                          <div className="text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                              <p className="mt-2 text-sm text-muted-foreground">Editing...</p>
                          </div>
                      ) : editedImage ? (
                           <Image src={editedImage} alt="Edited" fill className="rounded-md object-contain" />
                      ) : (
                          <p className="text-sm text-muted-foreground">Your result will appear here.</p>
                      )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-auto pt-4 border-t justify-between">
               {editedImage && (
                <Button variant="secondary" onClick={handleDownload} disabled={isLoading}>
                  <Download className="mr-2 h-4 w-4" /> Download Image
                </Button>
              )}
              <Button onClick={handleEdit} disabled={isLoading} className={!editedImage ? 'w-full' : 'ml-auto'}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {editedImage ? 'Edit Again' : 'Generate Edit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
