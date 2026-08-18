
'use client';

import { useUser } from '@/firebase';
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
export function usePermissions() {
    const { user, isUserLoading } = useUser();
    
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
        const membershipId = companyData.membershipId || 'free';
        
        // FOUNDATION TIERS: Renamed from intelligence to 'Access Control'
        const hasAccessTier = ['basic', 'standard', 'premium', 'intelligence'].includes(membershipId);
        
        const isAssociate = user.declaredPosition === 'associate' || user.role === 'associate' || companyData.declaredRole === 'associate';

        // 1. Core Access Permissions
        if (hasAccessTier || isAssociate) {
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
        
        // 3. Operational Presence
        if (companyData.shopId && !isAssociate) {
            perms.add('edit:shop');
            perms.add('publish:shop');
            perms.add('manage:products');
        }

        return perms;
    }, [user]);

    const can = (action: Action, resource: Resource) => {
        if (!user) return false;
        
        if (permissions.has('manage:all')) return true;
        if (permissions.has('manage:' + resource)) return true;

        const requiredPermissions = permissionHierarchy[action];
        return requiredPermissions.some(perm => permissions.has(perm + ':' + resource));
    };
    
    return { can, isLoading: isUserLoading, permissions };
}
