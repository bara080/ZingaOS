'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CodeBlock } from './CodeBlock';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Info,
  ShieldAlert,
  ListChecks,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  FileCode2,
  Activity,
} from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'MIDDLEWARE' | 'INFO' | 'INTERNAL';

interface APIDocSectionProps {
  id: string;
  title: string;
  method: HttpMethod;
  path: string;
  description: string;
  details?: string[];
  requestBody?: string;
  requiredFields?: string[];
  successResponse?: string;
  workflowSteps?: string[];
  errorResponses?: string[];
  validations?: string[];
  bodyParams?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}

export function APIDocSection({
  id,
  title,
  method,
  path,
  description,
  details,
  requestBody,
  requiredFields,
  successResponse,
  workflowSteps,
  errorResponses,
  validations,
  bodyParams,
}: APIDocSectionProps) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const methodColor =
    {
      GET: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      POST: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      PUT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      PATCH: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      DELETE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      MIDDLEWARE: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      INFO: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      INTERNAL: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    }[method] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formatInlineCode = (text: string) => ({
    __html: text.replace(
      /`([^`]+)`/g,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold text-[0.85em] font-mono">$1</code>',
    ),
  });

  return (
    <section
      id={id}
      aria-label={`${title} API Section`}
      className="mb-12 scroll-mt-32 group/section"
    >
      <div className="w-full relative">
        {/* Subtle decorative glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/5 to-muted/0 rounded-2xl blur-xl opacity-0 group-hover/section:opacity-100 transition-opacity duration-500 -z-10" />

        <Card className="!p-0 !gap-0 border-border/40 shadow-md hover:shadow-lg transition-all duration-500 overflow-hidden bg-background/95 backdrop-blur-xl rounded-2xl">
          <CardHeader
            className={`cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 lg:px-8 lg:pt-8 transition-colors ${open ? 'border-b border-border/30 bg-muted/5' : 'hover:bg-muted/30'}`}
            onClick={() => setOpen(!open)}
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-foreground tracking-tight">{title}</h3>
                {!open && <ChevronRight size={18} className="text-muted-foreground opacity-50" />}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-black tracking-wider rounded-md border shadow-sm ${methodColor}`}
                >
                  {method}
                </span>
                <div
                  className="flex items-center gap-2 group/copy px-2 py-1 -ml-2 rounded-md hover:bg-muted/50 transition-colors"
                  onClick={handleCopyPath}
                  title="Copy Endpoint"
                >
                  <span className="font-mono text-sm text-muted-foreground group-hover/copy:text-foreground transition-colors">
                    {path}
                  </span>
                  {copied ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy
                      size={14}
                      className="text-muted-foreground opacity-0 group-hover/copy:opacity-100 transition-opacity"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="hidden sm:flex text-muted-foreground bg-muted/30 p-2 rounded-full hover:bg-muted/60 transition-colors">
              {open ? <ChevronDown size={20} /> : <ArrowRight size={20} />}
            </div>
          </CardHeader>

          {open && (
            <CardContent className="!p-0">
              <div className="flex flex-col">
                {/* TOP SECTION - Information */}
                <div className="p-6 lg:px-8 lg:py-8 space-y-8">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-base text-foreground/80 leading-relaxed font-medium">
                      {description}
                    </p>
                  </div>

                  {details && (
                    <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <Info size={16} /> Details
                      </h4>
                      <ul className="space-y-2.5 ml-1">
                        {details.map((d, i) => (
                          <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                            <span className="text-blue-500/50 dark:text-blue-400/50 mt-[3px] font-bold">
                              —
                            </span>
                            <span dangerouslySetInnerHTML={formatInlineCode(d)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {bodyParams && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                        <ListChecks size={18} className="text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-foreground">Body Parameters</h4>
                      </div>
                      <div className="space-y-5">
                        {bodyParams.map((param, i) => (
                          <div
                            key={i}
                            className="flex flex-col gap-2 pb-5 border-b border-border/20 last:border-0 last:pb-0"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <code className="text-sm font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                                {param.name}
                              </code>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {param.type}
                              </span>
                              {param.required && (
                                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                  Required
                                </span>
                              )}
                            </div>
                            <p
                              className="text-sm text-muted-foreground leading-relaxed pl-1"
                              dangerouslySetInnerHTML={formatInlineCode(param.description)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {requiredFields && (
                    <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-2">
                        <CheckCircle size={16} /> Required Fields
                      </h4>
                      <ul className="space-y-2.5 ml-1">
                        {requiredFields.map((f, i) => (
                          <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                            <span className="text-rose-500/50 mt-[3px] font-bold">*</span>
                            <span dangerouslySetInnerHTML={formatInlineCode(f)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validations && (
                    <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <ShieldAlert size={16} /> Validation Rules
                      </h4>
                      <ul className="space-y-2.5 ml-1">
                        {validations.map((v, i) => (
                          <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                            <span className="text-amber-500 mt-[2px] opacity-70">✓</span>
                            <span dangerouslySetInnerHTML={formatInlineCode(v)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {workflowSteps && (
                    <div className="bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 rounded-xl p-5 space-y-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-2">
                        <Activity size={16} /> Backend Workflow
                      </h4>
                      <div className="relative border-l-2 border-purple-500/20 ml-3 pl-6 space-y-5 py-2">
                        {workflowSteps.map((step, i) => (
                          <div key={i} className="relative group/step">
                            {/* Step Indicator Node */}
                            <div className="absolute -left-[30px] top-1.5 h-[10px] w-[10px] rounded-full border-2 border-background bg-purple-500/50 group-hover/step:bg-purple-500 transition-colors" />
                            <p
                              className="text-sm text-foreground/80 leading-relaxed"
                              dangerouslySetInnerHTML={formatInlineCode(step)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* DASHED SEPARATOR */}
                <div className="mx-6 lg:mx-8 border-t border-dashed border-border/60" />

                {/* BOTTOM SECTION - Code Snippets */}
                <div className="p-6 lg:px-8 lg:py-8 space-y-8">
                  {requestBody && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pl-1">
                        <h4 className="text-sm font-semibold tracking-wide text-foreground/80 flex items-center gap-2">
                          <FileCode2 size={14} />
                          Request Example
                        </h4>
                      </div>
                      <div className="shadow-sm rounded-xl overflow-hidden border border-border/50">
                        <CodeBlock code={requestBody} />
                      </div>
                    </div>
                  )}

                  {successResponse && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pl-1">
                        <h4 className="text-sm font-semibold tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <CheckCircle size={14} />
                          Success Response
                        </h4>
                      </div>
                      <div className="shadow-sm rounded-xl overflow-hidden border border-emerald-500/20 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500/50 z-10" />
                        <CodeBlock code={successResponse} />
                      </div>
                    </div>
                  )}

                  {errorResponses && errorResponses.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pl-1">
                        <h4 className="text-sm font-semibold tracking-wide text-rose-500 dark:text-rose-400 flex items-center gap-2">
                          <AlertCircle size={14} />
                          Error Responses
                        </h4>
                      </div>
                      <div className="space-y-4">
                        {errorResponses.map((res, i) => (
                          <div
                            key={i}
                            className="shadow-sm rounded-xl overflow-hidden border border-rose-500/20 relative"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500/50 z-10" />
                            <CodeBlock code={res} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </section>
  );
}
