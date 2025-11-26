import { useEffect, useState } from 'react';
import { socketService, SocketServiceType } from '../../services/socket.service';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  className?: string;
}

export default function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [connectionStates, setConnectionStates] = useState<Map<SocketServiceType, any>>(new Map());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateConnectionStates = () => {
      const states = socketService.getAllConnectionStates();
      setConnectionStates(states);
      
      // Show component if any service is disconnected or has errors
      const hasIssues = Array.from(states.values()).some(
        state => !state.connected || state.error
      );
      setIsVisible(hasIssues);
    };

    // Initial update
    updateConnectionStates();

    // Listen for connection state changes
    const handleConnectionStateChange = (event: CustomEvent) => {
      updateConnectionStates();
    };

    window.addEventListener('socket:connection_state', handleConnectionStateChange as EventListener);

    // Poll connection states periodically
    const interval = setInterval(updateConnectionStates, 5000);

    return () => {
      window.removeEventListener('socket:connection_state', handleConnectionStateChange as EventListener);
      clearInterval(interval);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const scheduleState = connectionStates.get('schedule');
  const memberState = connectionStates.get('member');

  const getStatusColor = (state: any) => {
    if (!state) return 'text-gray-500';
    if (state.connected) return 'text-green-500';
    if (state.error) return 'text-red-500';
    if (state.connecting) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const getStatusIcon = (state: any) => {
    if (!state) return <WifiOff className="w-4 h-4" />;
    if (state.connected) return <Wifi className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Kết nối Socket
          </span>
          {scheduleState?.error || memberState?.error ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : null}
        </div>

        {scheduleState && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {getStatusIcon(scheduleState)}
              <span className="text-gray-600 dark:text-gray-400">Schedule</span>
            </div>
            <span className={getStatusColor(scheduleState)}>
              {scheduleState.connected ? 'Đã kết nối' : scheduleState.connecting ? 'Đang kết nối...' : 'Mất kết nối'}
            </span>
          </div>
        )}

        {memberState && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {getStatusIcon(memberState)}
              <span className="text-gray-600 dark:text-gray-400">Member</span>
            </div>
            <span className={getStatusColor(memberState)}>
              {memberState.connected ? 'Đã kết nối' : memberState.connecting ? 'Đang kết nối...' : 'Mất kết nối'}
            </span>
          </div>
        )}

        {(scheduleState?.reconnectAttempts || 0) > 0 && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
            Đang thử kết nối lại: {scheduleState.reconnectAttempts}/10
          </div>
        )}
      </div>
    </div>
  );
}

