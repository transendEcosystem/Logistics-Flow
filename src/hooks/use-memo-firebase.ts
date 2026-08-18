
'use client';
import { useMemo } from 'react';

// A custom hook to memoize a value, typically a Firestore reference or query.
// It's just a rename of React.useMemo for semantic clarity in this project.
export const useMemoFirebase = (creator: () => any, deps: any[]) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(creator, deps);
};
