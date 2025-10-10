import { useCallback, useEffect, useState } from 'react';
import { Member, MemberFilters, memberService } from '../services/member.service';

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    status: '',
    page: 1,
    limit: 20,
  });

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await memberService.getMembers(filters);
      setMembers(response.members);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch members');
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateFilters = useCallback((newFilters: Partial<MemberFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const changePage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const createMember = useCallback(async (memberData: Omit<Member, 'id' | 'joined_at'>) => {
    try {
      setLoading(true);
      await memberService.createMember(memberData);
      await fetchMembers(); // Refresh list
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to create member');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchMembers]);

  const updateMember = useCallback(async (id: string, updates: Partial<Member>) => {
    try {
      await memberService.updateMember(id, updates);
      await fetchMembers(); // Refresh list
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update member');
      return false;
    }
  }, [fetchMembers]);

  const deleteMember = useCallback(async (id: string) => {
    try {
      await memberService.deleteMember(id);
      await fetchMembers(); // Refresh list
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete member');
      return false;
    }
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    changePage,
    refetch: fetchMembers,
    createMember,
    updateMember,
    deleteMember,
  };
}