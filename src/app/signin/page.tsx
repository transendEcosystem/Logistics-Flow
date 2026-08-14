
'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  signInWithEmailAndPassword,
  getIdToken,
  sendPasswordResetEmail,
} from 'firebase/auth';

import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type SignInFormValues = z.infer<typeof formSchema>;

function SignInFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authActionInitiated, setAuthActionInitiated] = useState(false);
  const auth = useAuth();
  const { user, isUserLoading, forceRefresh } = useUser();
  const redirectParam = searchParams.get('redirect');

  // This effect handles the final redirect after the user profile is confirmed to be loaded.
  useEffect(() => {
    // Only redirect if we've started the process and the user object is fully loaded (including claims and firestore data).
    if (authActionInitiated && !isUserLoading && user?.uid && user?.companyId) {
        setIsLoading(false);
        setAuthActionInitiated(false);
        const isAdmin = user.claims?.admin === true || user.email === 'mkoton100@gmail.com' || user.email === 'beyondtransport@gmail.com';
        const defaultRedirect = isAdmin ? '/adminaccount' : '/account';
        router.push(redirectParam || defaultRedirect);
    }
  }, [authActionInitiated, isUserLoading, user, router, redirectParam, toast]);


  const form = useForm<SignInFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
    },
  });

  const handlePasswordReset = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter your email address to reset your password.',
      });
      return;
    }
    
    if (!auth) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Could not connect to authentication service. Please try again later.',
        });
        return;
    }
    
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${email}, a password reset link has been sent.`,
      });
    } catch (error: any) {
      console.error("Password reset failed:", error);
       toast({
        variant: 'destructive',
        title: 'Error sending reset email',
        description: error.message || "An unspecified error occurred. Please check the browser console for details.",
      });
    } finally {
        setIsLoading(false);
    }
  };


  const onSubmit = async (values: SignInFormValues) => {
    setIsLoading(true);
    if (!auth) {
        toast({
            variant: 'destructive',
            title: 'Initialization Error',
            description: 'Services are not ready. Please try again in a moment.',
        });
        setIsLoading(false);
        return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const loggedInUser = userCredential.user;
      
      const idToken = await getIdToken(loggedInUser, true); // Force refresh to get latest claims
      
      // Update session cookie on the server.
      await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
      });
      
      // FIX: Wait for the user document to be created/verified before proceeding.
      const checkAndCreateResponse = await fetch('/api/checkAndCreateUser', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!checkAndCreateResponse.ok) {
        const errorResult = await checkAndCreateResponse.json();
        // This is not a critical failure for sign-in, as the user might exist.
        // Log it and show a non-blocking toast.
        console.error("Background profile check/creation failed:", errorResult.error);
        toast({
            variant: "destructive",
            title: "Profile Check Failed",
            description: "There was a problem verifying your profile. Some features may not work correctly."
        })
      }
      
      // Trigger the client-side data refresh process
      setAuthActionInitiated(true);
      forceRefresh();

      toast({
        title: 'Sign In Successful',
        description: 'Loading your profile...',
      });

    } catch (error: any) {
      let title = 'An error occurred.';
      let description = 'Please check your credentials and try again.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        title = 'Invalid Credentials';
        description = 'The email or password you entered is incorrect.';
      } else {
        description = error.message;
      }

      toast({
        variant: 'destructive',
        title,
        description,
      });
       setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold font-headline">
          Member Sign In
        </CardTitle>
        <CardDescription>
          Access your Logistics Flow account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <button type="button" onClick={handlePasswordReset} className="text-sm font-medium text-primary hover:underline" disabled={isLoading}>
                          Forgot password?
                      </button>
                  </div>
                  <FormControl>
                     <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            className="pr-10"
                            autoComplete="current-password"
                            {...field}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/join" className="underline">
            Join Now
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
    return (
        <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
            <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin text-primary" />}>
                <SignInFormComponent />
            </Suspense>
        </div>
    )
}
