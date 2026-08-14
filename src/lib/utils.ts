import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatDateFns } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (val === null || val === undefined || isNaN(val)) {
    return 'R 0.00';
  }
  const parts = val.toFixed(2).toString().split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `R ${integerPart}.${parts[1]}`;
}

export function formatDateSafe(dateValue: any, formatString: string = "dd MMM yyyy"): string {
    if (!dateValue) return 'N/A';
    let date;
    if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
    } else {
        date = new Date(dateValue);
    }
    if (isNaN(date.getTime())) return 'Invalid Date';
    return formatDateFns(date, formatString);
}

export function formatNumber(value: number | string | null | undefined): string {
    const val = typeof value === 'string' ? parseFloat(value) : value;
    if (val === null || val === undefined || isNaN(val)) {
        return '0';
    }
    const fixedValue = val.toFixed(0);
    return fixedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Shared utility for interacting with the /api/admin endpoint.
 */
export async function fetchFromAdminAPI(token: string, action: string, payload: any = {}) {
    const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store'
    });

    const text = await response.text();
    let result: any = {};
    try {
        result = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`Server returned invalid response (Status ${response.status})`);
    }

    if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error: ${action}`);
    }
    return result;
}

/**
 * Resilient HTML clipboard utility.
 * DEFINITIVELY avoids 'TypeError: Illegal constructor' by avoiding 'new ClipboardItem'.
 * Uses a hidden element approach for maximum compatibility across prototype environments.
 */
export async function copyHtmlToClipboard(html: string, plainText?: string) {
    if (typeof window === 'undefined') return false;

    const textToCopy = plainText || html.replace(/<[^>]*>/g, '');

    try {
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'fixed';
        container.style.pointerEvents = 'none';
        container.style.opacity = '0';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        window.getSelection()?.removeAllRanges();
        const range = document.createRange();
        range.selectNode(container);
        window.getSelection()?.addRange(range);

        // Standard execCommand approach (Constructor-free)
        const success = document.execCommand('copy');
        document.body.removeChild(container);
        window.getSelection()?.removeAllRanges();
        
        if (success) return true;
    } catch (e) {
        console.warn("DOM copy failed, falling back to writeText:", e);
    }

    try {
        // Fallback to text-only if DOM method fails
        await navigator.clipboard.writeText(textToCopy);
        return true;
    } catch (e) {
        console.error("All copy methods failed:", e);
        return false;
    }
}

/**
 * Generates and downloads a CSV file from an array of objects.
 */
export function downloadDataAsCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            let value = row[fieldName];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') {
                if (value.toDate) value = value.toDate().toISOString();
                else value = JSON.stringify(value);
            }
            let stringValue = String(value);
            if (/[",\n]/.test(stringValue)) {
                stringValue = `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
