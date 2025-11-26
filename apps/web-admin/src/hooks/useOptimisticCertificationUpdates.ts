import { useState, useEffect, useCallback, useRef } from 'react';
import { Certification } from '@/services/certification.service';
import { eventManager } from '@/services/event-manager.service';

export interface CertificationUpdateEvent {
  certification_id?: string;
  id?: string;
  trainer_id?: string;
  action?: 'upload' | 'pending' | 'verified' | 'rejected' | 'deleted' | 'status';
  verification_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  data?: {
    id?: string;
    certification_id?: string;
    trainer_id?: string;
    verification_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
    certification_name?: string;
    category?: string;
    certification_level?: string;
    [key: string]: any;
  };
  timestamp?: string;
}

/**
 * Hook for optimistic certification updates from socket events
 * Updates certifications in real-time without full page reload
 */
export function useOptimisticCertificationUpdates(
  certifications: Certification[],
  setCertifications: React.Dispatch<React.SetStateAction<Certification[]>>
) {
  const [updatedCertificationIds, setUpdatedCertificationIds] = useState<Set<string>>(new Set());
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Handle certification:upload event
  const handleCertificationUpload = useCallback(
    (data: CertificationUpdateEvent) => {
      const certId = data.certification_id || data.id || data.data?.id || data.data?.certification_id;
      if (!certId) return;

      const eventId = `certification:upload:${certId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setCertifications(prev => {
        // Check if certification already exists
        const exists = prev.some(c => c.id === certId);
        if (exists) return prev;

        // Create new certification from data
        const newCert: Certification = {
          id: certId,
          trainer_id: data.trainer_id || data.data?.trainer_id || '',
          category: data.data?.category || '',
          certification_name: data.data?.certification_name || 'New Certification',
          certification_issuer: data.data?.certification_issuer || '',
          certification_level: (data.data?.certification_level as any) || 'BASIC',
          issued_date: data.data?.issued_date || new Date().toISOString(),
          expiration_date: data.data?.expiration_date,
          verification_status: 'PENDING',
          certificate_file_url: data.data?.certificate_file_url,
          is_active: true,
          created_at: data.data?.created_at || data.timestamp || new Date().toISOString(),
          updated_at: data.data?.updated_at || data.timestamp || new Date().toISOString(),
        };

        return [newCert, ...prev];
      });

      // Mark certification for animation
      setUpdatedCertificationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(certId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedCertificationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(certId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setCertifications]
  );

  // Handle certification:pending event
  const handleCertificationPending = useCallback(
    (data: CertificationUpdateEvent) => {
      const certId = data.certification_id || data.id || data.data?.id || data.data?.certification_id;
      if (!certId) return;

      const eventId = `certification:pending:${certId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setCertifications(prev => {
        return prev.map(cert => {
          if (cert.id !== certId) return cert;

          return {
            ...cert,
            verification_status: 'PENDING',
            updated_at: data.data?.updated_at || data.timestamp || new Date().toISOString(),
            _updated: true,
          };
        });
      });

      setUpdatedCertificationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(certId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedCertificationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(certId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setCertifications]
  );

  // Handle certification:verified event
  const handleCertificationVerified = useCallback(
    (data: CertificationUpdateEvent) => {
      const certId = data.certification_id || data.id || data.data?.id || data.data?.certification_id;
      if (!certId) return;

      const eventId = `certification:verified:${certId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setCertifications(prev => {
        return prev.map(cert => {
          if (cert.id !== certId) return cert;

          return {
            ...cert,
            verification_status: 'VERIFIED',
            updated_at: data.data?.updated_at || data.timestamp || new Date().toISOString(),
            _updated: true,
          };
        });
      });

      setUpdatedCertificationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(certId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedCertificationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(certId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setCertifications]
  );

  // Handle certification:rejected event
  const handleCertificationRejected = useCallback(
    (data: CertificationUpdateEvent) => {
      const certId = data.certification_id || data.id || data.data?.id || data.data?.certification_id;
      if (!certId) return;

      const eventId = `certification:rejected:${certId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setCertifications(prev => {
        return prev.map(cert => {
          if (cert.id !== certId) return cert;

          return {
            ...cert,
            verification_status: 'REJECTED',
            updated_at: data.data?.updated_at || data.timestamp || new Date().toISOString(),
            _updated: true,
          };
        });
      });

      setUpdatedCertificationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(certId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedCertificationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(certId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setCertifications]
  );

  // Handle certification:deleted event
  const handleCertificationDeleted = useCallback(
    (data: CertificationUpdateEvent) => {
      const certId = data.certification_id || data.id || data.data?.id || data.data?.certification_id;
      if (!certId) return;

      const eventId = `certification:deleted:${certId}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setCertifications(prev => {
        return prev.filter(cert => cert.id !== certId);
      });

      processedEventsRef.current.delete(eventId);
    },
    [setCertifications]
  );

  // Handle certification:status event (generic status update)
  const handleCertificationStatus = useCallback(
    (data: CertificationUpdateEvent) => {
      const certId = data.certification_id || data.id || data.data?.id || data.data?.certification_id;
      if (!certId) return;

      const status = data.verification_status || data.data?.verification_status;
      if (!status) return;

      const eventId = `certification:status:${certId}:${status}:${Date.now()}`;
      if (processedEventsRef.current.has(eventId)) return;
      processedEventsRef.current.add(eventId);

      setCertifications(prev => {
        return prev.map(cert => {
          if (cert.id !== certId) return cert;

          return {
            ...cert,
            verification_status: status as 'PENDING' | 'VERIFIED' | 'REJECTED',
            updated_at: data.data?.updated_at || data.timestamp || new Date().toISOString(),
            _updated: true,
          };
        });
      });

      setUpdatedCertificationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(certId);
        return newSet;
      });

      setTimeout(() => {
        setUpdatedCertificationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(certId);
          return newSet;
        });
        processedEventsRef.current.delete(eventId);
      }, 2000);
    },
    [setCertifications]
  );

  // Handle certification:updated event (generic update)
  const handleCertificationUpdated = useCallback(
    (data: CertificationUpdateEvent) => {
      const certId = data.certification_id || data.id || data.data?.id || data.data?.certification_id;
      if (!certId) return;

      // Determine which handler to use based on status
      const status = data.verification_status || data.data?.verification_status;
      
      if (status === 'VERIFIED') {
        handleCertificationVerified(data);
      } else if (status === 'REJECTED') {
        handleCertificationRejected(data);
      } else if (status === 'PENDING') {
        handleCertificationPending(data);
      } else {
        // Generic update
        setCertifications(prev => {
          return prev.map(cert => {
            if (cert.id !== certId) return cert;

            return {
              ...cert,
              ...data.data,
              updated_at: data.data?.updated_at || data.timestamp || new Date().toISOString(),
              _updated: true,
            };
          });
        });
      }
    },
    [setCertifications, handleCertificationVerified, handleCertificationRejected, handleCertificationPending]
  );

  // Setup event listeners using event manager
  useEffect(() => {
    const subscriptionIds: string[] = [];

    subscriptionIds.push(
      eventManager.subscribe('certification:upload', (data) => {
        handleCertificationUpload(data as CertificationUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('certification:pending', (data) => {
        handleCertificationPending(data as CertificationUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('certification:verified', (data) => {
        handleCertificationVerified(data as CertificationUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('certification:rejected', (data) => {
        handleCertificationRejected(data as CertificationUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('certification:deleted', (data) => {
        handleCertificationDeleted(data as CertificationUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('certification:status', (data) => {
        handleCertificationStatus(data as CertificationUpdateEvent);
      })
    );

    subscriptionIds.push(
      eventManager.subscribe('certification:updated', (data) => {
        handleCertificationUpdated(data as CertificationUpdateEvent);
      })
    );

    // Cleanup
    return () => {
      subscriptionIds.forEach(id => {
        if (id) eventManager.unsubscribe(id);
      });
    };
  }, [
    handleCertificationUpload,
    handleCertificationPending,
    handleCertificationVerified,
    handleCertificationRejected,
    handleCertificationDeleted,
    handleCertificationStatus,
    handleCertificationUpdated,
  ]);

  return {
    updatedCertificationIds,
  };
}

