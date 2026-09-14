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
              'bg-[#2FD9C9] text-[#06231F] font-semibold hover:bg-[#5FE6D9] shadow-[0_0_24px_-4px_rgba(47,217,201,0.6)]',
            className,
          )}
        >
          {label}
          {withArrow && <ArrowRight className="size-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[#232833] bg-[#12151C] text-[#E7EBF1] sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#2FD9C9]/10 ring-1 ring-[#2FD9C9]/30">
              <CheckCircle2 className="size-7 text-[#2FD9C9]" />
            </div>
            <DialogHeader className="items-center">
              <DialogTitle className="text-[#E7EBF1]">You&apos;re on the list</DialogTitle>
              <DialogDescription className="text-[#98A1AE]">
                Thanks for your interest in Zinga AI. We&apos;ll reach out when a spot opens up.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="outline"
              className="mt-2 border-[#232833] bg-transparent text-[#E7EBF1] hover:bg-[#171B23] hover:text-[#E7EBF1]"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#E7EBF1]">Request access</DialogTitle>
              <DialogDescription className="text-[#98A1AE]">
                Zinga AI is invite-only while we onboard providers. Tell us where to reach you.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-2 flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wl-email" className="text-[#98A1AE]">
                  Email <span className="text-[#2FD9C9]">*</span>
                </Label>
                <Input
                  id="wl-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  aria-invalid={!!errors.email}
                  className="border-[#232833] bg-[#0B0D11] text-[#E7EBF1] placeholder:text-[#5E6672] focus-visible:border-[#2FD9C9] focus-visible:ring-[#2FD9C9]/30"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-[#E0655A]">{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="wl-name" className="text-[#98A1AE]">
                  Name <span className="text-[#5E6672]">(optional)</span>
                </Label>
                <Input
                  id="wl-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  className="border-[#232833] bg-[#0B0D11] text-[#E7EBF1] placeholder:text-[#5E6672] focus-visible:border-[#2FD9C9] focus-visible:ring-[#2FD9C9]/30"
                  {...register('name')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="wl-company" className="text-[#98A1AE]">
                  Business <span className="text-[#5E6672]">(optional)</span>
                </Label>
                <Input
                  id="wl-company"
                  type="text"
                  autoComplete="organization"
                  placeholder="Your business or studio"
                  className="border-[#232833] bg-[#0B0D11] text-[#E7EBF1] placeholder:text-[#5E6672] focus-visible:border-[#2FD9C9] focus-visible:ring-[#2FD9C9]/30"
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

              {serverError && <p className="text-sm text-[#E0655A]">{serverError}</p>}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 w-full bg-[#2FD9C9] font-semibold text-[#06231F] hover:bg-[#5FE6D9] shadow-[0_0_24px_-4px_rgba(47,217,201,0.6)]"
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

              <p className="text-center text-xs text-[#5E6672]">
                We&apos;ll only use your email to follow up about access.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
