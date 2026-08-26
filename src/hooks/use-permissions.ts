
'use client';

import { useUser } from '@/firebase';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';

export type Action = 'create' | 'view' | 'edit' | 'delete' | 'manage' | 'publish' | 'transact';
export type Resource = 
    'shop' | 
    'products' | 
    'staff' | 
    'billing' | 
    'enquiries' | 
    'quotes' | 
    'wallet' |
    'supplierMall' |
    'transporterMall' |
    'financeMall' |
    'loads' |
    'buySellMall' |
    'distributionMall' |
    'warehouseMall' |
    'repurposeMall' |
    'aftermarketMall' |
    'marketplaceDigital' |
    'marketplaceData' |
    'marketplaceLogistics' |
    'marketplaceLoyalty' |
    'tech' |
    'contributions' |
    'permissions' |
    'social' |
    'marketing-studio' |
    'lending-focus' |
    'account' |
    'direct-contacts' |
    'ads' |
    'human-capital' |
    'data-harvest';

const permissionHierarchy: { [key in Action]: Action[] } = {
    manage: ['create', 'view', 'edit', 'delete', 'publish', 'transact'],
    transact: ['transact'],
    create: ['create'],
    view: ['view'],
    edit: ['edit'],
    delete: ['delete'],
    publish: ['publish'],
};

/**
 * NODE & ACCESS PERMISSIONS
 * Enforces boundaries for the Triple Engine model: Access vs Data Silos.
 */
export function usePermissions(activeRole?: string) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const staffMembershipQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !user.companyId) return null;
        return query(
            collection(firestore, `companies/${user.companyId}/staff`),
            where('userUid', '==', user.uid),
            where('status', '==', 'confirmed')
        );
    }, [firestore, user?.companyId, user?.uid]);
    const { data: staffMembership, isLoading: isStaffMembershipLoading } = useCollection(staffMembershipQuery);
    
    const permissions = useMemo(() => {
        const perms = new Set<string>();
        
        if (!user) {
            return perms;
        }

        const isAdmin = user.email === 'mkoton100@gmail.com' || 
                        user.email === 'beyondtransport@gmail.com' ||
                        user.email === 'michael@logisticsflow.co.za' ||
                        user.claims?.admin === true;

        if (isAdmin) {
            perms.add('manage:all');
            return perms;
        }
        
        const companyData = user.companyData || {};
        const membershipId = companyData.intelligenceMembershipId || companyData.membershipId || 'free';
        const hasTransactionMembership = Boolean(companyData.transactionMembershipId);
        
        // FOUNDATION TIERS: Renamed from intelligence to 'Access Control'
        const hasAccessTier = ['basic', 'standard', 'premium', 'intelligence'].includes(membershipId);
        
        const isAssociate = user.declaredPosition === 'associate' || user.role === 'associate' || companyData.declaredRole === 'associate';
        const isCompanyOwner = companyData.ownerId === user.uid || user.declaredPosition === 'owner';

        // 1. Core Access Permissions
        if (hasAccessTier || isAssociate || isCompanyOwner) {
            perms.add('view:direct-contacts');
            perms.add('view:account');
            perms.add('view:wallet');
            perms.add('view:quotes');
            perms.add('create:quotes');
            perms.add('view:enquiries');
            perms.add('create:enquiries');
            perms.add('manage:staff');
            perms.add('manage:ads');
            perms.add('view:marketing-studio');
            perms.add('view:human-capital');
            perms.add('create:human-capital');
        }

        const staffRecord = staffMembership?.[0] || {};
        const role = activeRole || companyData.activeBusinessRole || companyData.primaryBusinessDomain;
        const assignedPermissions = role && staffRecord.permissionsByRole?.[role]
            ? staffRecord.permissionsByRole[role]
            : staffRecord.permissions || [];
        for (const permission of assignedPermissions) {
            if (typeof permission === 'string' && permission.includes(':')) {
                perms.add(permission);
            }
        }

        // 2. Data Silo Subscriptions (B2B Logic)
        if (companyData.hasLoadsPlan) {
            perms.add('view:loads');
            perms.add('transact:loads');
        }
        if (companyData.hasWarehousePlan) {
            perms.add('view:warehouseMall');
            perms.add('transact:warehouseMall');
        }
        if (companyData.hasBuySellPlan) {
            perms.add('view:buySellMall');
            perms.add('transact:buySellMall');
        }
        if (companyData.hasTransporterPlan || companyData.primaryBusinessDomain === 'transporter' || companyData.declaredRole === 'transporter') {
            perms.add('view:transporterMall');
        }
        if (companyData.hasSupplierPlan || companyData.primaryBusinessDomain === 'supplier' || companyData.declaredRole === 'supplier') {
            perms.add('view:supplierMall');
        }
        
        // 3. Operational Presence
        if (hasTransactionMembership && !isAssociate) {
            perms.add('create:shop');
        }
        if (companyData.shopId && !isAssociate) {
            perms.add('edit:shop');
            perms.add('publish:shop');
            perms.add('manage:products');
        }

        return perms;
    }, [user, staffMembership, activeRole]);

    const can = (action: Action, resource: Resource) => {
        if (!user) return false;
        
        if (permissions.has('manage:all')) return true;
        if (permissions.has('manage:' + resource)) return true;

        const requiredPermissions = permissionHierarchy[action];
        return requiredPermissions.some(perm => permissions.has(perm + ':' + resource));
    };
    
    return { can, isLoading: isUserLoading || isStaffMembershipLoading, permissions };
}
