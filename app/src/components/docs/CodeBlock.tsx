'use client';

import { cn } from '@/lib/utils/common';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface CodeBlockProps {
  code: string | object;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language: _language = 'json', className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const formatted =
    typeof code === 'object'
      ? JSON.stringify(code, null, 2)
      : (() => {
          try {
            return JSON.stringify(JSON.parse(code), null, 2);
          } catch {
            return code;
          }
        })();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // ✅ Prevent toggling the parent collapsible
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-muted/50 text-sm font-mono text-muted-foreground overflow-x-auto',
        className,
      )}
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-6 w-6 opacity-70 hover:opacity-100 transition"
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>

      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className={_language ? `language-${_language}` : undefined}>{formatted}</code>
      </pre>
    </div>
  );
}
