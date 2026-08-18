import { redirect } from 'next/navigation';

/**
 * Robust redirect to the /pricing path.
 * Ensures consistent commercial routing across the application.
 */
export default function MembershipRedirect() {
    redirect('/pricing');
}
