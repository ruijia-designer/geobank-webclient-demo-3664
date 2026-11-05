import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Keep a newly selected page's first records visible within its own scroll pane. */
export function usePaginationScroll(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  page: number,
  pageSize: number,
) {
  const previous = useRef({ page, pageSize });
  useLayoutEffect(() => {
    const changed = previous.current.page !== page || previous.current.pageSize !== pageSize;
    previous.current = { page, pageSize };
    const container = containerRef.current;
    const content = contentRef.current;
    if (!changed || !container || !content) return;
    container.scrollTop = Math.max(0, container.scrollTop + content.getBoundingClientRect().top - container.getBoundingClientRect().top);
  }, [containerRef, contentRef, page, pageSize]);
}
