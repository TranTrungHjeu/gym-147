import {
  Calendar,
  CheckCircle2,
  Eye,
  Filter,
  History,
  Search,
  Send,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CountUp from 'react-countup';
import AdminCard from '../../components/common/AdminCard';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../../components/common/AdminTable';
import CustomSelect from '../../components/common/CustomSelect';
import Pagination from '../../components/common/Pagination';
import { EnumBadge } from '../../shared/components/ui';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { memberApi, scheduleApi } from '../../services/api';
import { eventManager } from '../../services/event-manager.service';
import { notificationService } from '../../services/notification.service';
import { formatVietnamDateTime } from '../../utils/dateTime';

type TabType = 'members' | 'trainers' | 'history';

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  membership_type: string;
  membership_status: string;
}

interface Trainer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: string;
  specializations: string[];
}

interface NotificationHistory {
  id: string;
  sender_id: string;
  sender_role: string;
  target_type: string;
  target_ids?: string[];
  filters?: any;
  title: string;
  message: string;
  notification_type: string;
  sent_count: number;
  failed_count: number;
  total_targets: number;
  created_at: string;
}

const NotificationManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Member notification form
  const [memberForm, setMemberForm] = useState({
    title: '',
    message: '',
    type: 'GENERAL',
    sendTo: 'all' as 'all' | 'filter' | 'specific',
    filters: {
      membership_type: '',
      membership_status: '',
      search: '',
    },
    member_ids: [] as string[],
  });

  // Trainer notification form
  const [trainerForm, setTrainerForm] = useState({
    title: '',
    message: '',
    type: 'GENERAL',
    sendTo: 'all' as 'all' | 'filter' | 'specific',
    filters: {
      status: '',
      specialization: '',
      search: '',
    },
    trainer_ids: [] as string[],
  });

  // Preview data
  const [memberPreviewList, setMemberPreviewList] = useState<Member[]>([]);
  const [trainerPreviewList, setTrainerPreviewList] = useState<Trainer[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewList, setShowPreviewList] = useState(false);
  const memberFormRef = useRef(memberForm);
  const trainerFormRef = useRef(trainerForm);
  const hasLoadedMembersRef = useRef(false);
  const hasLoadedTrainersRef = useRef(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    sentCount: number;
    failedCount: number;
    totalTargets: number;
    targetType: 'members' | 'trainers';
  } | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<NotificationHistory | null>(null);

  // History - Load all data once, paginate client-side
  const [allHistory, setAllHistory] = useState<NotificationHistory[]>([]);
  // History is now computed via useMemo, no longer needs state
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [historyFilters, setHistoryFilters] = useState({
    target_type: '',
    startDate: '',
    endDate: '',
  });

  // Fetch preview list for members
  const fetchMemberPreviewList = useCallback(async () => {
    // Use ref to get latest form values without causing re-renders
    const currentForm = memberFormRef.current;

    if (currentForm.sendTo === 'all') {
      try {
        setPreviewLoading(true);
        const response = await memberApi.get('/api/members/for-notification?limit=1000');
        if (response.data.success) {
          setMemberPreviewList(response.data.data.members || []);
        }
      } catch (error) {
        console.error('Error fetching all members:', error);
        setMemberPreviewList([]);
      } finally {
        setPreviewLoading(false);
      }
      return;
    }

    if (currentForm.sendTo === 'specific' && currentForm.member_ids.length === 0) {
      setMemberPreviewList([]);
      return;
    }

    if (
      currentForm.sendTo === 'filter' &&
      !currentForm.filters.membership_type &&
      !currentForm.filters.membership_status &&
      !currentForm.filters.search
    ) {
      setMemberPreviewList([]);
      return;
    }

    try {
      setPreviewLoading(true);
      const params = new URLSearchParams();
      if (currentForm.sendTo === 'filter') {
        if (currentForm.filters.membership_type)
          params.append('membership_type', currentForm.filters.membership_type);
        if (currentForm.filters.membership_status)
          params.append('status', currentForm.filters.membership_status);
        if (currentForm.filters.search) params.append('search', currentForm.filters.search);
      } else if (currentForm.sendTo === 'specific' && currentForm.member_ids.length > 0) {
        params.append('member_ids', currentForm.member_ids.join(','));
      }

      const response = await memberApi.get(`/api/members/for-notification?${params.toString()}`);
      if (response.data.success) {
        setMemberPreviewList(response.data.data.members || []);
      }
    } catch (error) {
      console.error('Error fetching member preview:', error);
      setMemberPreviewList([]);
    } finally {
      setPreviewLoading(false);
    }
  }, []); // No dependencies - use ref instead

  // Fetch preview list for trainers
  const fetchTrainerPreviewList = useCallback(async () => {
    // Use ref to get latest form values without causing re-renders
    const currentForm = trainerFormRef.current;

    if (currentForm.sendTo === 'all') {
      try {
        setPreviewLoading(true);
        const response = await scheduleApi.get('/trainers/for-notification');
        if (response.data.success) {
          setTrainerPreviewList(response.data.data.trainers || []);
        }
      } catch (error) {
        console.error('Error fetching all trainers:', error);
        setTrainerPreviewList([]);
      } finally {
        setPreviewLoading(false);
      }
      return;
    }

    if (currentForm.sendTo === 'specific' && currentForm.trainer_ids.length === 0) {
      setTrainerPreviewList([]);
      return;
    }

    if (
      currentForm.sendTo === 'filter' &&
      !currentForm.filters.status &&
      !currentForm.filters.specialization &&
      !currentForm.filters.search
    ) {
      setTrainerPreviewList([]);
      return;
    }

    try {
      setPreviewLoading(true);
      const params = new URLSearchParams();
      if (currentForm.sendTo === 'filter') {
        if (currentForm.filters.status) params.append('status', currentForm.filters.status);
        if (currentForm.filters.specialization)
          params.append('specialization', currentForm.filters.specialization);
        if (currentForm.filters.search) params.append('search', currentForm.filters.search);
      } else if (currentForm.sendTo === 'specific' && currentForm.trainer_ids.length > 0) {
        params.append('trainer_ids', currentForm.trainer_ids.join(','));
      }

      const response = await scheduleApi.get(`/trainers/for-notification?${params.toString()}`);
      if (response.data.success) {
        setTrainerPreviewList(response.data.data.trainers || []);
      }
    } catch (error) {
      console.error('Error fetching trainer preview:', error);
      setTrainerPreviewList([]);
    } finally {
      setPreviewLoading(false);
    }
  }, []); // No dependencies - use ref instead

  // Update refs when forms change
  useEffect(() => {
    memberFormRef.current = memberForm;
  }, [memberForm]);

  useEffect(() => {
    trainerFormRef.current = trainerForm;
  }, [trainerForm]);

  // Debounce preview fetch - only fetch when relevant fields change (not title/message/type/tab switch)
  useEffect(() => {
    if (activeTab !== 'members') return;

    const timer = setTimeout(() => {
      fetchMemberPreviewList();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    memberForm.sendTo,
    memberForm.filters.membership_type,
    memberForm.filters.membership_status,
    memberForm.filters.search,
    memberForm.member_ids.join(','),
    fetchMemberPreviewList,
  ]);

  useEffect(() => {
    if (activeTab !== 'trainers') return;

    const timer = setTimeout(() => {
      fetchTrainerPreviewList();
    }, 100);
    return () => clearTimeout(timer);
  }, [
    trainerForm.sendTo,
    trainerForm.filters.status,
    trainerForm.filters.specialization,
    trainerForm.filters.search,
    trainerForm.trainer_ids.join(','),
    fetchTrainerPreviewList,
  ]);

  // Load data when switching to tab for the first time
  useEffect(() => {
    if (activeTab === 'members' && !hasLoadedMembersRef.current) {
      hasLoadedMembersRef.current = true;
      const timer = setTimeout(() => {
        fetchMemberPreviewList();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchMemberPreviewList]);

  useEffect(() => {
    if (activeTab === 'trainers' && !hasLoadedTrainersRef.current) {
      hasLoadedTrainersRef.current = true;
      const timer = setTimeout(() => {
        fetchTrainerPreviewList();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchTrainerPreviewList]);

  // Optimistic updates via socket events
  useEffect(() => {
    // Subscribe to member:created event for optimistic updates
    const memberCreatedSubscription = eventManager.subscribe('member:created', (data: any) => {
      if (activeTab !== 'members') return;

      const memberData = data.data || data;
      const newMember: Member = {
        id: memberData.member_id || memberData.id,
        user_id: memberData.user_id || memberData.id,
        full_name:
          memberData.full_name ||
          `${memberData.first_name || ''} ${memberData.last_name || ''}`.trim() ||
          memberData.name,
        email: memberData.email || '',
        membership_type: memberData.membership_type || 'BASIC',
        membership_status: memberData.membership_status || 'ACTIVE',
      };

      setMemberPreviewList(prev => {
        // Check if member already exists
        const exists = prev.some(m => m.id === newMember.id || m.user_id === newMember.user_id);
        if (exists) return prev;

        // Add new member if matches current filters
        const currentForm = memberFormRef.current;
        if (currentForm.sendTo === 'all') {
          return [newMember, ...prev];
        }

        if (currentForm.sendTo === 'filter') {
          const matchesFilter =
            (!currentForm.filters.membership_type ||
              newMember.membership_type === currentForm.filters.membership_type) &&
            (!currentForm.filters.membership_status ||
              newMember.membership_status === currentForm.filters.membership_status) &&
            (!currentForm.filters.search ||
              newMember.full_name
                .toLowerCase()
                .includes(currentForm.filters.search.toLowerCase()) ||
              newMember.email.toLowerCase().includes(currentForm.filters.search.toLowerCase()));

          if (matchesFilter) {
            return [newMember, ...prev];
          }
        }

        return prev;
      });
    });

    // Subscribe to member:updated event
    const memberUpdatedSubscription = eventManager.subscribe('member:updated', (data: any) => {
      if (activeTab !== 'members') return;

      const memberData = data.data || data;
      const memberId = memberData.member_id || memberData.id;

      setMemberPreviewList(prev => {
        return prev.map(member => {
          if (member.id !== memberId && member.user_id !== memberData.user_id) return member;

          return {
            ...member,
            full_name: memberData.full_name || member.full_name,
            email: memberData.email || member.email,
            membership_type: memberData.membership_type || member.membership_type,
            membership_status: memberData.membership_status || member.membership_status,
          };
        });
      });
    });

    // Subscribe to trainer:created event for optimistic updates
    const trainerCreatedSubscription = eventManager.subscribe('trainer:created', (data: any) => {
      if (activeTab !== 'trainers') return;

      const trainerData = data.data || data;
      const newTrainer: Trainer = {
        id: trainerData.trainer_id || trainerData.id,
        user_id: trainerData.user_id || trainerData.id,
        full_name: trainerData.full_name || trainerData.name || '',
        email: trainerData.email || '',
        status: trainerData.status || 'ACTIVE',
        specializations: trainerData.specializations || [],
      };

      setTrainerPreviewList(prev => {
        // Check if trainer already exists
        const exists = prev.some(t => t.id === newTrainer.id || t.user_id === newTrainer.user_id);
        if (exists) return prev;

        // Add new trainer if matches current filters
        const currentForm = trainerFormRef.current;
        if (currentForm.sendTo === 'all') {
          return [newTrainer, ...prev];
        }

        if (currentForm.sendTo === 'filter') {
          const matchesFilter =
            (!currentForm.filters.status || newTrainer.status === currentForm.filters.status) &&
            (!currentForm.filters.specialization ||
              newTrainer.specializations.includes(currentForm.filters.specialization)) &&
            (!currentForm.filters.search ||
              newTrainer.full_name
                .toLowerCase()
                .includes(currentForm.filters.search.toLowerCase()) ||
              (newTrainer.email &&
                newTrainer.email
                  .toLowerCase()
                  .includes(currentForm.filters.search.toLowerCase())) ||
              (newTrainer.phone &&
                newTrainer.phone.toLowerCase().includes(currentForm.filters.search.toLowerCase())));

          if (matchesFilter) {
            return [newTrainer, ...prev];
          }
        }

        return prev;
      });
    });

    // Subscribe to trainer:updated event
    const trainerUpdatedSubscription = eventManager.subscribe('trainer:updated', (data: any) => {
      if (activeTab !== 'trainers') return;

      const trainerData = data.data || data;
      const trainerId = trainerData.trainer_id || trainerData.id;

      setTrainerPreviewList(prev => {
        return prev.map(trainer => {
          if (trainer.id !== trainerId && trainer.user_id !== trainerData.user_id) return trainer;

          return {
            ...trainer,
            full_name: trainerData.full_name || trainer.full_name,
            email: trainerData.email || trainer.email,
            status: trainerData.status || trainer.status,
            specializations: trainerData.specializations || trainer.specializations,
          };
        });
      });
    });

    // Cleanup subscriptions
    return () => {
      eventManager.unsubscribe(memberCreatedSubscription);
      eventManager.unsubscribe(memberUpdatedSubscription);
      eventManager.unsubscribe(trainerCreatedSubscription);
      eventManager.unsubscribe(trainerUpdatedSubscription);
    };
  }, [activeTab]);

  // Client-side filtering and pagination - use useMemo to prevent layout shift
  const filteredHistory = useMemo(() => {
    if (activeTab !== 'history' || allHistory.length === 0) return [];

    let filtered = [...allHistory];

    // Filter by target_type
    if (historyFilters.target_type) {
      filtered = filtered.filter(item => item.target_type === historyFilters.target_type);
    }

    // Filter by date range
    if (historyFilters.startDate) {
      const startDate = new Date(historyFilters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate >= startDate;
      });
    }

    if (historyFilters.endDate) {
      const endDate = new Date(historyFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate <= endDate;
      });
    }

    return filtered;
  }, [activeTab, allHistory, historyFilters]);

  // Animated number component using react-countup - prevents card re-render
  const AnimatedNumber = React.memo<{ value: number }>(
    ({ value }) => {
      return (
        <CountUp
          end={value}
          duration={0.5}
          separator=','
          decimals={0}
          preserveValue={true}
          enableScrollSpy={false}
        />
      );
    },
    (prevProps, nextProps) => {
      // Only re-render if value actually changed
      return prevProps.value === nextProps.value;
    }
  );

  // Memoize statistics - use filteredHistory for accurate totals based on current filters
  const historyStats = useMemo(() => {
    if (filteredHistory.length === 0 && allHistory.length === 0) return null;
    const dataToUse = filteredHistory.length > 0 ? filteredHistory : allHistory;
    return {
      total: dataToUse.length,
      totalSent: dataToUse.reduce(
        (sum: number, item: NotificationHistory) => sum + item.sent_count,
        0
      ),
      totalSuccess: dataToUse.reduce(
        (sum: number, item: NotificationHistory) => sum + item.sent_count,
        0
      ),
      totalFailed: dataToUse.reduce(
        (sum: number, item: NotificationHistory) => sum + item.failed_count,
        0
      ),
    };
  }, [filteredHistory, allHistory]);

  // Track if we need to fetch from API (only on initial load or when explicitly needed)
  const needsInitialLoad = useRef(true);

  // Load all history data once (no pagination on server)
  const loadHistory = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      // Load all data without pagination - fetch all records, filtering will be done client-side
      const response = await notificationService.getNotificationHistory({
        page: 1,
        limit: 10000, // Load all records
        // Don't pass filters to API - we'll filter client-side for instant response
      });

      if (response.success && response.data) {
        const allHistoryData = response.data.history || [];
        setAllHistory(allHistoryData);
        // Update total for pagination display
        setHistoryPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || allHistoryData.length,
          pages: Math.ceil((response.data.pagination?.total || allHistoryData.length) / prev.limit),
        }));
        needsInitialLoad.current = false;
      }
    } catch (error: any) {
      showToast(t('notificationManagement.messages.loadHistoryError'), 'error');
      console.error('Error loading history:', error);
      setAllHistory([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Load history only when tab changes to history (initial load)
  useEffect(() => {
    if (activeTab === 'history' && needsInitialLoad.current) {
      loadHistory(true);
    }
  }, [activeTab, loadHistory]);

  // Client-side pagination - use useMemo to prevent unnecessary re-renders
  const history = useMemo(() => {
    if (activeTab !== 'history' || filteredHistory.length === 0) return [];
    const startIndex = (historyPagination.page - 1) * historyPagination.limit;
    const endIndex = startIndex + historyPagination.limit;
    return filteredHistory.slice(startIndex, endIndex);
  }, [activeTab, filteredHistory, historyPagination.page, historyPagination.limit]);

  // Update pagination totals when filtered history changes
  useEffect(() => {
    if (activeTab === 'history') {
      setHistoryPagination(prev => ({
        ...prev,
        total: filteredHistory.length,
        pages: Math.ceil(filteredHistory.length / prev.limit),
      }));
    }
  }, [activeTab, filteredHistory.length]);

  // Add custom animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes pulseSlow {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      @keyframes tabSlideIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .tab-content-enter {
        animation: tabSlideIn 0.3s ease-out forwards;
      }

      .animate-fade-in-up {
        animation: fadeInUp 0.6s ease-out forwards;
        opacity: 0;
      }

      .animate-fade-in {
        animation: fadeIn 0.5s ease-out forwards;
        opacity: 0;
      }

      .animate-fade-in-scale {
        animation: fadeInScale 0.5s ease-out forwards;
        opacity: 0;
      }

      .animate-slide-in-left {
        animation: slideInLeft 0.4s ease-out forwards;
        opacity: 0;
      }

      .animate-pulse-slow {
        animation: pulseSlow 3s ease-in-out infinite;
      }

      @keyframes modalFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes modalSlideUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .animate-modal-fade-in {
        animation: modalFadeIn 0.2s ease-out forwards;
      }

      .animate-modal-slide-up {
        animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }

      .custom-scrollbar::-webkit-scrollbar {
        width: 0px;
        background: transparent;
      }

      .custom-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .custom-scrollbar:hover::-webkit-scrollbar {
        width: 6px;
      }

      .custom-scrollbar:hover::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }

      .custom-scrollbar:hover::-webkit-scrollbar-thumb {
        background: rgba(249, 115, 22, 0.3);
        border-radius: 3px;
        transition: background 0.2s;
      }

      .custom-scrollbar:hover::-webkit-scrollbar-thumb:hover {
        background: rgba(249, 115, 22, 0.5);
      }

      .dark .custom-scrollbar:hover::-webkit-scrollbar-thumb {
        background: rgba(249, 115, 22, 0.4);
      }

      .dark .custom-scrollbar:hover::-webkit-scrollbar-thumb:hover {
        background: rgba(249, 115, 22, 0.6);
      }

      /* Show scrollbar when scrolling */
      .custom-scrollbar.scrolling::-webkit-scrollbar {
        width: 6px;
      }

      .custom-scrollbar.scrolling::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }

      .custom-scrollbar.scrolling::-webkit-scrollbar-thumb {
        background: rgba(249, 115, 22, 0.4);
        border-radius: 3px;
      }
    `;
    style.setAttribute('data-notification-animations', 'true');

    if (!document.head.querySelector('style[data-notification-animations]')) {
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.head.querySelector('style[data-notification-animations]');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Send notification to members
  const handleSendToMembers = async () => {
    if (!memberForm.title || !memberForm.message) {
      showToast(t('notificationManagement.messages.fillRequiredFields'), 'error');
      return;
    }

    if (
      memberForm.sendTo === 'filter' &&
      !memberForm.filters.membership_type &&
      !memberForm.filters.membership_status &&
      !memberForm.filters.search
    ) {
      showToast(t('notificationManagement.messages.selectAtLeastOneFilter'), 'error');
      return;
    }

    if (memberForm.sendTo === 'specific' && memberForm.member_ids.length === 0) {
      showToast(t('notificationManagement.messages.enterAtLeastOneMemberId'), 'error');
      return;
    }

    try {
      setSending(true);
      // When sending to "all", send empty filters object to indicate all members
      const requestData: any = {
        title: memberForm.title,
        message: memberForm.message,
        type: memberForm.type,
      };

      if (memberForm.sendTo === 'all') {
        // Send empty filters to indicate "all members"
        requestData.filters = {};
      } else if (memberForm.sendTo === 'filter') {
        requestData.filters = memberForm.filters;
      } else if (memberForm.sendTo === 'specific') {
        requestData.member_ids = memberForm.member_ids;
      }

      const response = await notificationService.sendBulkNotificationToMembers(requestData);

      console.log('[STATS] [NOTIFICATION] Response:', response);

      if (response.success) {
        console.log('[SUCCESS] [NOTIFICATION] Success! Setting modal data:', {
          sentCount: response.data.sent_count || 0,
          failedCount: response.data.failed_count || 0,
          totalTargets: response.data.total_targets || 0,
        });

        // Show success modal
        setSuccessData({
          sentCount: response.data.sent_count || 0,
          failedCount: response.data.failed_count || 0,
          totalTargets: response.data.total_targets || 0,
          targetType: 'members',
        });
        setShowSuccessModal(true);

        console.log('[SUCCESS] [NOTIFICATION] Modal state set:', {
          showSuccessModal: true,
          successData: {
            sentCount: response.data.sent_count || 0,
            failedCount: response.data.failed_count || 0,
            totalTargets: response.data.total_targets || 0,
            targetType: 'members',
          },
        });

        // Reset form but keep preview list if sendTo is 'all'
        const wasSendingToAll = memberForm.sendTo === 'all';
        setMemberForm({
          title: '',
          message: '',
          type: 'GENERAL',
          sendTo: 'all',
          filters: {
            membership_type: '',
            membership_status: '',
            search: '',
          },
          member_ids: [],
        });

        // Only clear preview list if not sending to all
        if (!wasSendingToAll) {
          setMemberPreviewList([]);
          setShowPreviewList(false);
        }
        // If sending to all, keep the preview list visible
      } else {
        showToast(t('notificationManagement.messages.sendFailed'), 'error');
      }
    } catch (error: any) {
      showToast(error.message || t('notificationManagement.messages.sendFailed'), 'error');
      console.error('Error sending notification:', error);
    } finally {
      setSending(false);
    }
  };

  // Send notification to trainers
  const handleSendToTrainers = async () => {
    if (!trainerForm.title || !trainerForm.message) {
      showToast(t('notificationManagement.messages.fillRequiredFields'), 'error');
      return;
    }

    if (
      trainerForm.sendTo === 'filter' &&
      !trainerForm.filters.status &&
      !trainerForm.filters.specialization &&
      !trainerForm.filters.search
    ) {
      showToast(t('notificationManagement.messages.selectAtLeastOneFilter'), 'error');
      return;
    }

    if (trainerForm.sendTo === 'specific' && trainerForm.trainer_ids.length === 0) {
      showToast(t('notificationManagement.messages.enterAtLeastOneTrainerId'), 'error');
      return;
    }

    try {
      setSending(true);
      // When sending to "all", send empty filters object to indicate all trainers
      const requestData: any = {
        title: trainerForm.title,
        message: trainerForm.message,
        type: trainerForm.type,
      };

      if (trainerForm.sendTo === 'all') {
        // Send empty filters to indicate "all trainers"
        requestData.filters = {};
      } else if (trainerForm.sendTo === 'filter') {
        requestData.filters = trainerForm.filters;
      } else if (trainerForm.sendTo === 'specific') {
        requestData.trainer_ids = trainerForm.trainer_ids;
      }

      const response = await notificationService.sendBulkNotificationToTrainers(requestData);

      console.log('[STATS] [NOTIFICATION] Response:', response);

      if (response.success) {
        console.log('[SUCCESS] [NOTIFICATION] Success! Setting modal data:', {
          sentCount: response.data.sent_count || 0,
          failedCount: response.data.failed_count || 0,
          totalTargets: response.data.total_targets || 0,
        });

        // Show success modal
        setSuccessData({
          sentCount: response.data.sent_count || 0,
          failedCount: response.data.failed_count || 0,
          totalTargets: response.data.total_targets || 0,
          targetType: 'trainers',
        });
        setShowSuccessModal(true);

        console.log('[SUCCESS] [NOTIFICATION] Modal state set:', {
          showSuccessModal: true,
          successData: {
            sentCount: response.data.sent_count || 0,
            failedCount: response.data.failed_count || 0,
            totalTargets: response.data.total_targets || 0,
            targetType: 'trainers',
          },
        });

        // Reset form but keep preview list if sendTo is 'all'
        const wasSendingToAll = trainerForm.sendTo === 'all';
        setTrainerForm({
          title: '',
          message: '',
          type: 'GENERAL',
          sendTo: 'all',
          filters: {
            status: '',
            specialization: '',
            search: '',
          },
          trainer_ids: [],
        });

        // Only clear preview list if not sending to all
        if (!wasSendingToAll) {
          setTrainerPreviewList([]);
          setShowPreviewList(false);
        }
        // If sending to all, keep the preview list visible
      } else {
        showToast(t('notificationManagement.messages.sendFailed'), 'error');
      }
    } catch (error: any) {
      showToast(error.message || t('notificationManagement.messages.sendFailed'), 'error');
      console.error('Error sending notification:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            {t('notificationManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            {t('notificationManagement.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <AdminCard className='p-1'>
        <div className='flex space-x-1'>
          <button
            onClick={() => {
              if (activeTab !== 'members') {
                setIsTabTransitioning(true);
                setTimeout(() => {
                  setActiveTab('members');
                  setShowPreviewList(false);
                  setTimeout(() => setIsTabTransitioning(false), 50);
                }, 150);
              }
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'members'
                ? 'bg-orange-500 text-white shadow-sm scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105'
            }`}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <div className='flex items-center justify-center space-x-2'>
              <Users
                className={`w-4 h-4 transition-transform duration-300 ${
                  activeTab === 'members' ? 'scale-110' : ''
                }`}
              />
              <span>{t('notificationManagement.tabs.members')}</span>
            </div>
          </button>
          <button
            onClick={() => {
              if (activeTab !== 'trainers') {
                setIsTabTransitioning(true);
                setTimeout(() => {
                  setActiveTab('trainers');
                  setShowPreviewList(false);
                  setTimeout(() => setIsTabTransitioning(false), 50);
                }, 150);
              }
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'trainers'
                ? 'bg-orange-500 text-white shadow-sm scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105'
            }`}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <div className='flex items-center justify-center space-x-2'>
              <UserCheck
                className={`w-4 h-4 transition-transform duration-300 ${
                  activeTab === 'trainers' ? 'scale-110' : ''
                }`}
              />
              <span>{t('notificationManagement.tabs.trainers')}</span>
            </div>
          </button>
          <button
            onClick={() => {
              if (activeTab !== 'history') {
                setIsTabTransitioning(true);
                setTimeout(() => {
                  setActiveTab('history');
                  setShowPreviewList(false);
                  setTimeout(() => setIsTabTransitioning(false), 50);
                }, 150);
              }
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'history'
                ? 'bg-orange-500 text-white shadow-sm scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105'
            }`}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <div className='flex items-center justify-center space-x-2'>
              <History
                className={`w-4 h-4 transition-transform duration-300 ${
                  activeTab === 'history' ? 'scale-110' : ''
                }`}
              />
              <span>{t('notificationManagement.tabs.history')}</span>
            </div>
          </button>
        </div>
      </AdminCard>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <div
          className={`grid grid-cols-1 lg:grid-cols-3 gap-3 transition-all duration-300 ${
            isTabTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Form Section */}
          <div className='lg:col-span-2'>
            <AdminCard>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                    {t('notificationManagement.form.title')} <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={memberForm.title}
                    onChange={e => setMemberForm({ ...memberForm, title: e.target.value })}
                    className='w-full h-[30px] px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                    placeholder={t('notificationManagement.form.titlePlaceholder')}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                    {t('notificationManagement.form.message')}{' '}
                    <span className='text-red-500'>*</span>
                  </label>
                  <textarea
                    value={memberForm.message}
                    onChange={e => setMemberForm({ ...memberForm, message: e.target.value })}
                    rows={4}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                    placeholder={t('notificationManagement.form.messagePlaceholder')}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                    {t('notificationManagement.form.type')}
                  </label>
                  <div className='w-full'>
                    <CustomSelect
                      value={memberForm.type}
                      onChange={value => setMemberForm({ ...memberForm, type: value })}
                      options={[
                        { value: 'GENERAL', label: t('notificationManagement.types.GENERAL') },
                        {
                          value: 'SYSTEM_ANNOUNCEMENT',
                          label: t('notificationManagement.types.SYSTEM_ANNOUNCEMENT'),
                        },
                      ]}
                      className='w-full'
                    />
                  </div>
                </div>

                {/* Send To Options */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('notificationManagement.form.sendTo')}
                  </label>
                  <div className='grid grid-cols-3 gap-2'>
                    <button
                      onClick={() => setMemberForm({ ...memberForm, sendTo: 'all' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        memberForm.sendTo === 'all'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t('notificationManagement.sendTo.all')}
                    </button>
                    <button
                      onClick={() => setMemberForm({ ...memberForm, sendTo: 'filter' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        memberForm.sendTo === 'filter'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t('notificationManagement.sendTo.filter')}
                    </button>
                    <button
                      onClick={() => setMemberForm({ ...memberForm, sendTo: 'specific' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        memberForm.sendTo === 'specific'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t('notificationManagement.sendTo.specific')}
                    </button>
                  </div>
                </div>

                {/* Filter Section */}
                {memberForm.sendTo === 'filter' && (
                  <div className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center space-x-2'>
                        <Filter className='w-4 h-4 text-orange-500' />
                        <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
                          {t('notificationManagement.filters.title')}
                        </h3>
                      </div>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                      <div>
                        <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'>
                          {t('notificationManagement.filters.membershipType')}
                        </label>
                        <CustomSelect
                          value={memberForm.filters.membership_type}
                          onChange={value =>
                            setMemberForm({
                              ...memberForm,
                              filters: { ...memberForm.filters, membership_type: value },
                            })
                          }
                          options={[
                            { value: '', label: t('common.all') },
                            { value: 'BASIC', label: t('common.membershipTypes.BASIC') },
                            { value: 'PREMIUM', label: t('common.membershipTypes.PREMIUM') },
                            { value: 'VIP', label: t('common.membershipTypes.VIP') },
                            { value: 'STUDENT', label: t('common.membershipTypes.STUDENT') },
                          ]}
                          className='w-full'
                        />
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'>
                          {t('notificationManagement.filters.status')}
                        </label>
                        <CustomSelect
                          value={memberForm.filters.membership_status}
                          onChange={value =>
                            setMemberForm({
                              ...memberForm,
                              filters: { ...memberForm.filters, membership_status: value },
                            })
                          }
                          options={[
                            { value: '', label: t('common.all') },
                            { value: 'ACTIVE', label: t('common.status.ACTIVE') },
                            { value: 'EXPIRED', label: t('common.status.EXPIRED') },
                            { value: 'SUSPENDED', label: t('common.status.SUSPENDED') },
                          ]}
                          className='w-full'
                        />
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'>
                          {t('notificationManagement.filters.search')}
                        </label>
                        <div className='relative'>
                          <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                          <input
                            type='text'
                            value={memberForm.filters.search}
                            onChange={e =>
                              setMemberForm({
                                ...memberForm,
                                filters: { ...memberForm.filters, search: e.target.value },
                              })
                            }
                            className='w-full h-[30px] pl-8 pr-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                            placeholder={t('notificationManagement.filters.searchPlaceholder')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific IDs Section */}
                {memberForm.sendTo === 'specific' && (
                  <div className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t('notificationManagement.form.memberIds')}
                    </label>
                    <input
                      type='text'
                      value={memberForm.member_ids.join(',')}
                      onChange={e =>
                        setMemberForm({
                          ...memberForm,
                          member_ids: e.target.value
                            .split(',')
                            .map(id => id.trim())
                            .filter(id => id),
                        })
                      }
                      className='w-full h-[30px] px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                      placeholder={t('notificationManagement.form.memberIdsPlaceholder')}
                    />
                  </div>
                )}

                <button
                  onClick={handleSendToMembers}
                  disabled={sending || !memberForm.title || !memberForm.message}
                  className='w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all duration-200 text-sm'
                >
                  <Send className='w-4 h-4' />
                  <span>
                    {sending
                      ? t('notificationManagement.actions.sending')
                      : t('notificationManagement.actions.send')}
                  </span>
                </button>
              </div>
            </AdminCard>
          </div>

          {/* Preview Section */}
          <div className='lg:col-span-1'>
            <AdminCard>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center space-x-2'>
                    <Eye className='w-4 h-4 text-orange-500' />
                    <span>{t('notificationManagement.preview.title')}</span>
                  </h3>
                  {memberPreviewList.length > 0 && (
                    <button
                      onClick={() => setShowPreviewList(!showPreviewList)}
                      className='text-xs text-orange-600 dark:text-orange-400 hover:underline'
                    >
                      {showPreviewList
                        ? t('notificationManagement.preview.collapseList')
                        : t('notificationManagement.preview.expandList')}
                    </button>
                  )}
                </div>

                {previewLoading ? (
                  <div className='flex flex-col items-center justify-center p-8 animate-fade-in'>
                    <div className='relative'>
                      <div className='animate-spin rounded-full h-8 w-8 border-3 border-orange-200 dark:border-orange-800 border-t-orange-500'></div>
                      <div className='absolute inset-0 animate-ping rounded-full border-2 border-orange-400 opacity-20'></div>
                    </div>
                    <span className='mt-3 text-xs font-medium text-gray-600 dark:text-gray-400'>
                      {t('notificationManagement.preview.loading')}
                    </span>
                  </div>
                ) : memberPreviewList.length > 0 ? (
                  <>
                    <div className='p-3.5 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-700/50 shadow-sm animate-fade-in-up'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2.5'>
                          <div className='p-1.5 bg-orange-200 dark:bg-orange-800/50 rounded-lg'>
                            <CheckCircle2 className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                          </div>
                          <div>
                            <p className='text-[10px] font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide'>
                              {t('notificationManagement.members.preview.willSendTo')}
                            </p>
                            <p className='text-base font-bold text-orange-900 dark:text-orange-100 font-heading'>
                              {t('notificationManagement.members.preview.count', {
                                count: memberPreviewList.length,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {showPreviewList && (
                      <div className='max-h-[500px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl custom-scrollbar shadow-inner bg-gray-50/50 dark:bg-gray-900/50'>
                        <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                          {memberPreviewList.slice(0, 100).map((member, index) => (
                            <div
                              key={member.id || index}
                              className='group p-2.5 hover:bg-gradient-to-r hover:from-orange-50 hover:to-white dark:hover:from-orange-900/20 dark:hover:to-gray-800 transition-all duration-200 animate-fade-in-up hover:shadow-sm border-l-2 border-l-transparent hover:border-l-orange-500'
                              style={{ animationDelay: `${index * 15}ms` }}
                            >
                              <div className='flex items-center justify-between gap-3'>
                                <div className='flex items-center gap-2.5 flex-1 min-w-0'>
                                  <div className='flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-600 dark:to-orange-800 flex items-center justify-center text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform duration-200'>
                                    {member.full_name?.charAt(0)?.toUpperCase() || 'M'}
                                  </div>
                                  <p className='text-xs font-semibold text-gray-900 dark:text-white truncate font-inter group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                                    {member.full_name}
                                  </p>
                                </div>
                                <div className='flex items-center gap-1.5 flex-shrink-0'>
                                  <span className='text-[9px] px-2 py-1 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-700 dark:text-blue-300 font-semibold whitespace-nowrap border border-blue-200 dark:border-blue-700/50 shadow-sm group-hover:scale-105 transition-transform duration-200'>
                                    {member.membership_type}
                                  </span>
                                  <span
                                    className={`text-[9px] px-2 py-1 rounded-full font-semibold whitespace-nowrap border shadow-sm group-hover:scale-105 transition-transform duration-200 ${
                                      member.membership_status === 'ACTIVE'
                                        ? 'bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/50'
                                        : member.membership_status === 'EXPIRED'
                                        ? 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50'
                                        : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                                    }`}
                                  >
                                    {member.membership_status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {memberPreviewList.length > 100 && (
                            <div className='p-3 text-center'>
                              <span className='inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 animate-fade-in'>
                                <Users className='w-3 h-3 mr-1.5' />
                                {t('notificationManagement.members.preview.moreMembers', {
                                  count: memberPreviewList.length - 100,
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className='flex flex-col items-center justify-center p-8 text-center animate-fade-in'>
                    <div className='p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3'>
                      <Users className='w-6 h-6 text-gray-400 dark:text-gray-600' />
                    </div>
                    <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                      {t('notificationManagement.preview.noData')}
                    </p>
                    <p className='text-[10px] text-gray-400 dark:text-gray-500 mt-1'>
                      {t('notificationManagement.filters.selectFilterOrIds')}
                    </p>
                  </div>
                )}
              </div>
            </AdminCard>
          </div>
        </div>
      )}

      {activeTab === 'trainers' && (
        <div
          className={`grid grid-cols-1 lg:grid-cols-3 gap-3 transition-all duration-300 ${
            isTabTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Form Section */}
          <div className='lg:col-span-2'>
            <AdminCard>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                    {t('notificationManagement.trainers.form.title')}{' '}
                    <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={trainerForm.title}
                    onChange={e => setTrainerForm({ ...trainerForm, title: e.target.value })}
                    className='w-full h-[30px] px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                    placeholder={t('notificationManagement.form.titlePlaceholder')}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                    {t('notificationManagement.trainers.form.message')}{' '}
                    <span className='text-red-500'>*</span>
                  </label>
                  <textarea
                    value={trainerForm.message}
                    onChange={e => setTrainerForm({ ...trainerForm, message: e.target.value })}
                    rows={4}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                    placeholder={t('notificationManagement.form.messagePlaceholder')}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                    {t('notificationManagement.trainers.form.type')}
                  </label>
                  <div className='w-full'>
                    <CustomSelect
                      value={trainerForm.type}
                      onChange={value => setTrainerForm({ ...trainerForm, type: value })}
                      options={[
                        { value: 'GENERAL', label: t('notificationManagement.types.GENERAL') },
                        {
                          value: 'SYSTEM_ANNOUNCEMENT',
                          label: t('notificationManagement.types.SYSTEM_ANNOUNCEMENT'),
                        },
                      ]}
                      className='w-full'
                    />
                  </div>
                </div>

                {/* Send To Options */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('notificationManagement.trainers.form.sendTo')}
                  </label>
                  <div className='grid grid-cols-3 gap-2'>
                    <button
                      onClick={() => setTrainerForm({ ...trainerForm, sendTo: 'all' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        trainerForm.sendTo === 'all'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t('notificationManagement.trainers.form.all')}
                    </button>
                    <button
                      onClick={() => setTrainerForm({ ...trainerForm, sendTo: 'filter' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        trainerForm.sendTo === 'filter'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t('notificationManagement.trainers.form.filter')}
                    </button>
                    <button
                      onClick={() => setTrainerForm({ ...trainerForm, sendTo: 'specific' })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        trainerForm.sendTo === 'specific'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t('notificationManagement.trainers.form.specific')}
                    </button>
                  </div>
                </div>

                {/* Filter Section */}
                {trainerForm.sendTo === 'filter' && (
                  <div className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center space-x-2'>
                        <Filter className='w-4 h-4 text-orange-500' />
                        <h3 className='text-sm font-semibold text-gray-900 dark:text-white font-heading'>
                          {t('notificationManagement.trainers.filters.title')}
                        </h3>
                      </div>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                      <div>
                        <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                          {t('notificationManagement.trainers.filters.search')}
                        </label>
                        <div className='relative'>
                          <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                          <input
                            type='text'
                            value={trainerForm.filters.search || ''}
                            onChange={e =>
                              setTrainerForm({
                                ...trainerForm,
                                filters: { ...trainerForm.filters, search: e.target.value },
                              })
                            }
                            className='w-full h-[30px] pl-8 pr-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                            placeholder={t(
                              'notificationManagement.trainers.filters.searchPlaceholder'
                            )}
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                          {t('notificationManagement.trainers.filters.statusLabel')}
                        </label>
                        <CustomSelect
                          value={trainerForm.filters.status}
                          onChange={value =>
                            setTrainerForm({
                              ...trainerForm,
                              filters: { ...trainerForm.filters, status: value },
                            })
                          }
                          options={[
                            { value: '', label: t('common.all') },
                            { value: 'ACTIVE', label: t('common.trainerStatus.active') },
                            { value: 'INACTIVE', label: t('common.trainerStatus.inactive') },
                            { value: 'ON_LEAVE', label: t('common.trainerStatus.onLeave') },
                            { value: 'TERMINATED', label: t('common.trainerStatus.terminated') },
                          ]}
                          className='w-full'
                        />
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-inter'>
                          {t('notificationManagement.trainers.filters.specializationLabel')}
                        </label>
                        <CustomSelect
                          value={trainerForm.filters.specialization}
                          onChange={value =>
                            setTrainerForm({
                              ...trainerForm,
                              filters: { ...trainerForm.filters, specialization: value },
                            })
                          }
                          options={[
                            { value: '', label: t('common.all') },
                            { value: 'CARDIO', label: t('common.classCategory.cardio') },
                            { value: 'STRENGTH', label: t('common.classCategory.strength') },
                            { value: 'YOGA', label: t('common.classCategory.yoga') },
                            { value: 'PILATES', label: t('common.classCategory.pilates') },
                            { value: 'DANCE', label: t('common.classCategory.dance') },
                            { value: 'MARTIAL_ARTS', label: t('common.classCategory.martialArts') },
                            { value: 'AQUA', label: t('common.classCategory.aqua') },
                            { value: 'FUNCTIONAL', label: t('common.classCategory.functional') },
                            { value: 'RECOVERY', label: t('common.classCategory.recovery') },
                            { value: 'SPECIALIZED', label: t('common.classCategory.specialized') },
                          ]}
                          className='w-full'
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific IDs Section */}
                {trainerForm.sendTo === 'specific' && (
                  <div className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t('notificationManagement.form.trainerIds')}
                    </label>
                    <input
                      type='text'
                      value={trainerForm.trainer_ids.join(',')}
                      onChange={e =>
                        setTrainerForm({
                          ...trainerForm,
                          trainer_ids: e.target.value
                            .split(',')
                            .map(id => id.trim())
                            .filter(id => id),
                        })
                      }
                      className='w-full h-[30px] px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                      placeholder={t('notificationManagement.form.trainerIdsPlaceholder')}
                    />
                  </div>
                )}

                <button
                  onClick={handleSendToTrainers}
                  disabled={sending || !trainerForm.title || !trainerForm.message}
                  className='w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all duration-200 text-sm'
                >
                  <Send className='w-4 h-4' />
                  <span>
                    {sending
                      ? t('notificationManagement.actions.sending')
                      : t('notificationManagement.actions.send')}
                  </span>
                </button>
              </div>
            </AdminCard>
          </div>

          {/* Preview Section */}
          <div className='lg:col-span-1'>
            <AdminCard>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center space-x-2'>
                    <Eye className='w-4 h-4 text-orange-500' />
                    <span>Xem trước</span>
                  </h3>
                  {trainerPreviewList.length > 0 && (
                    <button
                      onClick={() => setShowPreviewList(!showPreviewList)}
                      className='text-xs text-orange-600 dark:text-orange-400 hover:underline'
                    >
                      {showPreviewList
                        ? t('notificationManagement.preview.collapseList')
                        : t('notificationManagement.preview.expandList')}
                    </button>
                  )}
                </div>

                {previewLoading ? (
                  <div className='flex flex-col items-center justify-center p-8 animate-fade-in'>
                    <div className='relative'>
                      <div className='animate-spin rounded-full h-8 w-8 border-3 border-orange-200 dark:border-orange-800 border-t-orange-500'></div>
                      <div className='absolute inset-0 animate-ping rounded-full border-2 border-orange-400 opacity-20'></div>
                    </div>
                    <span className='mt-3 text-xs font-medium text-gray-600 dark:text-gray-400'>
                      {t('notificationManagement.preview.loading')}
                    </span>
                  </div>
                ) : trainerPreviewList.length > 0 ? (
                  <>
                    <div className='p-3.5 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-700/50 shadow-sm animate-fade-in-up'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2.5'>
                          <div className='p-1.5 bg-orange-200 dark:bg-orange-800/50 rounded-lg'>
                            <CheckCircle2 className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                          </div>
                          <div>
                            <p className='text-[10px] font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide'>
                              {t('notificationManagement.trainers.preview.willSendTo')}
                            </p>
                            <p className='text-base font-bold text-orange-900 dark:text-orange-100 font-heading'>
                              {t('notificationManagement.trainers.preview.count', {
                                count: trainerPreviewList.length,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {showPreviewList && (
                      <div className='max-h-[500px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl custom-scrollbar shadow-inner bg-gray-50/50 dark:bg-gray-900/50'>
                        <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                          {trainerPreviewList.slice(0, 100).map((trainer, index) => (
                            <div
                              key={trainer.id || index}
                              className='group p-2.5 hover:bg-gradient-to-r hover:from-orange-50 hover:to-white dark:hover:from-orange-900/20 dark:hover:to-gray-800 transition-all duration-200 animate-fade-in-up hover:shadow-sm border-l-2 border-l-transparent hover:border-l-orange-500'
                              style={{ animationDelay: `${index * 15}ms` }}
                            >
                              <div className='flex items-center justify-between gap-3'>
                                <div className='flex items-center gap-2.5 flex-1 min-w-0'>
                                  <div className='flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-600 dark:to-blue-800 flex items-center justify-center text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform duration-200'>
                                    {trainer.full_name?.charAt(0)?.toUpperCase() || 'T'}
                                  </div>
                                  <p className='text-xs font-semibold text-gray-900 dark:text-white truncate font-inter group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                                    {trainer.full_name}
                                  </p>
                                </div>
                                <div className='flex flex-col items-end gap-1 flex-shrink-0 justify-center'>
                                  <span
                                    className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap border shadow-sm group-hover:scale-105 transition-transform duration-200 h-[16px] flex items-center ${
                                      trainer.status === 'ACTIVE'
                                        ? 'bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/50'
                                        : trainer.status === 'INACTIVE'
                                        ? 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                                        : trainer.status === 'ON_LEAVE'
                                        ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/50'
                                        : 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50'
                                    }`}
                                  >
                                    {trainer.status}
                                  </span>
                                  {trainer.specializations &&
                                    trainer.specializations.length > 0 && (
                                      <span className='text-[8px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 text-purple-700 dark:text-purple-300 font-semibold whitespace-nowrap border border-purple-200 dark:border-purple-700/50 shadow-sm group-hover:scale-105 transition-transform duration-200 h-[16px] flex items-center'>
                                        {trainer.specializations[0]}
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {trainerPreviewList.length > 100 && (
                            <div className='p-3 text-center'>
                              <span className='inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 animate-fade-in'>
                                <UserCheck className='w-3 h-3 mr-1.5' />
                                {t('notificationManagement.trainers.preview.moreTrainers', {
                                  count: trainerPreviewList.length - 100,
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className='flex flex-col items-center justify-center p-8 text-center animate-fade-in'>
                    <div className='p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3'>
                      <UserCheck className='w-6 h-6 text-gray-400 dark:text-gray-600' />
                    </div>
                    <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                      {t('notificationManagement.preview.noData')}
                    </p>
                    <p className='text-[10px] text-gray-400 dark:text-gray-500 mt-1'>
                      {t('notificationManagement.filters.selectFilterOrIds')}
                    </p>
                  </div>
                )}
              </div>
            </AdminCard>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div
          className={`space-y-3 transition-all duration-300 ${
            isTabTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Statistics Cards */}
          {!loading && (history.length > 0 || allHistory.length > 0) && historyStats && (
            <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
              <div style={{ minHeight: '100px' }}>
                <AdminCard className='p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 border border-orange-200 dark:border-orange-700/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-[10px] font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wide mb-1'>
                        Tổng thông báo
                      </p>
                      <p className='text-2xl font-bold text-orange-900 dark:text-orange-100 font-heading'>
                        <AnimatedNumber value={historyStats.total} />
                      </p>
                    </div>
                    <div className='p-2 bg-orange-200 dark:bg-orange-800/50 rounded-lg'>
                      <History className='w-5 h-5 text-orange-700 dark:text-orange-300' />
                    </div>
                  </div>
                </AdminCard>
              </div>
              <div style={{ minHeight: '100px' }}>
                <AdminCard className='p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-700/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-[10px] font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1'>
                        Tổng đã gửi
                      </p>
                      <p className='text-2xl font-bold text-blue-900 dark:text-blue-100 font-heading'>
                        <AnimatedNumber value={historyStats.totalSent} />
                      </p>
                    </div>
                    <div className='p-2 bg-blue-200 dark:bg-blue-800/50 rounded-lg'>
                      <CheckCircle2 className='w-5 h-5 text-blue-700 dark:text-blue-300' />
                    </div>
                  </div>
                </AdminCard>
              </div>
              <div style={{ minHeight: '100px' }}>
                <AdminCard className='p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border border-green-200 dark:border-green-700/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-[10px] font-medium text-green-700 dark:text-green-300 uppercase tracking-wide mb-1'>
                        Thành công
                      </p>
                      <p className='text-2xl font-bold text-green-900 dark:text-green-100 font-heading'>
                        <AnimatedNumber value={historyStats.totalSuccess} />
                      </p>
                    </div>
                    <div className='p-2 bg-green-200 dark:bg-green-800/50 rounded-lg'>
                      <CheckCircle2 className='w-5 h-5 text-green-700 dark:text-green-300' />
                    </div>
                  </div>
                </AdminCard>
              </div>
              <div style={{ minHeight: '100px' }}>
                <AdminCard className='p-3 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 border border-red-200 dark:border-red-700/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-[10px] font-medium text-red-700 dark:text-red-300 uppercase tracking-wide mb-1'>
                        Thất bại
                      </p>
                      <p className='text-2xl font-bold text-red-900 dark:text-red-100 font-heading'>
                        <AnimatedNumber value={historyStats.totalFailed} />
                      </p>
                    </div>
                    <div className='p-2 bg-red-200 dark:bg-red-800/50 rounded-lg'>
                      <X className='w-5 h-5 text-red-700 dark:text-red-300' />
                    </div>
                  </div>
                </AdminCard>
              </div>
            </div>
          )}

          <AdminCard>
            <div className='space-y-4'>
              {/* Filters */}
              <div className='p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center space-x-2'>
                    <Filter className='w-4 h-4 text-orange-500' />
                    <h3 className='text-sm font-semibold text-gray-900 dark:text-white font-heading'>
                      {t('notificationManagement.history.filters.title')}
                    </h3>
                  </div>
                  {(historyFilters.target_type ||
                    historyFilters.startDate ||
                    historyFilters.endDate) && (
                    <button
                      onClick={() => {
                        setHistoryFilters({ target_type: '', startDate: '', endDate: '' });
                        setHistoryPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className='text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium transition-opacity duration-200'
                    >
                      {t('notificationManagement.history.filters.clearAll')}
                    </button>
                  )}
                </div>
                <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                      {t('notificationManagement.history.filters.targetTypeLabel')}
                    </label>
                    <CustomSelect
                      value={historyFilters.target_type}
                      onChange={value => {
                        setHistoryFilters({ ...historyFilters, target_type: value });
                        setHistoryPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      options={[
                        { value: '', label: t('notificationManagement.history.filters.all') },
                        {
                          value: 'MEMBER',
                          label: t('notificationManagement.history.filters.member'),
                        },
                        {
                          value: 'TRAINER',
                          label: t('notificationManagement.history.filters.trainer'),
                        },
                      ]}
                      className='w-full'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center space-x-1'>
                      <Calendar className='w-3.5 h-3.5 text-orange-500' />
                      <span>{t('notificationManagement.history.filters.startDate')}</span>
                    </label>
                    <input
                      type='date'
                      value={historyFilters.startDate}
                      onChange={e => {
                        setHistoryFilters({ ...historyFilters, startDate: e.target.value });
                        setHistoryPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className='w-full h-[30px] px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center space-x-1'>
                      <Calendar className='w-3.5 h-3.5 text-orange-500' />
                      <span>{t('notificationManagement.history.filters.endDate')}</span>
                    </label>
                    <input
                      type='date'
                      value={historyFilters.endDate}
                      onChange={e => {
                        setHistoryFilters({ ...historyFilters, endDate: e.target.value });
                        setHistoryPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className='w-full h-[30px] px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200'
                    />
                  </div>
                  <div className='flex items-end'>
                    <button
                      onClick={() => {
                        setHistoryFilters({ target_type: '', startDate: '', endDate: '' });
                        setHistoryPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className='w-full h-[30px] px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all duration-200 text-[11px] flex items-center justify-center'
                    >
                      <X className='w-3 h-3 mr-1' />
                      {t('notificationManagement.history.filters.clearFilter')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              {loading && !isPageTransitioning && allHistory.length === 0 ? (
                <TableLoading />
              ) : (
                <>
                  <div
                    className='overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm'
                    style={{
                      minHeight: '400px',
                      willChange: 'contents',
                    }}
                  >
                    <AdminTable>
                      <AdminTableHeader>
                        <AdminTableRow className='bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900'>
                          <AdminTableCell className='font-semibold text-[11px] text-gray-900 dark:text-white font-heading'>
                            {t('notificationManagement.history.table.sendDate')}
                          </AdminTableCell>
                          <AdminTableCell className='font-semibold text-[11px] text-gray-900 dark:text-white font-heading'>
                            {t('notificationManagement.history.table.sender')}
                          </AdminTableCell>
                          <AdminTableCell className='font-semibold text-[11px] text-gray-900 dark:text-white font-heading'>
                            {t('notificationManagement.history.table.target')}
                          </AdminTableCell>
                          <AdminTableCell className='font-semibold text-[11px] text-gray-900 dark:text-white font-heading'>
                            {t('notificationManagement.history.table.title')}
                          </AdminTableCell>
                          <AdminTableCell className='font-semibold text-[11px] text-gray-900 dark:text-white font-heading text-center'>
                            {t('notificationManagement.history.table.total')}
                          </AdminTableCell>
                          <AdminTableCell className='font-semibold text-[11px] text-gray-900 dark:text-white font-heading text-center'>
                            {t('notificationManagement.history.table.success')}
                          </AdminTableCell>
                          <AdminTableCell className='font-semibold text-[11px] text-gray-900 dark:text-white font-heading text-center'>
                            {t('notificationManagement.history.table.failed')}
                          </AdminTableCell>
                        </AdminTableRow>
                      </AdminTableHeader>
                      <AdminTableBody>
                        {history.length === 0 ? (
                          <tr className='bg-white dark:bg-gray-900'>
                            <td
                              colSpan={7}
                              className='text-center align-middle'
                              style={{ height: '400px', width: '100%' }}
                            >
                              <div className='flex flex-col items-center justify-center space-y-3 animate-fade-in-scale'>
                                <div className='p-4 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse-slow'>
                                  <History className='w-8 h-8 text-gray-400 dark:text-gray-600' />
                                </div>
                                <div>
                                  <p className='text-sm font-semibold text-gray-900 dark:text-white font-heading mb-1'>
                                    {t('notificationManagement.history.empty.title')}
                                  </p>
                                  <p className='text-xs text-gray-500 dark:text-gray-400 font-inter'>
                                    {t('notificationManagement.history.empty.message')}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          history.map((item, index) => (
                            <AdminTableRow
                              key={item.id}
                              onClick={() => {
                                setSelectedHistoryItem(item);
                                setShowDetailModal(true);
                              }}
                              className={`group border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 ease-out cursor-pointer ${
                                index % 2 === 0
                                  ? 'bg-white dark:bg-gray-900'
                                  : 'bg-gray-50/50 dark:bg-gray-800/50'
                              } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10 hover:shadow-sm`}
                            >
                              <AdminTableCell className='text-[11px] font-inter'>
                                <div className='flex flex-col'>
                                  <span className='font-medium text-gray-900 dark:text-white'>
                                    {formatVietnamDateTime(item.created_at).split(' ')[0]}
                                  </span>
                                  <span className='text-[10px] text-gray-500 dark:text-gray-400'>
                                    {formatVietnamDateTime(item.created_at).split(' ')[1]}
                                  </span>
                                </div>
                              </AdminTableCell>
                              <AdminTableCell>
                                <EnumBadge
                                  type='ROLE'
                                  value={item.sender_role}
                                  size='sm'
                                  showIcon={true}
                                />
                              </AdminTableCell>
                              <AdminTableCell>
                                <EnumBadge
                                  type='ROLE'
                                  value={item.target_type}
                                  size='sm'
                                  showIcon={true}
                                />
                              </AdminTableCell>
                              <AdminTableCell className='max-w-xs'>
                                <div className='flex flex-col'>
                                  <span className='text-[11px] font-medium text-gray-900 dark:text-white truncate font-inter'>
                                    {item.title}
                                  </span>
                                  <span className='text-[10px] text-gray-500 dark:text-gray-400 truncate font-inter'>
                                    {item.message.substring(0, 50)}
                                    {item.message.length > 50 ? '...' : ''}
                                  </span>
                                </div>
                              </AdminTableCell>
                              <AdminTableCell className='text-center'>
                                <span className='inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-heading'>
                                  {item.total_targets}
                                </span>
                              </AdminTableCell>
                              <AdminTableCell className='text-center'>
                                <span className='inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700/50'>
                                  <CheckCircle2 className='w-3 h-3 mr-1' />
                                  {item.sent_count}
                                </span>
                              </AdminTableCell>
                              <AdminTableCell className='text-center'>
                                {item.failed_count > 0 ? (
                                  <span className='inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/50'>
                                    <X className='w-3 h-3 mr-1' />
                                    {item.failed_count}
                                  </span>
                                ) : (
                                  <span className='text-[11px] text-gray-400 dark:text-gray-600 font-inter'>
                                    -
                                  </span>
                                )}
                              </AdminTableCell>
                            </AdminTableRow>
                          ))
                        )}
                      </AdminTableBody>
                    </AdminTable>
                  </div>

                  {historyPagination.pages > 1 && (
                    <div className='flex justify-center pt-2'>
                      <Pagination
                        currentPage={historyPagination.page}
                        totalPages={historyPagination.pages}
                        totalItems={historyPagination.total || 0}
                        itemsPerPage={historyPagination.limit || 10}
                        onPageChange={page => {
                          setIsPageTransitioning(true);
                          // Fade out first (150ms)
                          setTimeout(() => {
                            // Update page - this will trigger client-side pagination (no API call)
                            setHistoryPagination(prev => ({ ...prev, page }));
                            // Fade in immediately since no API call needed
                            setTimeout(() => {
                              setIsPageTransitioning(false);
                            }, 150);
                          }, 150);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </AdminCard>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div
          className='fixed inset-0 flex items-center justify-center backdrop-blur-sm animate-modal-fade-in'
          style={{
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setShowSuccessModal(false);
              setSuccessData(null);
            }
          }}
        >
          <div
            className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-modal-slide-up'
            onClick={e => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div className='flex justify-center mb-4'>
              <div className='w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 rounded-full flex items-center justify-center'>
                <CheckCircle2 className='w-8 h-8 text-green-600 dark:text-green-400' />
              </div>
            </div>

            {/* Title */}
            <h2 className='text-xl font-bold text-center text-gray-900 dark:text-white mb-2 font-heading'>
              {t('notificationManagement.success.title')}
            </h2>

            {/* Stats */}
            <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600 dark:text-gray-400 font-inter'>
                  {t('notificationManagement.success.target')}:
                </span>
                <span className='text-sm font-semibold text-gray-900 dark:text-white font-heading'>
                  {successData.targetType === 'members'
                    ? t('notificationManagement.success.members')
                    : t('notificationManagement.success.trainers')}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600 dark:text-gray-400 font-inter'>
                  {t('notificationManagement.success.total')}:
                </span>
                <span className='text-sm font-semibold text-gray-900 dark:text-white font-heading'>
                  {successData.totalTargets}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600 dark:text-gray-400 font-inter'>
                  {t('notificationManagement.success.sent')}:
                </span>
                <span className='text-sm font-semibold text-green-600 dark:text-green-400 font-heading'>
                  {successData.sentCount}
                </span>
              </div>
              {successData.failedCount > 0 && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-gray-400 font-inter'>
                    {t('notificationManagement.success.failed')}:
                  </span>
                  <span className='text-sm font-semibold text-red-600 dark:text-red-400 font-heading'>
                    {successData.failedCount}
                  </span>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessData(null);
              }}
              className='w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 font-heading'
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedHistoryItem && (
        <div
          className='fixed inset-0 flex items-center justify-center backdrop-blur-sm animate-modal-fade-in'
          style={{
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setShowDetailModal(false);
              setSelectedHistoryItem(null);
            }
          }}
        >
          <div
            className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-modal-slide-up'
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-600 dark:to-orange-800 flex items-center justify-center'>
                    <History className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h2 className='text-lg font-bold text-gray-900 dark:text-white font-heading'>
                      Chi tiết thông báo
                    </h2>
                    <p className='text-xs text-gray-500 dark:text-gray-400 font-inter'>
                      {formatVietnamDateTime(selectedHistoryItem.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedHistoryItem(null);
                  }}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200'
                >
                  <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className='px-6 py-4 overflow-y-auto flex-1'>
              <div className='space-y-4'>
                {/* Title */}
                <div>
                  <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide font-heading mb-1.5 block'>
                    {t('notificationManagement.history.detail.title')}
                  </label>
                  <div className='px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <p className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                      {selectedHistoryItem.title}
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide font-heading mb-1.5 block'>
                    Nội dung
                  </label>
                  <div className='px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[100px]'>
                    <p className='text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-inter leading-relaxed'>
                      {selectedHistoryItem.message}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                  <div className='bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg p-3 border border-blue-200 dark:border-blue-700/50'>
                    <div className='text-xs text-blue-600 dark:text-blue-400 font-medium font-heading mb-1'>
                      {t('notificationManagement.history.detail.target')}
                    </div>
                    <div className='flex items-center'>
                      <EnumBadge
                        type='ROLE'
                        value={selectedHistoryItem.target_type}
                        size='sm'
                        showIcon={true}
                      />
                    </div>
                  </div>
                  <div className='bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700'>
                    <div className='text-xs text-gray-600 dark:text-gray-400 font-medium font-heading mb-1'>
                      {t('notificationManagement.history.detail.total')}
                    </div>
                    <div className='text-sm font-bold text-gray-900 dark:text-white font-heading'>
                      {selectedHistoryItem.total_targets}
                    </div>
                  </div>
                  <div className='bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 rounded-lg p-3 border border-green-200 dark:border-green-700/50'>
                    <div className='text-xs text-green-600 dark:text-green-400 font-medium font-heading mb-1'>
                      Thành công
                    </div>
                    <div className='text-sm font-bold text-green-900 dark:text-green-100 font-heading'>
                      {selectedHistoryItem.sent_count}
                    </div>
                  </div>
                  <div className='bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 rounded-lg p-3 border border-red-200 dark:border-red-700/50'>
                    <div className='text-xs text-red-600 dark:text-red-400 font-medium font-heading mb-1'>
                      {t('notificationManagement.history.detail.failed')}
                    </div>
                    <div className='text-sm font-bold text-red-900 dark:text-red-100 font-heading'>
                      {selectedHistoryItem.failed_count}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <div>
                    <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide font-heading mb-1.5 block'>
                      {t('notificationManagement.history.detail.sender')}
                    </label>
                    <div className='px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <EnumBadge
                        type='ROLE'
                        value={selectedHistoryItem.sender_role}
                        size='sm'
                        showIcon={true}
                      />
                    </div>
                  </div>
                  <div>
                    <label className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide font-heading mb-1.5 block'>
                      {t('notificationManagement.history.detail.notificationType')}
                    </label>
                    <div className='px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <span className='text-sm text-gray-900 dark:text-white font-inter'>
                        {selectedHistoryItem.notification_type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className='px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end'>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedHistoryItem(null);
                }}
                className='px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 font-heading text-sm'
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManagement;
