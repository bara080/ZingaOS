'use client';

import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export type RowAction<T> = {
  label: string;
  onClick: (item: T) => void;
  hidden?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  active?: boolean;
};

type Props<T> = {
  item: T;
  actions: RowAction<T>[];
};

export function RowActions<T>({ item, actions }: Props<T>) {
  const visibleActions = actions.filter((a) => !a.hidden);

  if (!visibleActions.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="
            data-[state=open]:bg-accent
            data-[state=open]:text-accent-foreground
          "
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {visibleActions.map((action, i) => (
          <div key={i}>
            {action.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={action.disabled}
              onClick={(e) => {
                e.stopPropagation(); // 🔑 prevents row click
                action.onClick(item);
              }}
              className={action.destructive ? 'text-destructive' : ''}
            >
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
