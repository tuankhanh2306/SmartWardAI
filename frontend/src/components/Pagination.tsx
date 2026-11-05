import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  labelSingular?: string;
  labelPlural?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20],
  labelSingular = 'bản ghi',
  labelPlural = 'bản ghi',
}) => {
  if (totalItems <= 0) return null;

  const startIdx = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-[#EAEDFF] text-xs text-[#444651]">
      {/* Information text */}
      <div className="flex items-center gap-2">
        <span>
          Hiển thị <strong>{startIdx}</strong> - <strong>{endIdx}</strong> trong tổng số{' '}
          <strong className="text-[#00236F]">{totalItems}</strong> {totalItems === 1 ? labelSingular : labelPlural}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-[#DAE2FD]">
            <span className="text-[11px] text-[#757682]">Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 px-2 bg-[#F2F3FF] border border-[#DAE2FD] rounded-lg text-xs font-semibold text-[#00236F] focus:outline-none focus:border-[#00236F] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-[#DAE2FD] text-[#00236F] hover:bg-[#F2F3FF] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
          title="Trang đầu tiên"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-[#DAE2FD] text-[#00236F] hover:bg-[#F2F3FF] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
          title="Trang trước"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Number Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition active:scale-95 ${
                  currentPage === p
                    ? 'bg-[#00236F] text-white shadow-xs'
                    : 'border border-[#DAE2FD] text-[#444651] hover:bg-[#F2F3FF] hover:text-[#00236F]'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={`dots-${idx}`} className="px-1 text-[#757682] tracking-widest">
                ...
              </span>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-[#DAE2FD] text-[#00236F] hover:bg-[#F2F3FF] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
          title="Trang tiếp theo"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-[#DAE2FD] text-[#00236F] hover:bg-[#F2F3FF] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
          title="Trang cuối cùng"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
