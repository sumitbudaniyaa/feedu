import { cn } from '@feedo/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shimmer rounded-md bg-muted/60', className)} {...props} />;
}

export { Skeleton };
