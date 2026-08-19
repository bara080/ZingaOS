import { Button } from '@/components/ui/button';

export function DataTableFooter({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="w-full flex items-center justify-between gap-2 text-xs border-t pt-4">
      <span className="text-muted-foreground">
        Page {page} of {totalPages} · {total.toLocaleString()} total
      </span>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page === 1} onClick={onPrev}>
          Prev
        </Button>
        <Button size="sm" variant="outline" disabled={page === totalPages} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
