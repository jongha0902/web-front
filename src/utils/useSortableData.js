import { useState, useMemo } from 'react';

export default function useSortableData(data) {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        setSortField(null); // 정렬 해제 (원래 순서)
        setSortDirection('asc');
      } else {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'desc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal == null || bVal == null) return 0;

      // 날짜 비교 (Date 객체 or ISO 문자열)
      const isDate = (v) =>
        v instanceof Date ||
        (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}:\d{2})?/.test(v));

      if (isDate(aVal) && isDate(bVal)) {
        const aTime = new Date(aVal).getTime();
        const bTime = new Date(bVal).getTime();
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }

      // 문자열 비교
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // 숫자 비교
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // 기타: 문자열로 fallback
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortField, sortDirection]);

  return {
    sortedData,
    sortField,
    sortDirection,
    handleSort,
  };
}
