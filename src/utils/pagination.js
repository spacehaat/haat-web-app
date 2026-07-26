export const PAGE_SIZE_OPTIONS = [10, 20, 40, 60];

export const DEFAULT_PAGE_SIZE = 20;

export const DEFAULT_FRESHNESS_PAGE_SIZE = 40;

export function buildPageItems(currentPage, pageCount) {
  const pages = [];
  for (let i = 1; i <= pageCount; i += 1) {
    if (i === 1 || i === pageCount || Math.abs(i - currentPage) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return pages;
}

export function pageRange(currentPage, pageSize, total) {
  const safePage = Math.min(Math.max(currentPage, 1), Math.max(1, Math.ceil(total / pageSize) || 1));
  const rangeStart = total ? (safePage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(safePage * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  return { currentPage: safePage, rangeStart, rangeEnd, pageCount };
}
