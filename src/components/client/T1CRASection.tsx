import { Children, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface T1CRASectionProps {
  title: string;
  icon?: React.ReactNode;
  applicable: boolean;
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  sectionData?: Record<string, unknown>;
}

export function T1CRASection({
  title,
  icon,
  applicable,
  children,
  className,
  defaultExpanded = true,
  sectionData,
}: T1CRASectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const hasRenderableChildren = Children.count(children) > 0;

  const handleCopySection = async () => {
    if (!sectionData || !applicable) return;

    const formatObject = (obj: Record<string, unknown>, prefix = ''): string => {
      return Object.entries(obj)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => {
          const label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return formatObject(value as Record<string, unknown>, `${prefix}${label} - `);
          }
          return `${prefix}${label}: ${value}`;
        })
        .join('\n');
    };

    try {
      const text = formatObject(sectionData);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Section Copied!',
        description: `${title} data copied to clipboard`,
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
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {icon}
              <CardTitle className="text-base">{title}</CardTitle>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {!applicable && (
              <Badge variant="outline" className="text-xs bg-muted/50">
                Not Applicable
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {applicable && sectionData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySection}
                className="h-8 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Section
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          {!applicable && (
            <div className="mb-4 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Answer marked as <span className="font-medium">No / Not Applicable</span>. All sub-fields are shown below for admin review.
            </div>
          )}

          {hasRenderableChildren ? (
            children
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground italic">
                No data provided by client for this section (N/A).
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
