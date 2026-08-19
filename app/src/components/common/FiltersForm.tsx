'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/common/DatePicker';
import { formatDateLocal } from '@/lib/utils/common';
import { FilterField } from '@/lib/filters/types';
import FormField from '@/components/common/FormField';
import { SelectOptions } from './SelectOptions';

type Props<TFilters> = {
  title?: string;
  fields: FilterField<TFilters>[];
  filters: TFilters;
  defaultFilters: TFilters;
  onApply: (filters: TFilters) => void;
  onReset: () => void;
};

export function FiltersForm<TFilters>({
  title = 'Filters',
  fields,
  filters,
  onApply,
  onReset,
  defaultFilters,
}: Props<TFilters>) {
  // ✅ LOCAL draft state (this fixes focus issue)
  const [draft, setDraft] = useState(filters);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(filters);
  const hasAppliedFilters = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  // Sync draft if parent filters change (reset / external)
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  return (
    <Card className="bg-primary-foreground">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => {
          const value = draft[field.name];

          switch (field.type) {
            case 'text':
            case 'email':
              return (
                <FormField
                  key={String(field.name)}
                  label={field.label}
                  htmlFor={String(field.name)}
                >
                  <Input
                    type={field.type}
                    value={String(value ?? '')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [field.name]: e.target.value,
                      })
                    }
                  />
                </FormField>
              );

            case 'date':
              return (
                <FormField key={String(field.name)} label={field.label}>
                  <DatePicker
                    value={value ? new Date(String(value)) : undefined}
                    onChange={(date) =>
                      setDraft({
                        ...draft,
                        [field.name]: date ? formatDateLocal(date) : '',
                      })
                    }
                  />
                </FormField>
              );

            case 'select':
              return (
                <FormField key={String(field.name)} label={field.label}>
                  <SelectOptions
                    value={String(value ?? '')}
                    options={field.options}
                    allowAll={field.allowAll}
                    placeholder={field.placeholder}
                    onChange={(val) =>
                      setDraft({
                        ...draft,
                        [field.name]: val,
                      })
                    }
                  />
                </FormField>
              );

            default:
              return null;
          }
        })}

        <div className="col-span-full flex justify-end gap-2 pt-2">
          {/* RESET — only when filters are applied */}
          {hasAppliedFilters && !isDirty && (
            <Button
              variant="outline"
              onClick={() => {
                setDraft(defaultFilters);
                onReset();
              }}
            >
              Reset
            </Button>
          )}

          {/* APPLY — only when user changed something */}
          <Button
            disabled={!isDirty}
            onClick={() => {
              onApply(draft);
            }}
          >
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
