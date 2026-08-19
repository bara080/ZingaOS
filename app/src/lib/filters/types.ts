export type FilterOption = {
  label: string;
  value: string;
};

export type FilterField<TFilters> =
  | {
      name: keyof TFilters;
      label: string;
      type: 'text' | 'email' | 'date';
    }
  | {
      name: keyof TFilters;
      label: string;
      type: 'select';
      options: FilterOption[];
      placeholder?: string;
      allowAll?: boolean;
    };
