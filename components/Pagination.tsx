'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
  hasMore: boolean;
  pageSize: number;
  totalItems?: number;
}

export function Pagination({
  currentPage,
  onPageChange,
  onNext,
  onPrev,
  hasMore,
  pageSize,
  totalItems,
}: PaginationProps) {
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems || (currentPage + 1) * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 py-3 sm:py-4 px-3 sm:px-6 border-t dark:border-gray-700">
      <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span>
        {totalItems && (
          <>
            {' '}of <span className="font-medium">{totalItems}</span>
          </>
        )}{' '}
        results
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentPage === 0}
          className="flex items-center gap-1 text-xs sm:text-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm font-medium dark:text-gray-300">
            Page {currentPage + 1}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasMore}
          className="flex items-center gap-1 text-xs sm:text-sm"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </div>
  );
}
