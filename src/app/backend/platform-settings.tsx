'use client';

import BankDetailsSettings from "./bank-details-settings";
import ChartOfAccountsSettings from "./chart-of-accounts-settings";

export default function PlatformSettingsContent() {
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-2xl font-bold">Platform Settings</h1>
                <p className="mt-2 text-muted-foreground">Manage central configurations for the TransConnect platform.</p>
            </div>
            <BankDetailsSettings />
            <ChartOfAccountsSettings />
        </div>
    )
}
