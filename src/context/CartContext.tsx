'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
  sellerCompanyId: string;
  imageUrl?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  isCartLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [isCartLoading, setIsCartLoading] = useState(true);

  // Load cart from local storage on initial render
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('logistics_flow_cart');
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    } catch (error) {
        console.error("Failed to parse cart from localStorage", error);
        localStorage.removeItem('logistics_flow_cart');
    }
    setIsCartLoading(false);
  }, []);

  const saveCartToLocalStorage = useCallback((items: CartItem[]) => {
      try {
        localStorage.setItem('logistics_flow_cart', JSON.stringify(items));
      } catch (error) {
        console.error("Failed to save cart to localStorage", error);
      }
  }, []);
  
  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem('logistics_flow_cart');
  }, []);

  // Effect to clear cart on sign-out
  useEffect(() => {
    if (!isCartLoading && !isUserLoading && !user) {
        clearCart();
    }
  }, [user, isUserLoading, isCartLoading, clearCart]);
  
  const addToCart = (newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setCartItems(prevItems => {
        // If cart is not empty, check if new item is from the same shop
        if (prevItems.length > 0 && prevItems[0].shopId !== newItem.shopId) {
            toast({
                variant: 'destructive',
                title: 'Different Shop',
                description: 'You can only add items from one shop at a time. Please clear your cart first.',
            });
            return prevItems;
        }

        const existingItem = prevItems.find(item => item.id === newItem.id);
        let updatedItems;

        if (existingItem) {
            updatedItems = prevItems.map(item =>
                item.id === newItem.id ? { ...item, quantity: item.quantity + (newItem.quantity || 1) } : item
            );
        } else {
            updatedItems = [...prevItems, { ...newItem, quantity: newItem.quantity || 1 }];
        }
        
        saveCartToLocalStorage(updatedItems);
        return updatedItems;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => {
        const updatedItems = prevItems.filter(item => item.id !== itemId);
        saveCartToLocalStorage(updatedItems);
        return updatedItems;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setCartItems(prevItems => {
        if (quantity <= 0) {
            const updatedItems = prevItems.filter(item => item.id !== itemId);
            saveCartToLocalStorage(updatedItems);
            return updatedItems;
        }
        const updatedItems = prevItems.map(item => item.id === itemId ? { ...item, quantity } : item);
        saveCartToLocalStorage(updatedItems);
        return updatedItems;
    });
  };

  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice, isCartLoading }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
