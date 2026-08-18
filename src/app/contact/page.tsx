
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
});

type ContactFormValues = z.infer<typeof formSchema>;

export default function ContactPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsLoading(true);
    // Simulate an API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(values);

    toast({
      title: 'Message Sent!',
      description: "Thanks for reaching out. We'll get back to you shortly.",
    });
    form.reset();
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline">Contact Us</h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
          Have a question or need support? We're here to help.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <div className="space-y-8">
            <Card>
                <CardContent className="p-6 flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold">Email Us</h3>
                        <p className="text-muted-foreground">For general inquiries and support.</p>
                        <a href="mailto:support@transconnect.com" className="text-primary font-medium mt-2 block">support@transconnect.com</a>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold">Call Us</h3>
                        <p className="text-muted-foreground">Speak with a member of our team.</p>
                        <p className="font-medium mt-2">+27 (11) 123 4567</p>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardContent className="p-6 flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold">Our Office</h3>
                        <p className="text-muted-foreground">123 Transport Lane, Sandton</p>
                        <p className="font-medium mt-2">Johannesburg, 2196, South Africa</p>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div>
          <Card className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-4">Send us a message</h2>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                        <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Membership Question" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Your message here..." {...field} rows={5} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Message
                </Button>
                </form>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
}
