'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useDataTable, type ColumnDef } from '@/hooks/use-data-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Checkbox } from './checkbox';

// Helper to safely access nested properties
function getNestedValue<T>(obj: T, path: string): any {
  if (obj === null || obj === undefined) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj as any);
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  onSelectionChange?: (selectedIds: string[]) => void;
  totalCount?: number;
  pageIndex?: number;
  onPageChange?: (nextPageIndex: number) => void;
  pageSize?: number;
  onPageSizeChange?: (nextPageSize: number) => void;
  pageSizeOptions?: number[];
}

export function DataTable<TData>({ columns, data, onSelectionChange, totalCount, pageIndex, onPageChange, pageSize, onPageSizeChange, pageSizeOptions = [25, 50, 100, 250] }: DataTableProps<TData>) {
  const serverMode = typeof totalCount === 'number' && typeof onPageChange === 'function';
  const resolvedPageSize = pageSize ?? 100;
  const resolvedPageIndex = pageIndex ?? 0;

  const {
    rows,
    filteredCount,
    setSorting,
    sorting,
    setGlobalFilter,
    globalFilter,
    rowSelection,
    toggleAll,
    toggleRow,
    pageIndex: hookPageIndex,
    setPageIndex,
    pageCount,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage
  } = useDataTable(data, columns, {
    serverMode,
    totalCount,
    pageIndex: resolvedPageIndex,
    pageSize: resolvedPageSize,
    onPageChange,
  });

  const effectivePageIndex = serverMode ? resolvedPageIndex : hookPageIndex;
  const [jumpInput, setJumpInput] = useState(String(effectivePageIndex + 1));

  useEffect(() => {
    setJumpInput(String(effectivePageIndex + 1));
  }, [effectivePageIndex]);

  const handleSort = (columnId: string) => {
    const isAsc = sorting.length > 0 && sorting[0].id === columnId && !sorting[0].desc;
    setSorting([{ id: columnId, desc: isAsc }]);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const val = parseInt(jumpInput, 10);
      if (!isNaN(val) && val >= 1 && val <= pageCount) {
          setPageIndex(val - 1);
      } else {
          setJumpInput(String(effectivePageIndex + 1));
      }
  };

  React.useEffect(() => {
      if (onSelectionChange) {
          onSelectionChange(Object.keys(rowSelection));
      }
  }, [rowSelection, onSelectionChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Filter current view..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="max-w-sm h-9"
          />
          <div className="flex items-center gap-3">
          {onPageSizeChange && (
            <select
              value={resolvedPageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 rounded-md border bg-white px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>{option} / page</option>
              ))}
            </select>
          )}
          <div className="text-xs font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap bg-muted px-3 py-1.5 rounded-full">
            {Object.keys(rowSelection).length} of {filteredCount} selected
          </div>
        </div>
      </div>
      <div className="rounded-md border overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={filteredCount > 0 && Object.keys(rowSelection).length === pagedRowsCount()}
                  onCheckedChange={(checked) => toggleAll(!!checked)}
                />
              </TableHead>
              {columns.map(column => (
                <TableHead key={(column.id || column.accessorKey) as string} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-3">
                  {column.header ? (
                    column.id === 'actions' ? (
                      <div className="text-right">{column.header}</div>
                    ) : column.accessorKey ? (
                      <Button
                          variant="ghost"
                          onClick={() => handleSort(column.accessorKey as string)}
                          className="-ml-4 h-8 text-[10px] font-black uppercase tracking-widest hover:bg-transparent hover:text-primary"
                      >
                          {column.header}
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    ) : (
                      column.header
                    )
                  ) : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <TableRow key={(row.original as any).id || index} data-state={rowSelection[(row.original as any).id] ? 'selected' : ''} className="hover:bg-slate-50/50">
                  <TableCell>
                      <Checkbox 
                        checked={!!rowSelection[(row.original as any).id]}
                        onCheckedChange={(checked) => toggleRow((row.original as any).id, !!checked)}
                      />
                  </TableCell>
                  {columns.map(column => (
                    <TableCell key={(column.id || column.accessorKey) as string} className="py-3 text-foreground">
                      {column.cell ? column.cell({ row }) : getNestedValue(row.original, column.accessorKey as string)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-32 text-center text-muted-foreground italic">
                  No records match your filters in this registry segment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 pt-2">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Showing {Math.min(effectivePageIndex * resolvedPageSize + 1, filteredCount)} to {Math.min((effectivePageIndex + 1) * resolvedPageSize, filteredCount)} of {filteredCount} entries
        </div>
        
        <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevPage} disabled={!canPrevPage}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <form onSubmit={handleJumpSubmit} className="flex items-center gap-2 px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page</span>
                    <Input 
                        className="w-14 h-8 text-center font-bold font-mono text-xs border-primary/20 bg-white" 
                        value={jumpInput} 
                        onChange={e => setJumpInput(e.target.value)}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">of {pageCount || 1}</span>
                </form>

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextPage} disabled={!canNextPage}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );

  function pagedRowsCount() {
    return rows.length;
  }
}
