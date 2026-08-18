
'use client';

import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';

/**
 * A specialized hook to fetch a specific configuration document from Firestore.
 * @param configId The ID of the document in the `/configuration` collection.
 * @returns The result object from the underlying useDoc hook.
 */
export function useConfig<T>(configId: string) {
    const firestore = useFirestore();

    const configRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'configuration', configId);
    }, [firestore, configId]);

    return useDoc<T>(configRef);
}
