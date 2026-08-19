import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

function TrendPill({ value }: { value: number }) {
  const up = value >= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {`${up ? '+' : ''}${value.toFixed(1)}%`}
    </span>
  );
}

type StatCardProps = {
  title?: string;
  value?: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  desc?: string;

  changeValue?: number;
  changeText?: string;
  changeLabel?: string;

  loading?: boolean;
};

function StatCard({
  title,
  value,
  Icon,
  desc,
  changeValue,
  changeText,
  changeLabel,
  loading = false,
}: StatCardProps) {
  return (
    <Card className="bg-primary-foreground gap-2 md:gap-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        {loading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        )}

        {Icon && !loading ? <Icon className="h-4 w-4 opacity-70" /> : null}
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-32 mb-2" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}

        {!loading && desc ? <CardDescription>{desc}</CardDescription> : null}
      </CardContent>

      {!loading && (changeValue !== undefined || changeLabel || changeText) && (
        <CardFooter className="flex items-center gap-2">
          {changeValue !== undefined && <TrendPill value={changeValue} />}
          {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
          {changeText && <span className="text-xs text-muted-foreground">{changeText}</span>}
        </CardFooter>
      )}
    </Card>
  );
}

export default StatCard;
