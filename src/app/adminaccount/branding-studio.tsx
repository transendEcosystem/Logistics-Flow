'use client';

import React, { useState, useRef, useEffect } from 'react';
import ImageGeneratorCard from "@/app/backend/image-generator-card";
import ImageEditorCard from "@/app/backend/image-editor-card";
import VideoGeneratorCard from "@/app/backend/video-generator-card";
import IconGeneratorCard from "@/app/backend/icon-generator-card";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Ship, Film, Phone, MessageSquare, Play, Pause, RotateCcw, Link as LinkIcon, Info, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

/**
 * PRODUCTION SEQUENCER
 * Allows stitching the 3 generated scenes into a cohesive preview.
 */
function ProductionSequencer() {
    const [scene1, setScene1] = useState('');
    const [scene2, setScene2] = useState('');
    const [scene3, setScene3] = useState('');
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const scenes = [scene1, scene2, scene3].filter(s => !!s);

    const playNext = () => {
        if (currentSceneIndex < scenes.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
            setCurrentSceneIndex(0);
        }
    };

    useEffect(() => {
        if (isPlaying && videoRef.current) {
            videoRef.current.play().catch(() => setIsPlaying(false));
        }
    }, [currentSceneIndex, isPlaying]);

    return (
        <Card className="border-primary/20 bg-slate-900 text-white overflow-hidden shadow-2xl">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Film className="h-6 w-6 text-primary" />
                    <CardTitle className="text-xl font-headline">Final Production Sequencer</CardTitle>
                </div>
                <CardDescription className="text-slate-400">Sequence your generated scenes to preview the 60-second narrative.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Scene 1: Harbor URL</Label>
                        <Input value={scene1} onChange={e => setScene1(e.target.value)} placeholder="Paste URL..." className="bg-slate-800 border-slate-700 h-8 text-xs font-mono" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Scene 2: Registry URL</Label>
                        <Input value={scene2} onChange={e => setScene2(e.target.value)} placeholder="Paste URL..." className="bg-slate-800 border-slate-700 h-8 text-xs font-mono" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Scene 3: WhatsApp URL</Label>
                        <Input value={scene3} onChange={e => setScene3(e.target.value)} placeholder="Paste URL..." className="bg-slate-800 border-slate-700 h-8 text-xs font-mono" />
                    </div>
                </div>

                <div className="relative aspect-video w-full rounded-xl bg-black border border-white/10 flex items-center justify-center overflow-hidden group">
                    {scenes.length > 0 ? (
                        <>
                            <video 
                                ref={videoRef}
                                src={scenes[currentSceneIndex]} 
                                onEnded={playNext}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-4 left-4 z-20">
                                <Badge className="bg-primary/80 backdrop-blur-md border-none uppercase font-black text-[9px] tracking-widest">
                                    Playing: Scene {currentSceneIndex + 1}
                                </Badge>
                            </div>
                        </>
                    ) : (
                        <div className="text-center opacity-30 space-y-2">
                            <Film className="h-16 w-16 mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Paste scene URLs above to preview sequence</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-center gap-4">
                    <Button 
                        variant="secondary" 
                        size="lg" 
                        className="w-40 font-bold uppercase text-xs" 
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled={scenes.length === 0}
                    >
                        {isPlaying ? <><Pause className="mr-2 h-4 w-4"/> Pause</> : <><Play className="mr-2 h-4 w-4"/> Preview Flow</>}
                    </Button>
                    <Button variant="outline" size="lg" className="border-white/10 text-white" onClick={() => { setIsPlaying(false); setCurrentSceneIndex(0); }} disabled={scenes.length === 0}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="bg-black/20 p-6 border-t border-white/5">
                <div className="flex items-start gap-4">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest">Post-Production Note</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            This sequencer is for **playback validation only**. To create a single MP4 file with your TTS voiceover and music, download each scene and use an external editor like CapCut. Host the final 60s video in your Google Cloud bucket for a seamless member experience.
                        </p>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function BrandingStudio() {
    return (
        <div className="space-y-8 text-left">
            <CardHeader className="px-0">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl">
                        <Palette className="h-8 w-8 text-primary"/>
                    </div>
                    <div className="text-left">
                        <CardTitle className="text-2xl font-black font-headline">AI Content & Branding Studio</CardTitle>
                        <CardDescription>
                            Produce high-fidelity narrative assets for your forensic marketing sequences.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <div className="space-y-6 text-left">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <Film className="h-4 w-4" /> 
                    Narrative Production: Driver-to-Driver Story
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <VideoGeneratorCard 
                        title="Scene 1: Harbor Meeting"
                        description="A truck enters a depot near a harbor. Two drivers high-five and start a conversation."
                        icon={Ship}
                        presetPrompt="ACT AS A CINEMATIC FILM DIRECTOR. SCENE: A dusty, high-activity container depot near a major harbor (Durban/Cape Town). ACTION: A modern heavy-duty truck drives into the depot and stops. The driver gets out. Another driver in professional industrial gear walks up. They high-five and begin talking. AESTHETIC: Natural daylight, gritty but professional industrial look. 4K high detail."
                    />
                    <VideoGeneratorCard 
                        title="Scene 2: Forensic Registry"
                        description="A tight close-up of a futuristic glass phone displaying the secure industrial registry."
                        icon={Phone}
                        presetPrompt="SCENE: A tight close-up of a futuristic glass mobile device held by a driver. ACTION: A fingerprint scan pulses and confirms access. The screen instantly populates with a deep-scroll list of thousands of verified transport company names, direct emails, and mobile numbers. TEXT OVERLAY (Subtle, professional): 'ABSOLUTE TRANSPARENCY'. AESTHETIC: Tech-noir, sharp focus on the digital UI elements. Cyber-security theme."
                    />
                    <VideoGeneratorCard 
                        title="Scene 3: WhatsApp Outreach"
                        description="Showing the generation of a WhatsApp invite link on the driver's device."
                        icon={MessageSquare}
                        presetPrompt="SCENE: Close-up of the mobile device. ACTION: The driver taps a button. A WhatsApp invite link is instantly generated and sent to the second driver's phone. The phone beeps. The screen then shows a 'Product Catalogue' and 'Supplier Registry' search bar. AESTHETIC: Clean UI/UX design, high-velocity movement, modern tech feel."
                    />
                </div>

                {/* The Sequencer Tool */}
                <ProductionSequencer />
            </div>

            <Separator className="my-8" />

            <div className="space-y-4 text-left">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">General Creative Tools</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <ImageGeneratorCard />
                    <IconGeneratorCard />
                    <ImageEditorCard />
                </div>
            </div>
        </div>
    );
}
