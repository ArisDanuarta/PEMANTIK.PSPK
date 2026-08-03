import { useState, useEffect, useMemo, useCallback } from "react";

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
 * Menyimpan status halaman di sessionStorage sehingga tidak reset saat tombol Back digunakan.
 */
export function usePagination<T>(
  data: T[],
  itemsPerPage: number
): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [prevDataLength, setPrevDataLength] = useState(data.length);

  // Restore page dari sessionStorage saat pertama kali mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = `pagination_${window.location.pathname}`;
      const savedPage = window.sessionStorage.getItem(key);
      if (savedPage) {
        const parsed = parseInt(savedPage, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setCurrentPage(parsed);
        }
      }
    }
    setIsMounted(true);
  }, []);

  // Reset ke halaman 1 JIKA panjang data benar-benar berubah (user melakukan search/filter)
  useEffect(() => {
    if (isMounted && data.length !== prevDataLength) {
      setCurrentPage(1);
      setPrevDataLength(data.length);
      if (typeof window !== "undefined") {
        const key = `pagination_${window.location.pathname}`;
        window.sessionStorage.setItem(key, "1");
      }
    }
  }, [data.length, prevDataLength, isMounted]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      const key = `pagination_${window.location.pathname}`;
      window.sessionStorage.setItem(key, page.toString());
    }
  }, []);

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
    setCurrentPage: setPage,
    startIndex,
    endIndex,
  };
}
