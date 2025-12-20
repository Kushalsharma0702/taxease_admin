import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CopyableFieldProps {
  label: string;
  value: string | number | undefined | null;
  craLine?: string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  compact?: boolean;
}

export function CopyableField({
  label,
  value,
  craLine,
  className,
  labelClassName,
  valueClassName,
  compact = false,
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const displayValue = value === undefined || value === null || value === '' ? 'N/A' : String(value);
  const isNotApplicable = displayValue === 'N/A';

  const handleCopy = async () => {
    if (isNotApplicable) return;
    
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: `${label}: ${displayValue}`,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 transition-all duration-200 hover:bg-muted/40 hover:border-border',
        compact ? 'px-3 py-2' : 'px-4 py-3',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {craLine && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
              Line {craLine}
            </span>
          )}
          <span className={cn('text-sm text-muted-foreground truncate', labelClassName)}>
            {label}
          </span>
        </div>
        <p
          className={cn(
            'font-medium mt-0.5 truncate',
            compact ? 'text-sm' : 'text-base',
            isNotApplicable && 'text-muted-foreground italic',
            valueClassName
          )}
        >
          {displayValue}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 shrink-0 transition-all duration-200',
          isNotApplicable ? 'opacity-30 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'
        )}
        onClick={handleCopy}
        disabled={isNotApplicable}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
