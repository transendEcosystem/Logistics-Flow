'use client';

import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useUser, getClientSideAuthToken, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';


export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, totalPrice, isCartLoading } = useCart();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);
  const companyId = userData?.companyId;

  const companyDocRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return doc(firestore, 'companies', companyId);
  }, [firestore, companyId]);
  const { data: companyData, isLoading: isCompanyLoading } = useDoc(companyDocRef);

  const isLoading = isUserLoading || isUserDocLoading || isCompanyLoading;
  const availableBalance = companyData?.availableBalance ?? 0;
  const hasSufficientFunds = availableBalance >= totalPrice;

  const handleProcessPurchase = async () => {
    if (!user || !companyId || cartItems.length === 0) {
        toast({ variant: 'destructive', title: 'Cannot proceed', description: 'User not logged in or cart is empty.' });
        return;
    }
    
    setIsProcessing(true);
    try {
        const token = await getClientSideAuthToken();
        if (!token) throw new Error("Authentication failed.");

        const payload = {
            buyerCompanyId: companyId,
            sellerCompanyId: cartItems[0].sellerCompanyId,
            items: cartItems,
            totalAmount: totalPrice,
        };

        const response = await fetch('/api/processPurchase', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to process purchase.');
        }

        toast({ title: 'Purchase Successful!', description: 'Your order has been placed.' });
        clearCart();
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Purchase Failed', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  }

  if (isCartLoading) {
      return (
        <div className="container mx-auto px-4 py-16 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading your cart...</p>
        </div>
      );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <ShoppingCart className="h-8 w-8" />
        Your Shopping Cart
      </h1>
      {cartItems.length === 0 ? (
        <Card className="text-center py-20">
          <CardContent>
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-4">
              <Link href="/mall/supplier">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-2 space-y-4">
            {cartItems.map(item => (
              <Card key={item.id} className="flex items-center p-4">
                <div className="relative h-20 w-20 bg-muted rounded-md overflow-hidden mr-4">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><ShoppingCart className="h-8 w-8 text-gray-400"/></div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">From: {item.shopName}</p>
                  <p className="text-lg font-bold text-primary mt-1">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateQuantity(item.id, parseInt(e.target.value, 10))}
                    className="w-20"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-4">
                  <span>Total</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin"/>
                ) : user ? (
                    <>
                         <div className="w-full text-sm flex justify-between p-3 bg-muted rounded-md">
                            <span>Available to Spend:</span>
                            <span className="font-bold">{formatCurrency(availableBalance)}</span>
                        </div>
                        {!hasSufficientFunds && (
                            <Alert variant="destructive" className="w-full">
                                <AlertTitle>Insufficient Funds</AlertTitle>
                                <AlertDescription>
                                    Your available balance is too low. Please <Link href="/account?view=wallet" className="underline">top-up your wallet</Link>.
                                </AlertDescription>
                            </Alert>
                        )}
                        <Button className="w-full" onClick={handleProcessPurchase} disabled={isProcessing || !hasSufficientFunds}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wallet className="mr-2 h-4 w-4"/>}
                            {hasSufficientFunds ? 'Pay with Wallet' : 'Insufficient Funds'}
                        </Button>
                        <div className="relative w-full my-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                Or pay with
                                </span>
                            </div>
                        </div>

                        <Button className="w-full" variant="outline" disabled>
                            Facility with Simplyfi Flow
                        </Button>
                        <Button className="w-full" variant="outline" disabled>
                            EFT
                        </Button>
                        <Button className="w-full" variant="outline" disabled>
                            Direct Debit
                        </Button>
                    </>
                ) : (
                    <Button asChild className="w-full">
                        <Link href={`/signin?redirect=/cart`}>Sign In to Check Out</Link>
                    </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
