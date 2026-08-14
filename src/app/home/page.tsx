import { redirect } from 'next/navigation';

/**
 * Robust redirect to the root path.
 * Prevents 404 errors if users navigate to legacy or common /home variations.
 */
export default function HomeRedirect() {
    redirect('/');
}
