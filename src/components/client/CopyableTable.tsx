import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  header: string;
  format?: (value: unknown) => string;
}

interface CopyableTableProps<T extends Record<string, unknown>> {
  title?: string;
  columns: Column[];
  data: T[];
  className?: string;
  emptyMessage?: string;
}

export function CopyableTable<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  className,
  emptyMessage = 'No data available',
}: CopyableTableProps<T>) {
  const [copiedRow, setCopiedRow] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const { toast } = useToast();

  const formatValue = (col: Column, value: unknown): string => {
    if (value === undefined || value === null) return 'N/A';
    if (col.format) return col.format(value);
    return String(value);
  };

  const handleCopyRow = async (rowIndex: number) => {
    const row = data[rowIndex];
    const text = columns
      .map((col) => `${col.header}: ${formatValue(col, row[col.key])}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedRow(rowIndex);
      toast({
        title: 'Row Copied!',
        description: 'Row data copied to clipboard',
        duration: 2000,
      });
      setTimeout(() => setCopiedRow(null), 2000);
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleCopyAll = async () => {
    const header = columns.map((col) => col.header).join('\t');
    const rows = data.map((row) =>
      columns.map((col) => formatValue(col, row[col.key])).join('\t')
    );
    const text = [header, ...rows].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      toast({
        title: 'Table Copied!',
        description: `${data.length} rows copied to clipboard`,
        duration: 2000,
      });
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (data.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed border-border/50 p-6 text-center', className)}>
        <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <h4 className="font-medium text-sm">{title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAll}
            className="h-8 text-xs"
          >
            {copiedAll ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                Copy All
              </>
            )}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/20 border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left font-medium text-muted-foreground"
                >
                  {col.header}
                </th>
              ))}
              <th className="px-4 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 font-medium">
                    {formatValue(col, row[col.key])}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleCopyRow(rowIndex)}
                  >
                    {copiedRow === rowIndex ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
