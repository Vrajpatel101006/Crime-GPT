import { useState, useCallback, useMemo } from 'react';
import { getAccessibleCases } from '../../store';
import type { CaseRecord } from '../../types';

export type SortColumn = 'createdAt' | 'firNumber' | 'crimeType' | 'status' | 'readinessScore';
type SortDir = 'asc' | 'desc';

export function useCaseFilters() {
  const [cases, setCases] = useState<CaseRecord[]>(() => getAccessibleCases());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCrimeType, setFilterCrimeType] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());

  const crimeTypes = useMemo(
    () => [...new Set(cases.map(c => c.crimeType))],
    [cases],
  );

  const filteredCases = useMemo(() => {
    return cases
      .filter(c => {
        const matchSearch =
          !search ||
          c.firNumber.toLowerCase().includes(search.toLowerCase()) ||
          c.crimeType.toLowerCase().includes(search.toLowerCase()) ||
          c.victim.name.toLowerCase().includes(search.toLowerCase()) ||
          c.policeStation.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || c.status === filterStatus;
        const matchCrime = filterCrimeType === 'all' || c.crimeType === filterCrimeType;
        return matchSearch && matchStatus && matchCrime;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        switch (sortColumn) {
          case 'firNumber':
            return a.firNumber.localeCompare(b.firNumber) * dir;
          case 'crimeType':
            return a.crimeType.localeCompare(b.crimeType) * dir;
          case 'status':
            return a.status.localeCompare(b.status) * dir;
          case 'readinessScore':
            return (a.readinessScore - b.readinessScore) * dir;
          case 'createdAt':
          default:
            return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        }
      });
  }, [cases, search, filterStatus, filterCrimeType, sortColumn, sortDir]);

  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortColumn === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      else {
        setSortColumn(col);
        setSortDir('asc');
      }
    },
    [sortColumn],
  );

  const counts = useMemo(() => {
    return {
      total: cases.length,
      active: cases.filter(c => c.status === 'active').length,
      under_review: cases.filter(c => c.status === 'under_review').length,
      approved: cases.filter(c => c.status === 'approved').length,
      returned: cases.filter(c => c.status === 'returned').length,
      closed: cases.filter(c => c.status === 'closed').length,
    };
  }, [cases]);

  const refresh = useCallback(() => setCases(getAccessibleCases()), []);

  const toggleCaseSelection = useCallback((id: string, checked: boolean) => {
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (checked: boolean) => {
      setSelectedCaseIds(checked ? new Set(filteredCases.map(c => c.id)) : new Set());
    },
    [filteredCases],
  );

  const clearSelection = useCallback(() => setSelectedCaseIds(new Set()), []);

  return {
    cases,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterCrimeType,
    setFilterCrimeType,
    sortColumn,
    sortDir,
    selectedCaseIds,
    crimeTypes,
    filteredCases,
    handleSort,
    counts,
    refresh,
    toggleCaseSelection,
    selectAll,
    clearSelection,
  };
}
