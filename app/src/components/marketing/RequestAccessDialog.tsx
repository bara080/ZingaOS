'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils/common';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  email: z.string().trim().email({ message: 'Enter a valid email address.' }),
  name: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
  // Honeypot — kept empty by humans, filled by bots. Never shown.
  website: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type TriggerProps = {
  label?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  className?: string;
  withArrow?: boolean;
};

// Self-contained "Request access" flow. Renders its OWN trigger button so every
// Request-access CTA (nav, hero, CTA band) is just <RequestAccessDialog … />.
// Posts to the public /api/waitlist route and swaps to a success state.
export function RequestAccessDialog({
  label = 'Request access',
  variant = 'default',
  size = 'default',
  className,
  withArrow = false,
}: TriggerProps) {
  const [open, setOpen] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', name: '', company: '', website: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        setServerError('Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
      reset();
    } catch {
      setServerError('Network error. Please try again.');
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset back to the form the next time it opens.
      setTimeout(() => {
        setSubmitted(false);
        setServerError(null);
      }, 200);
    }
  };

  const isPrimary = variant === 'default';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            isPrimary &&
              'bg-brand text-brand-ink font-semibold hover:bg-brand-hi shadow-brand-glow',
            className,
          )}
        >
          {label}
          {withArrow && <ArrowRight className="size-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-line bg-panel text-ink sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand/10 ring-1 ring-brand/30">
              <CheckCircle2 className="size-7 text-brand" />
            </div>
            <DialogHeader className="items-center">
              <DialogTitle className="text-ink">You&apos;re on the list</DialogTitle>
              <DialogDescription className="text-ink2">
                Thanks for your interest in Zinga AI. We&apos;ll reach out when a spot opens up.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="outline"
              className="mt-2 border-line bg-transparent text-ink hover:bg-panel2 hover:text-ink"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-ink">Request access</DialogTitle>
              <DialogDescription className="text-ink2">
                Zinga AI is invite-only while we onboard providers. Tell us where to reach you.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-2 flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wl-email" className="text-ink2">
                  Email <span className="text-brand">*</span>
                </Label>
                <Input
                  id="wl-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  aria-invalid={!!errors.email}
                  className="border-line bg-canvas text-ink placeholder:text-ink3 focus-visible:border-brand focus-visible:ring-brand/30"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-danger">{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="wl-name" className="text-ink2">
                  Name <span className="text-ink3">(optional)</span>
                </Label>
                <Input
                  id="wl-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  className="border-line bg-canvas text-ink placeholder:text-ink3 focus-visible:border-brand focus-visible:ring-brand/30"
                  {...register('name')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="wl-company" className="text-ink2">
                  Business <span className="text-ink3">(optional)</span>
                </Label>
                <Input
                  id="wl-company"
                  type="text"
                  autoComplete="organization"
                  placeholder="Your business or studio"
                  className="border-line bg-canvas text-ink placeholder:text-ink3 focus-visible:border-brand focus-visible:ring-brand/30"
                  {...register('company')}
                />
              </div>

              {/* Honeypot — visually hidden, off the tab order, invisible to real users. */}
              <div aria-hidden className="hidden">
                <label htmlFor="wl-website">Website</label>
                <input
                  id="wl-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  {...register('website')}
                />
              </div>

              {serverError && <p className="text-sm text-danger">{serverError}</p>}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 w-full bg-brand font-semibold text-brand-ink hover:bg-brand-hi shadow-brand-glow"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Request access'
                )}
              </Button>

              <p className="text-center text-xs text-ink3">
                We&apos;ll only use your email to follow up about access.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
