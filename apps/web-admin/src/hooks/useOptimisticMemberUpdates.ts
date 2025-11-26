import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/services/user.service';
import { eventManager, EventType } from '@/services/event-manager.service';

export interface MemberUpdateEvent {
  member_id?: string;
  id?: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  data: {
    id: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    isActive?: boolean;
    role?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
  };
  timestamp?: string;
}

/**
 * Hook for optimistic member updates from socket events
 * Updates members in real-time without full page reload
 */
export function useOptimisticMemberUpdates(
  members: User[],
  setMembers: React.Dispatch<React.SetStateAction<User[]>>,
  setStats?: React.Dispatch<React.SetStateAction<{ total: number; active: number; inactive: number; newThisMonth: number } | null>>
) {
  const [updatedMemberIds, setUpdatedMemberIds] = useState<Set<string>>(new Set());
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Handle member:created event
  const handleMemberCreated = useCallback(
    (data: MemberUpdateEvent) => {
      console.log('🔔 [OPTIMISTIC_UPDATE] handleMemberCreated called with data:', data);
      
      // For member creation, we need user_id (not member_id) because MemberManagement uses User type
      const userId = data.data?.user_id || data.member_id || data.id || data.data?.id;
      if (!userId) {
        console.warn('⚠️ [OPTIMISTIC_UPDATE] member:created event missing user_id/member_id:', data);
        return;
      }

      console.log('✅ [OPTIMISTIC_UPDATE] Processing member:created for userId:', userId);

      const eventId = `member:created:${userId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) {
        console.log('⏭️ [OPTIMISTIC_UPDATE] Event already processed, skipping:', eventId);
        return;
      }
      processedEventsRef.current.add(eventId);

      setMembers(prev => {
        // Check if member already exists (by user id)
        const exists = prev.some(m => m.id === userId);
        if (exists) return prev;

        // Create new member from data
        // Backend sends full_name, so we need to split it or use user_id to fetch
        const fullName = data.data.full_name || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = data.data.firstName || data.data.first_name || (nameParts[0] || '');
        const lastName = data.data.lastName || data.data.last_name || (nameParts.slice(1).join(' ') || '');

        const newMember: User = {
          id: userId, // Use user_id as the User id (member management uses User, not Member)
          email: data.data.email || '',
          phone: data.data.phone || '',
          firstName: firstName,
          lastName: lastName,
          role: (data.data.role as any) || 'MEMBER',
          isActive: data.data.isActive ?? true,
          emailVerified: false,
          phoneVerified: false,
          createdAt: data.data.createdAt || data.timestamp || new Date().toISOString(),
          updatedAt: data.data.updatedAt || data.timestamp || new Date().toISOString(),
        };

        console.log('✅ [OPTIMISTIC_UPDATE] Adding new member optimistically:', newMember);
        return [newMember, ...prev];
      });

      // Update stats if provided
      if (setStats) {
        setStats(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            total: prev.total + 1,
            active: prev.active + 1,
            newThisMonth: prev.newThisMonth + 1,
          };
        });
      }

      // Mark member for animation
      setUpdatedMemberIds(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });

      // Remove animation class after animation completes
      setTimeout(() => {
        setUpdatedMemberIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setMembers, setStats]
  );

  // Handle member:updated event
  const handleMemberUpdated = useCallback(
    (data: MemberUpdateEvent) => {
      const memberId = data.member_id || data.id || data.data?.id;
      if (!memberId) return;

      const eventId = `member:updated:${memberId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setMembers(prev => {
        return prev.map(member => {
          if (member.id !== memberId) return member;

          // Update member with new data
          return {
            ...member,
            email: data.data.email ?? member.email,
            phone: data.data.phone ?? member.phone,
            firstName: (data.data.firstName || data.data.first_name) ?? member.firstName,
            lastName: (data.data.lastName || data.data.last_name) ?? member.lastName,
            isActive: data.data.isActive ?? member.isActive,
            role: (data.data.role as any) ?? member.role,
            updatedAt: data.data.updatedAt || data.timestamp || new Date().toISOString(),
            _updated: true,
          };
        });
      });

      // Mark member for animation
      setUpdatedMemberIds(prev => {
        const newSet = new Set(prev);
        newSet.add(memberId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedMemberIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(memberId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setMembers]
  );

  // Handle member:deleted event
  const handleMemberDeleted = useCallback(
    (data: MemberUpdateEvent) => {
      const memberId = data.member_id || data.id || data.data?.id;
      if (!memberId) return;

      const eventId = `member:deleted:${memberId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setMembers(prev => {
        const filtered = prev.filter(m => m.id !== memberId);
        return filtered;
      });

      // Update stats if provided
      if (setStats) {
        setStats(prev => {
          if (!prev) return prev;
          const deletedMember = members.find(m => m.id === memberId);
          return {
            ...prev,
            total: Math.max(0, prev.total - 1),
            active: deletedMember?.isActive ? Math.max(0, prev.active - 1) : prev.active,
            inactive: !deletedMember?.isActive ? Math.max(0, prev.inactive - 1) : prev.inactive,
          };
        });
      }

      processedEventsRef.current.delete(eventId);
    },
    [setMembers, setStats, members]
  );

  // Handle member:status_changed event
  const handleMemberStatusChanged = useCallback(
    (data: MemberUpdateEvent) => {
      const memberId = data.member_id || data.id || data.data?.id;
      if (!memberId) return;

      const eventId = `member:status_changed:${memberId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      const newStatus = data.data.isActive;
      if (newStatus === undefined) return;

      setMembers(prev => {
        return prev.map(member => {
          if (member.id !== memberId) return member;

          return {
            ...member,
            isActive: newStatus,
            updatedAt: data.data.updatedAt || data.timestamp || new Date().toISOString(),
            _updated: true,
          };
        });
      });

      // Update stats if provided
      if (setStats) {
        setStats(prev => {
          if (!prev) return prev;
          const member = members.find(m => m.id === memberId);
          if (!member) return prev;

          const wasActive = member.isActive;
          const isActive = newStatus;

          if (wasActive === isActive) return prev;

          return {
            ...prev,
            active: isActive ? prev.active + 1 : Math.max(0, prev.active - 1),
            inactive: !isActive ? prev.inactive + 1 : Math.max(0, prev.inactive - 1),
          };
        });
      }

      // Mark member for animation
      setUpdatedMemberIds(prev => {
        const newSet = new Set(prev);
        newSet.add(memberId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedMemberIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(memberId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setMembers, setStats, members]
  );

  // Setup event listeners using event manager
  useEffect(() => {
    const subscriptionIds: string[] = [];

    // Subscribe to member events
    subscriptionIds.push(
      eventManager.subscribe('member:created', (data) => {
        handleMemberCreated(data as MemberUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('member:updated', (data) => {
        handleMemberUpdated(data as MemberUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('member:deleted', (data) => {
        handleMemberDeleted(data as MemberUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('member:status_changed', (data) => {
        handleMemberStatusChanged(data as MemberUpdateEvent);
      })
    );

    // Cleanup
    return () => {
      subscriptionIds.forEach(id => {
        if (id) eventManager.unsubscribe(id);
      });
    };
  }, [handleMemberCreated, handleMemberUpdated, handleMemberDeleted, handleMemberStatusChanged]);

  return {
    updatedMemberIds,
  };
}

