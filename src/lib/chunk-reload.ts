'use client';

/**
 * Recovery for stale lazy-loaded chunks.
 *
 * Every deploy produces new content-hashed filenames under /_next/static/chunks.
 * A browser tab left open across a deploy still holds the previous page shell, so
 * the first `dynamic()` import after that deploy requests a file that no longer
 * exists and fails with a ChunkLoadError. The UI shows an error panel even though
 * nothing is actually broken, and the user has no way to know a refresh fixes it.
 *
 * Reloading pulls the current shell and resolves it. The reload is capped so a
 * genuine failure (a chunk that is missing for some other reason) surfaces the
 * error instead of trapping the tab in a refresh loop.
 */

const RELOAD_FLAG = 'lf:chunk-reload-at';
const RELOAD_WINDOW_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
    if (!error) return false;
    const name = (error as any)?.name || '';
    const message = (error as any)?.message || String(error);
    return (
        name === 'ChunkLoadError' ||
        /Loading chunk [^\s]+ failed/i.test(message) ||
        /Loading CSS chunk/i.test(message) ||
        /Failed to fetch dynamically imported module/i.test(message) ||
        /error loading dynamically imported module/i.test(message) ||
        /Importing a module script failed/i.test(message)
    );
}

/**
 * Reloads once to pick up the current build. Returns true when a reload was
 * started, so callers can keep showing a loading state instead of an error.
 */
export function reloadForStaleChunk(): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const last = Number(window.sessionStorage.getItem(RELOAD_FLAG) || 0);
        // A second failure soon after reloading means the refresh did not help,
        // so stop and let the error be shown.
        if (last && Date.now() - last < RELOAD_WINDOW_MS) return false;
        window.sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    } catch {
        // Private mode can block sessionStorage; without a loop guard it is safer
        // to show the error than to risk reloading repeatedly.
        return false;
    }

    window.location.reload();
    return true;
}

export function handlePossibleStaleChunk(error: unknown): boolean {
    return isChunkLoadError(error) ? reloadForStaleChunk() : false;
}

/**
 * Catches chunk failures that never reach a React error boundary, such as a
 * rejected dynamic import inside an event handler.
 */
export function installChunkErrorRecovery(): () => void {
    if (typeof window === 'undefined') return () => {};

    const onRejection = (event: PromiseRejectionEvent) => {
        if (handlePossibleStaleChunk(event.reason)) event.preventDefault();
    };
    const onError = (event: ErrorEvent) => {
        if (handlePossibleStaleChunk(event.error || event.message)) event.preventDefault();
    };

    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);

    return () => {
        window.removeEventListener('unhandledrejection', onRejection);
        window.removeEventListener('error', onError);
    };
}
