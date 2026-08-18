
'use client';

import { useState, Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  getIdToken,
  sendPasswordResetEmail,
} from 'firebase/auth';

import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Loader2, Eye, EyeOff, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { roles } from '@/lib/roles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type JoinFormValues = z.infer<typeof formSchema>;

function JoinFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authActionInitiated, setAuthActionInitiated] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading, forceRefresh } = useUser();
  
  const redirectParam = searchParams.get('redirect');
  const initialRole = searchParams.get('role');
  const isRestricted = searchParams.get('restricted') === 'true';

  const [selectedPosition, setSelectedPosition] = useState<string | null>(initialRole);
  
  const referrerId = searchParams.get('ref');
  const emailParam = searchParams.get('email');
  const firstNameParam = searchParams.get('firstName');
  const lastNameParam = searchParams.get('lastName');
  const phoneParam = searchParams.get('phone');

  // Filter roles based on restricted status (Funding origins)
  const displayedRoles = useMemo(() => {
    if (isRestricted) {
        // High-intent filter for In-house funding: Suppliers (Vendors) and Transporters only
        return roles.filter(r => r.id === 'vendor' || r.id === 'transporter');
    }
    return roles;
  }, [isRestricted]);

  useEffect(() => {
    if (authActionInitiated && !isUserLoading && user?.uid) {
        setIsLoading(false);
        setAuthActionInitiated(false);
        toast({
            title: 'Account Ready!',
            description: "Redirecting to your dashboard...",
        });
        const isAdmin = user.claims?.admin === true || user.role === 'superadmin' || user.role === 'admin' || user.declaredPosition === 'admin' || user.email === 'mkoton100@gmail.com' || user.email === 'beyondtransport@gmail.com' || user.email === 'michael@logisticsflow.co.za' || selectedPosition === 'admin';
        const defaultRedirect = isAdmin ? '/adminaccount' : '/account';
        router.push(redirectParam || defaultRedirect);
    }
  }, [authActionInitiated, isUserLoading, user, router, redirectParam, selectedPosition, toast]);

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: firstNameParam || '',
      lastName: lastNameParam || '',
      email: emailParam || '',
      phone: phoneParam || '',
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
    if (!auth) return;
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${email}, a password reset link has been sent.`,
      });
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Error sending reset email' });
    } finally {
        setIsLoading(false);
    }
  };

  const onSubmit = async (values: JoinFormValues) => {
    if (!selectedPosition) {
        toast({ variant: 'destructive', title: 'Position Required', description: 'Please declare your position first.' });
        return;
    }
    setIsLoading(true);
    if (!auth) {
      toast({ variant: 'destructive', title: 'Initialization Error' });
      setIsLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;
      await updateProfile(newUser, { displayName: `${values.firstName} ${values.lastName}` });
      const token = await getIdToken(newUser, true);
      
      // Initialize client-side Firestore profile immediately
      if (firestore) {
        try {
          const compId = `comp_${newUser.uid.substring(0, 12)}`;
          const adminEmails = ['mkoton100@gmail.com', 'beyondtransport@gmail.com', 'michael@logisticsflow.co.za'];
          const isAdminUser = adminEmails.includes(values.email.toLowerCase()) || selectedPosition === 'admin';
          
          await setDoc(doc(firestore, 'users', newUser.uid), {
            id: newUser.uid,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            companyId: compId,
            role: isAdminUser ? 'superadmin' : 'owner',
            declaredPosition: selectedPosition || (isAdminUser ? 'admin' : 'owner'),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          await setDoc(doc(firestore, 'companies', compId), {
            id: compId,
            ownerId: newUser.uid,
            companyName: `${values.firstName}'s Enterprise`,
            membershipId: 'free',
            isBillable: true,
            walletBalance: 0,
            pendingBalance: 0,
            availableBalance: 0,
            loyaltyTier: 'bronze',
            status: 'active',
            shopType: selectedPosition === 'transporter' ? 'transporter' : 'vendor',
            declaredRole: selectedPosition,
            referrerId: referrerId || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (clientWriteErr) {
          console.warn("Client initial doc creation notice:", clientWriteErr);
        }
      }

      // Background registration handshake (non-blocking)
      fetch('/api/checkAndCreateUser', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ referrerId, role: selectedPosition }),
      }).catch(e => console.warn("Background API call:", e));
      
      fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }).catch(e => console.warn("Session notice:", e));

      setAuthActionInitiated(true);
      forceRefresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Join Failed', description: error.message });
      setIsLoading(false);
    }
  };

  if (!selectedPosition) {
      return (
          <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16 text-left">
          <Card className="w-full max-w-2xl text-left border-none shadow-2xl overflow-hidden">
            <CardHeader className="text-center bg-slate-900 text-white p-10 text-left">
                <div className="flex justify-between items-center mb-4">
                    <CardTitle className="text-3xl font-black font-headline text-left">Secure Your Digital Node</CardTitle>
                    {isRestricted && (
                        <Badge className="bg-primary text-white border-none uppercase font-black text-[10px] tracking-widest px-3 h-6">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Funding Path Active
                        </Badge>
                    )}
                </div>
                <CardDescription className="text-slate-400 text-left">
                    {isRestricted 
                        ? "Select your business type to access specialized in-house industrial funding." 
                        : "Select your primary function to optimize your ecosystem experience."}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
                <ScrollArea className="h-[50vh] pr-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        {displayedRoles.map((role) => {
                            const Icon = role.icon;
                            const isSupplier = role.id === 'vendor';
                            return (
                                <Button 
                                    key={role.id}
                                    variant="outline" 
                                    className={cn(
                                        "h-auto min-h-[120px] justify-start px-6 gap-4 border-2 transition-all text-left whitespace-normal",
                                        isSupplier ? "border-primary/40 bg-primary/5 hover:border-primary" : "hover:border-primary"
                                    )} 
                                    onClick={() => setSelectedPosition(role.id)}
                                >
                                    <div className="bg-primary/10 p-3 rounded-xl shrink-0"><Icon className="text-primary h-6 w-6"/></div>
                                    <div className="text-left py-2 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-sm uppercase tracking-tighter">{role.title}</p>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-tight mt-1 font-medium">{role.description}</p>
                                    </div>
                                </Button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-6 flex justify-center">
                <p className="text-xs text-muted-foreground italic text-center">Choosing a role allows the AI to curate the most profitable matches for your dashboard.</p>
            </CardFooter>
          </Card>
          </div>
      )
  }

  const selectedRoleData = roles.find(r => r.id === selectedPosition);

  return (
    <Card className="w-full max-w-lg shadow-2xl border-none text-left">
      <CardHeader className="text-center p-8 border-b">
        <CardTitle className="text-3xl font-black font-headline text-left">Create Account</CardTitle>
        <CardDescription className="flex items-center justify-start gap-2 mt-3">
            Registering as <Badge variant="secondary" className="capitalize font-black px-3">{selectedRoleData?.title || selectedPosition}</Badge> 
            <Button variant="link" size="sm" className="px-1 h-auto text-[10px] font-bold uppercase text-primary" onClick={() => setSelectedPosition(null)}>Change Role</Button>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">First Name</FormLabel><FormControl><Input placeholder="John" {...field} className="h-11" autoComplete="given-name" /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} className="h-11" autoComplete="family-name" /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Business Email</FormLabel><FormControl><div className="relative"><Input {...field} disabled={!!emailParam} className="h-11" autoComplete="email" />{!!emailParam && <Lock className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />}</div></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mobile Number</FormLabel><FormControl><Input {...field} className="h-11" placeholder="+27..." autoComplete="tel" /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><div className="flex items-center justify-between"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Secure Password</FormLabel><button type="button" onClick={handlePasswordReset} className="text-[10px] font-bold text-primary uppercase underline">Forgot?</button></div>
                <FormControl><div className="relative"><Input type={showPassword ? "text" : "password"} {...field} className="h-11" autoComplete="new-password" /><Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent" onClick={() => setShowPassword((prev) => !prev)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full h-14 text-lg font-black uppercase tracking-tight mt-6 shadow-xl" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Activate Membership
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center border-t py-6 bg-slate-50 rounded-b-xl">
        <p className="text-xs text-muted-foreground font-medium text-center">
            Member already? <Link href="/signin" className="text-primary font-bold hover:underline ml-1 uppercase">Sign In</Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function JoinPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
      <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin text-primary" />}>
        <JoinFormComponent />
      </Suspense>
    </div>
  );
}
