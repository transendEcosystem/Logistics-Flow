'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from "react";
import Script from 'next/script'
import * as gtag from '@/lib/gtag'

const Analytics = () => {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (!gtag.GA_TRACKING_ID) {
            return;
        }
        const url = pathname + searchParams.toString()
        gtag.pageview(new URL(url, window.location.origin))
    }, [pathname, searchParams])

    if (!gtag.GA_TRACKING_ID) {
        return null;
    }

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
            />
            <Script
                id="gtag-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${gtag.GA_TRACKING_ID}', {
                            page_path: window.location.pathname,
                        });
                    `,
                }}
            />
        </>
    )
}

export default Analytics
