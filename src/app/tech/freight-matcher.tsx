"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { handleMatchFreight } from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Route, Package, Weight, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { provinces } from "@/lib/geodata";

const vehicleTypes = [
    "Tautliner",
    "Flatbed",
    "Reefer",
    "Lowbed",
    "Tri-axle",
    "Superlink",
    "Pantech",
    "Van",
    "8-ton truck",
    "4-ton truck",
    "Horse & Trailer"
];

const locations = provinces.flatMap(p => p.cities.map(c => `${c}, ${p.name}`));

const MatchFreightInputSchema = z.object({
  location: z.string().min(1, "Please select an origin."),
  destination: z.string().min(1, "Please select a destination."),
  vehicleType: z.string().min(1, "Please select a vehicle type."),
  capacity: z.string().min(1, "Please enter vehicle capacity."),
  preferences: z.string().optional(),
  rate: z.coerce.number().positive().optional(),
  isPartLoad: z.boolean().optional(),
  palletCount: z.coerce.number().int().positive().optional(),
});
type MatchFreightInput = z.infer<typeof MatchFreightInputSchema>;

const MatchFreightOutputSchema = z.object({
  matches: z.array(
    z.object({
      loadId: z.string(),
      origin: z.string(),
      destination: z.string(),
      weight: z.string(),
      size: z.string(),
      price: z.string(),
      requirements: z.string().optional(),
    })
  ),
});
type MatchFreightOutput = z.infer<typeof MatchFreightOutputSchema>;

export default function FreightMatcher() {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<MatchFreightOutput | null>(null);
    const { toast } = useToast();

    const form = useForm<MatchFreightInput>({
        resolver: zodResolver(MatchFreightInputSchema),
        defaultValues: {
            location: "",
            destination: "",
            vehicleType: "",
            capacity: "",
            preferences: "",
            rate: undefined,
            isPartLoad: false,
            palletCount: undefined,
        },
    });

    const isPartLoad = form.watch("isPartLoad");

    async function onSubmit(values: MatchFreightInput) {
        setIsLoading(true);
        setResults(null);

        const response = await handleMatchFreight(values);

        if (response.success && response.data) {
            setResults(response.data);
        } else {
            toast({
                variant: "destructive",
                title: "An error occurred",
                description: response.error,
            });
        }
        setIsLoading(false);
    }

    return (
        <div className="space-y-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Location (Origin)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a location..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="destination"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Desired Destination</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a destination..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="vehicleType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Vehicle Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a vehicle type..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {vehicleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="capacity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Vehicle Capacity</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 34 tons" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="rate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Desired Rate (R/km, optional)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 22.50" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="preferences"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Other Preferences (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., No-touch freight, specific goods" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                         <FormField
                            control={form.control}
                            name="isPartLoad"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Looking for a part load?
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        {isPartLoad && (
                             <FormField
                                control={form.control}
                                name="palletCount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Available Pallet Space</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 10" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                    
                    <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Find Matches
                    </Button>
                </form>
            </Form>

            {isLoading && (
                <div className="mt-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Searching for the best matches...</p>
                </div>
            )}
            
            {results && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold font-headline mb-4">
                        Matching Loads ({results.matches.length})
                    </h3>
                    {results.matches.length > 0 ? (
                        <div className="space-y-4">
                            {results.matches.map((match) => (
                                <Card key={match.loadId} className="bg-muted/50">
                                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                        <div className="md:col-span-2 space-y-3">
                                            <div className="flex items-center gap-4 text-base font-semibold">
                                                <span>{match.origin}</span>
                                                <ArrowRight className="h-5 w-5 text-primary" />
                                                <span>{match.destination}</span>
                                            </div>
                                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5"><Weight className="h-4 w-4"/> {match.weight}</span>
                                                <span className="flex items-center gap-1.5"><Package className="h-4 w-4"/> {match.size}</span>
                                            </div>
                                            {match.requirements && <p className="text-xs"><strong className="font-medium">Requirements:</strong> {match.requirements}</p>}
                                        </div>
                                        <div className="md:text-right">
                                            <p className="text-xl font-bold text-primary">{match.price}</p>
                                            <Button className="mt-2 w-full md:w-auto" size="sm">View Details</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No matching loads found. Try adjusting your criteria.</p>
                    )}
                </div>
            )}
        </div>
    );
}
