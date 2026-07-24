import { useState, useEffect, useMemo } from "react";

export interface UsePaginationResult<T> {
  paginatedData: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setCurrentPage: (page: number) => void;
  startIndex: number;
  endIndex: number;
}

/**
 * Hook ringan untuk client-side pagination.
 * Otomatis reset ke halaman 1 saat `data` berubah (akibat filter/search).
 */
export function usePagination<T>(
  data: T[],
  itemsPerPage: number
): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset ke halaman 1 setiap kali panjang data berubah (filter/search)
  useEffect(() => {
    setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Jaga agar currentPage tidak melebihi totalPages jika data berkurang
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, startIndex, endIndex]
  );

  return {
    paginatedData,
    currentPage: safePage,
    totalPages,
    totalItems,
    setCurrentPage,
    startIndex,
    endIndex,
  };
}
