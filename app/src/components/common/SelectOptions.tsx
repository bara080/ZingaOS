'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SELECT_ALL_VALUE } from '@/lib/constants/select';

type Option = {
  label: string;
  value: string;
};

type Props = {
  value?: string;
  options: Option[];
  placeholder?: string;
  allowAll?: boolean;
  onChange: (value: string) => void;
};

export function SelectOptions({
  value,
  options,
  placeholder = 'Select...',
  allowAll,
  onChange,
}: Props) {
  return (
    <Select
      value={value || SELECT_ALL_VALUE}
      onValueChange={(val) => {
        onChange(val === SELECT_ALL_VALUE ? '' : val);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        {allowAll && <SelectItem value={SELECT_ALL_VALUE}>All</SelectItem>}

        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
