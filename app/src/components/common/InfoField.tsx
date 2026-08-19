'use client';

import { cn } from '@/lib/utils/common';
import { Check, Copy } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface InfoFieldProps {
  label: string;
  value?: ReactNode;
  copyValue?: string;
  className?: string;
}

export function InfoField({ label, value, copyValue, className }: InfoFieldProps) {
  const [copied, setCopied] = useState(false);

  const displayValue = value === undefined || value === null || value === '' ? '-' : value;

  const handleCopy = async () => {
    if (!copyValue) return;

    try {
      // Modern browsers (https, localhost)
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyValue);
      } else {
        // Fallback for older / blocked environments
        const textarea = document.createElement('textarea');
        textarea.value = copyValue;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className={cn('space-y-1 group', className)}>
      <p className="text-xs text-muted-foreground flex items-center gap-2">{label}</p>

      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground break-all flex-1">{displayValue}</p>

        {copyValue && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
