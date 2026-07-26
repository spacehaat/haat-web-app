import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildPageItems, PAGE_SIZE_OPTIONS } from '../../utils/pagination.js';

export default function ListPagination({
  currentPage,
  pageCount,
  total,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  loading = false,
  className = '',
}) {
  if (!total) return null;

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);
  const pageItems = buildPageItems(currentPage, pageCount);

  return (
    <div className={`inv-pagination ${className}`.trim()}>
      <div className="pg-left">
        <span className="pg-info">
          Showing <b className="tnum">{rangeStart}</b>–<b className="tnum">{rangeEnd}</b> of <b className="tnum">{total}</b>
        </span>
        <label className="pg-size">
          <span>Per page</span>
          <select
            value={pageSize}
            disabled={loading}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Items per page"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      {pageCount > 1 ? (
        <div className="pg-controls">
          <button
            className="btn sm pg-btn"
            disabled={currentPage === 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </button>
          {pageItems.map((it, i) => (
            it === '…' ? (
              <span key={`gap-${i}`} className="pg-gap">…</span>
            ) : (
              <button
                key={it}
                className={`btn sm pg-num ${it === currentPage ? 'on' : ''}`}
                onClick={() => onPageChange(it)}
                disabled={loading}
              >
                {it}
              </button>
            )
          ))}
          <button
            className="btn sm pg-btn"
            disabled={currentPage === pageCount || loading}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight />
          </button>
        </div>
      ) : null}
    </div>
  );
}
