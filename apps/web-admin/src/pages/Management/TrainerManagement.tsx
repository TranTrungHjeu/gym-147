import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Edit,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminCard from '../../components/common/AdminCard';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../../components/common/AdminTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CustomSelect from '../../components/common/CustomSelect';
import ExportButton from '../../components/common/ExportButton';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import ReviewCertificationModal from '../../components/modals/ReviewCertificationModal';
import TrainerFormModal from '../../components/modals/TrainerFormModal';
import ViewTrainerCertificationsModal from '../../components/modals/ViewTrainerCertificationsModal';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../hooks/useToast';
import { Certification, certificationService } from '../../services/certification.service';
import { Trainer, trainerService } from '../../services/trainer.service';
import { formatVietnamDateTime } from '../../utils/dateTime';

const TrainerManagement: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [specializationFilter, setSpecializationFilter] = useState<string>('all');
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [trainerToDelete, setTrainerToDelete] = useState<Trainer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedTrainerForAction, setSelectedTrainerForAction] = useState<Trainer | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [trainerPendingCerts, setTrainerPendingCerts] = useState<Record<string, Certification[]>>(
    {}
  );
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null);
  const [selectedTrainerForReview, setSelectedTrainerForReview] = useState<Trainer | null>(null);
  const [isViewCertificationsModalOpen, setIsViewCertificationsModalOpen] = useState(false);

  useEffect(() => {
    loadTrainers();
    loadPendingCertifications();
  }, []);

  // Handle query params to open certification modal when navigating from notification
  useEffect(() => {
    const certificationId = searchParams.get('certification_id');
    const trainerId = searchParams.get('trainer_id');

    if (certificationId && trainerId) {
      console.log(
        `🔗 [TRAINER_MGMT] Opening certification modal from query params: certification_id=${certificationId}, trainer_id=${trainerId}`
      );

      // Find trainer in the list
      const trainer = trainers.find(t => t.id === trainerId);

      if (trainer) {
        // Set selected trainer and open certifications modal
        setSelectedTrainer(trainer);
        setIsViewCertificationsModalOpen(true);

        // Find and select the specific certification if it exists
        const pendingCerts = trainerPendingCerts[trainerId];
        if (pendingCerts) {
          const cert = pendingCerts.find(c => c.id === certificationId);
          if (cert) {
            // If it's a pending certification, open review modal instead
            setSelectedCertification(cert);
            setSelectedTrainerForReview(trainer);
            setIsReviewModalOpen(true);
            setIsViewCertificationsModalOpen(false);
          }
        }

        // Clear query params after opening modal
        setSearchParams({}, { replace: true });
      } else {
        // Trainer not loaded yet, wait for trainers to load
        console.log(
          `⏳ [TRAINER_MGMT] Trainer ${trainerId} not found yet, waiting for trainers to load...`
        );
      }
    }
  }, [searchParams, trainers, trainerPendingCerts, setSearchParams]);

  // Load pending certifications for all trainers
  const loadPendingCertifications = async () => {
    try {
      const response = await certificationService.getPendingCertifications({ limit: 1000 });
      const pendingCerts = response.certifications || [];

      // Group by trainer_id
      const grouped: Record<string, Certification[]> = {};
      pendingCerts.forEach(cert => {
        if (!grouped[cert.trainer_id]) {
          grouped[cert.trainer_id] = [];
        }
        grouped[cert.trainer_id].push(cert);
      });

      setTrainerPendingCerts(grouped);
    } catch (error) {
      console.error('Error loading pending certifications:', error);
    }
  };

  // Listen for certification events to update trainers list and pending certifications optimistically
  useEffect(() => {
    // Use ref to track pending reload to avoid multiple rapid reloads
    let reloadTimeout: ReturnType<typeof setTimeout> | null = null;

    // Helper to update pending certifications optimistically
    const updatePendingCertsOptimistically = (
      certData: any,
      action: 'add' | 'remove' | 'update'
    ) => {
      // Try to extract trainer_id from various possible locations in the data structure
      // Note: trainerId should already be normalized by the caller (handleCertificationCreated)
      let trainerId =
        certData.trainer_id ||
        certData.trainerId ||
        certData.data?.trainer_id ||
        certData.data?.trainerId;

      // If trainerId is not found, try to find trainer by matching with trainers list
      if (!trainerId) {
        console.warn(
          '⚠️ [TRAINER_MGMT] Cannot find trainer_id in certData, attempting to find trainer in list',
          certData
        );
        // Try to find trainer by other means (e.g., by user_id if available)
        // This is a fallback - ideally trainer_id should always be present
        return;
      }

      // If trainerId is already normalized (from handleCertificationCreated), use it directly
      // Only normalize if trainerId doesn't match any trainer.id in the list
      // This ensures trainerPendingCerts is keyed by the same ID used in the UI
      let normalizedTrainerId = trainerId;

      // Check if trainerId already matches a trainer.id (already normalized)
      const trainerById = trainers.find(t => t.id === trainerId);
      if (trainerById) {
        // Already normalized, use as is
        normalizedTrainerId = trainerId;
      } else {
        // Try to find by user_id and normalize to trainer.id
        const trainer = trainers.find(t => t.user_id === trainerId);
        if (trainer) {
          normalizedTrainerId = trainer.id;
          console.log(
            `✅ [TRAINER_MGMT] Normalized trainerId: ${trainerId} -> ${normalizedTrainerId} (trainer: ${trainer.full_name})`
          );
        } else {
          // If not found, use original trainerId (might be from a different source)
          console.warn(
            `⚠️ [TRAINER_MGMT] Trainer ${trainerId} not found in current list (${trainers.length} trainers), using as-is. Available IDs:`,
            trainers.slice(0, 5).map(t => ({ id: t.id, user_id: t.user_id, name: t.full_name }))
          );
        }
      }

      // Use normalized trainerId for all operations
      trainerId = normalizedTrainerId;

      const certId =
        certData.certification_id ||
        certData.id ||
        certData.data?.certification_id ||
        certData.data?.id;

      setTrainerPendingCerts(prev => {
        console.log(
          `🔄 [TRAINER_MGMT] updatePendingCertsOptimistically - action: ${action}, trainerId: ${trainerId}, certId: ${certId}`
        );
        console.log(`🔄 [TRAINER_MGMT] Current trainerPendingCerts keys:`, Object.keys(prev));
        const updated = { ...prev };

        if (action === 'add') {
          // Add new pending certification
          // Use trainerId (which may have been normalized to trainer.id if trainer was found)
          if (!updated[trainerId]) {
            updated[trainerId] = [];
            console.log(`🆕 [TRAINER_MGMT] Created new array for trainer ${trainerId}`);
          }

          // Check if certification already exists
          const exists = updated[trainerId].some(cert => cert.id === certId);
          if (exists) {
            console.log(
              `ℹ️ [TRAINER_MGMT] Certification ${certId} already in pending list for trainer ${trainerId}`
            );
            return prev;
          }

          // Create certification object from socket data
          // Try to extract data from various possible locations in the data structure
          const category = certData.category || certData.data?.category || '';
          const certificationName =
            certData.certification_name ||
            certData.certificationName ||
            certData.data?.certification_name ||
            'Chứng chỉ mới';
          const certificationIssuer =
            certData.certification_issuer ||
            certData.certificationIssuer ||
            certData.data?.certification_issuer ||
            '';
          const certificationLevel =
            certData.certification_level ||
            certData.certificationLevel ||
            certData.data?.certification_level ||
            'BASIC';

          const newCert: Certification = {
            id: certId || `temp-${Date.now()}`,
            trainer_id: trainerId, // Use normalized trainerId (trainer.id if found, or original trainer_id)
            category,
            certification_name: certificationName,
            certification_issuer: certificationIssuer,
            certification_level: certificationLevel as any,
            issued_date:
              certData.issued_date ||
              certData.issuedDate ||
              certData.data?.issued_date ||
              new Date().toISOString(),
            expiration_date:
              certData.expiration_date || certData.expirationDate || certData.data?.expiration_date,
            verification_status: 'PENDING',
            certificate_file_url:
              certData.certificate_file_url ||
              certData.certificateFileUrl ||
              certData.data?.certificate_file_url,
            is_active: true,
            created_at:
              certData.created_at || certData.data?.created_at || new Date().toISOString(),
            updated_at:
              certData.updated_at || certData.data?.updated_at || new Date().toISOString(),
          };

          // Create new array to ensure React detects the change
          updated[trainerId] = [newCert, ...(updated[trainerId] || [])];
          console.log(
            `✅ [TRAINER_MGMT] Added pending certification ${certId} for trainer ${trainerId} optimistically. Total pending: ${updated[trainerId].length}`
          );
          console.log(
            `📊 [TRAINER_MGMT] Updated trainerPendingCerts for trainer ${trainerId}:`,
            updated[trainerId].map(c => ({ id: c.id, name: c.certification_name }))
          );
          console.log(
            `🔑 [TRAINER_MGMT] trainerPendingCerts keys after update:`,
            Object.keys(updated)
          );
          console.log(
            `🔍 [TRAINER_MGMT] Checking if trainer ${trainerId} exists in trainers list:`,
            trainers.find(t => t.id === trainerId)?.full_name || 'NOT FOUND'
          );

          // Force React to re-render by returning a new object with new array references
          // This ensures React detects the state change
          const newState = { ...updated };
          // Ensure each array is a new reference
          Object.keys(newState).forEach(key => {
            newState[key] = [...newState[key]];
          });
          console.log(`✅ [TRAINER_MGMT] Returning new state with keys:`, Object.keys(newState));
          console.log(
            `✅ [TRAINER_MGMT] New state for trainer ${trainerId}:`,
            newState[trainerId]?.length || 0,
            'certs'
          );
          return newState;
        } else if (action === 'remove') {
          // Remove certification from pending (verified, rejected, or deleted)
          if (updated[trainerId]) {
            updated[trainerId] = updated[trainerId].filter(cert => cert.id !== certId);
            console.log(
              `✅ [TRAINER_MGMT] Removed pending certification ${certId} for trainer ${trainerId} optimistically`
            );
          }
        } else if (action === 'update') {
          // Update certification status
          if (updated[trainerId]) {
            const index = updated[trainerId].findIndex(cert => cert.id === certId);
            if (index !== -1) {
              updated[trainerId][index] = {
                ...updated[trainerId][index],
                verification_status: certData.verification_status || certData.status || 'PENDING',
                updated_at: new Date().toISOString(),
              };
              console.log(
                `✅ [TRAINER_MGMT] Updated pending certification ${certId} for trainer ${trainerId} optimistically`
              );
            }
          }
        }

        return updated;
      });
    };

    const handleCertificationUpdated = (event: CustomEvent) => {
      console.log('📢 certification:updated event received in TrainerManagement:', event.detail);
      const data = event.detail;

      // Clear any pending reload
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
        reloadTimeout = null;
      }

      // Try to extract trainer_id from various possible locations
      const trainerId =
        data?.trainer_id || data?.trainerId || data?.data?.trainer_id || data?.data?.trainerId;

      const status =
        data?.verification_status ||
        data?.status ||
        data?.data?.verification_status ||
        data?.data?.status;

      if (trainerId) {
        if (status === 'VERIFIED' || status === 'REJECTED') {
          // Remove from pending list (verified or rejected)
          updatePendingCertsOptimistically(data, 'remove');

          // Update trainer optimistically (specializations may have changed)
          // Fetch only the specific trainer to update, not reload entire list
          console.log(
            `🔄 [TRAINER_MGMT] Certification ${status} - updating trainer ${trainerId} optimistically (no full reload)`
          );

          // For VERIFIED status, specializations may have changed
          // Backend already syncs specializations when verifying, but we'll trigger a sync to ensure it's done
          if (status === 'VERIFIED') {
            // Trigger specialization sync - the endpoint returns the updated trainer with specializations
            console.log(
              `🔄 [TRAINER_MGMT] Triggering specialization sync for trainer ${trainerId}`
            );

            trainerService
              .syncTrainerSpecializations(trainerId)
              .then(syncResponse => {
                console.log(`✅ [TRAINER_MGMT] Specialization sync response:`, syncResponse);

                if (syncResponse.success && syncResponse.data?.trainer) {
                  // Sync endpoint returns { success: true, data: { trainer } } with updated specializations
                  const syncedTrainer = syncResponse.data.trainer;

                  // Normalize specializations to array
                  const normalizedTrainer = {
                    ...syncedTrainer,
                    specializations: Array.isArray(syncedTrainer.specializations)
                      ? syncedTrainer.specializations.filter(
                          s => s && typeof s === 'string' && s.trim()
                        )
                      : syncedTrainer.specializations
                      ? [syncedTrainer.specializations].filter(
                          s => s && typeof s === 'string' && s.trim()
                        )
                      : [],
                  };

                  console.log(`📋 [TRAINER_MGMT] Trainer data from sync:`, {
                    id: normalizedTrainer.id,
                    full_name: normalizedTrainer.full_name,
                    specializations: normalizedTrainer.specializations,
                  });

                  // Check if specializations are still empty after sync
                  if (normalizedTrainer.specializations.length === 0) {
                    console.warn(
                      `⚠️ [TRAINER_MGMT] Specializations are still empty after sync for trainer ${trainerId}. This might indicate no valid certifications.`
                    );
                  }

                  // Update trainer in state immediately with data from sync response
                  setTrainers(prev => {
                    const index = prev.findIndex(t => t.id === trainerId);
                    if (index !== -1) {
                      const updated = [...prev];
                      // Merge synced trainer data with existing trainer data to preserve other fields
                      updated[index] = {
                        ...prev[index],
                        ...normalizedTrainer,
                        // Ensure specializations are updated
                        specializations: normalizedTrainer.specializations,
                      };
                      console.log(
                        `✅ [TRAINER_MGMT] Updated trainer ${trainerId} in state with synced data (specializations:`,
                        normalizedTrainer.specializations,
                        ')'
                      );
                      return updated;
                    }
                    console.warn(
                      `⚠️ [TRAINER_MGMT] Trainer ${trainerId} not found in current list`
                    );
                    return prev;
                  });

                  // Also fetch full trainer data to ensure we have all fields (optional, but ensures consistency)
                  // This happens in the background and won't block the UI update
                  setTimeout(() => {
                    trainerService
                      .getTrainerById(trainerId)
                      .then(response => {
                        const trainerData = response.data?.trainer || response.data;
                        if (response.success && trainerData) {
                          // Only update if we get different specializations (shouldn't happen, but safety check)
                          setTrainers(prev => {
                            const index = prev.findIndex(t => t.id === trainerId);
                            if (index !== -1) {
                              const currentSpecializations = prev[index].specializations || [];
                              const newSpecializations = Array.isArray(trainerData.specializations)
                                ? trainerData.specializations.filter(
                                    s => s && typeof s === 'string' && s.trim()
                                  )
                                : trainerData.specializations
                                ? [trainerData.specializations].filter(
                                    s => s && typeof s === 'string' && s.trim()
                                  )
                                : [];

                              // Only update if specializations changed (to avoid unnecessary re-renders)
                              if (
                                JSON.stringify(currentSpecializations) !==
                                JSON.stringify(newSpecializations)
                              ) {
                                console.log(
                                  `🔄 [TRAINER_MGMT] Specializations changed after fetch, updating:`,
                                  newSpecializations
                                );
                                const updated = [...prev];
                                updated[index] = {
                                  ...prev[index],
                                  ...trainerData,
                                  specializations: newSpecializations,
                                };
                                return updated;
                              }
                            }
                            return prev;
                          });
                        }
                      })
                      .catch(error => {
                        console.error(`❌ [TRAINER_MGMT] Error fetching full trainer data:`, error);
                        // Ignore error - we already updated from sync response
                      });
                  }, 500);
                } else {
                  console.warn(
                    `⚠️ [TRAINER_MGMT] Specialization sync returned invalid response:`,
                    syncResponse
                  );
                  // Fallback: fetch trainer directly
                  setTimeout(() => {
                    trainerService
                      .getTrainerById(trainerId)
                      .then(response => {
                        const trainerData = response.data?.trainer || response.data;
                        if (response.success && trainerData) {
                          const normalizedTrainer = {
                            ...trainerData,
                            specializations: Array.isArray(trainerData.specializations)
                              ? trainerData.specializations.filter(
                                  s => s && typeof s === 'string' && s.trim()
                                )
                              : trainerData.specializations
                              ? [trainerData.specializations].filter(
                                  s => s && typeof s === 'string' && s.trim()
                                )
                              : [],
                          };
                          setTrainers(prev => {
                            const index = prev.findIndex(t => t.id === trainerId);
                            if (index !== -1) {
                              const updated = [...prev];
                              updated[index] = normalizedTrainer;
                              return updated;
                            }
                            return prev;
                          });
                        }
                      })
                      .catch(error => {
                        console.error(
                          `❌ [TRAINER_MGMT] Error fetching trainer after sync failure:`,
                          error
                        );
                        // Final fallback: reload entire list
                        reloadTimeout = setTimeout(() => {
                          loadTrainers();
                          loadPendingCertifications();
                          reloadTimeout = null;
                        }, 1000);
                      });
                  }, 1000);
                }
              })
              .catch(syncError => {
                console.error(`❌ [TRAINER_MGMT] Error triggering specialization sync:`, syncError);
                // Fallback: fetch trainer directly (backend may have already synced)
                setTimeout(() => {
                  trainerService
                    .getTrainerById(trainerId)
                    .then(response => {
                      const trainerData = response.data?.trainer || response.data;
                      if (response.success && trainerData) {
                        const normalizedTrainer = {
                          ...trainerData,
                          specializations: Array.isArray(trainerData.specializations)
                            ? trainerData.specializations.filter(
                                s => s && typeof s === 'string' && s.trim()
                              )
                            : trainerData.specializations
                            ? [trainerData.specializations].filter(
                                s => s && typeof s === 'string' && s.trim()
                              )
                            : [],
                        };
                        setTrainers(prev => {
                          const index = prev.findIndex(t => t.id === trainerId);
                          if (index !== -1) {
                            const updated = [...prev];
                            updated[index] = normalizedTrainer;
                            return updated;
                          }
                          return prev;
                        });
                      }
                    })
                    .catch(error => {
                      console.error(
                        `❌ [TRAINER_MGMT] Error fetching trainer after sync error:`,
                        error
                      );
                      // Final fallback: reload entire list
                      reloadTimeout = setTimeout(() => {
                        loadTrainers();
                        loadPendingCertifications();
                        reloadTimeout = null;
                      }, 1000);
                    });
                }, 1500);
              });
          } else {
            // For REJECTED, specializations shouldn't change
            console.log(
              `✅ [TRAINER_MGMT] Certification REJECTED - no specialization change needed`
            );
          }

          // No background reload - optimistic update is sufficient
          // User can manually refresh if needed
        } else if (status === 'PENDING' || !status) {
          // Add to pending list or update - NO RELOAD needed
          // If status is not provided, assume PENDING (new certification upload)
          const certId =
            data?.certification_id || data?.id || data?.data?.certification_id || data?.data?.id;
          updatePendingCertsOptimistically(data, certId ? 'update' : 'add');
          console.log(
            `✅ [TRAINER_MGMT] Certification PENDING - updated pending certs optimistically (no reload)`
          );

          // No background reload - user can manually refresh if needed
        }
      } else {
        // No trainer_id in data - fallback to reload (shouldn't happen often)
        console.warn(
          `⚠️ [TRAINER_MGMT] No trainer_id in certification:updated event. Cannot update optimistically.`,
          data
        );
      }
    };

    const handleCertificationCreated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(
        '📢 [TRAINER_MGMT] ⭐⭐ certification:created event received:',
        customEvent.detail
      );
      console.log('📢 [TRAINER_MGMT] Current trainers count:', trainers.length);
      const data = customEvent.detail;

      // Verify event has required data
      if (!data) {
        console.error('❌ [TRAINER_MGMT] certification:created event has no data!');
        return;
      }

      // Clear any pending reload
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
        reloadTimeout = null;
      }

      // Try to extract trainer_id from various possible locations
      const trainerId =
        data?.trainer_id || data?.trainerId || data?.data?.trainer_id || data?.data?.trainerId;

      const status =
        data?.verification_status ||
        data?.status ||
        data?.data?.verification_status ||
        data?.data?.status ||
        'PENDING'; // Default to PENDING for new certifications

      console.log(
        `🔍 [TRAINER_MGMT] Processing certification:created - trainerId: ${trainerId}, status: ${status}`
      );
      console.log(
        `📋 [TRAINER_MGMT] Current trainers list (${trainers.length} trainers):`,
        trainers.map(t => ({ id: t.id, user_id: t.user_id, name: t.full_name }))
      );

      if (trainerId) {
        // Find trainer in current list to normalize trainerId to trainer.id
        // This ensures trainerPendingCerts is keyed by the same ID used in the UI
        console.log(
          `🔍 [TRAINER_MGMT] Searching for trainer with trainerId: ${trainerId} in ${trainers.length} trainers`
        );

        const trainer = trainers.find(t => t.id === trainerId || t.user_id === trainerId);
        let normalizedTrainerId = trainerId;

        if (trainer) {
          // Use trainer.id to ensure consistency with UI lookup
          normalizedTrainerId = trainer.id;
          console.log(
            `✅ [TRAINER_MGMT] Found trainer ${trainer.full_name} (id: ${trainer.id}, user_id: ${trainer.user_id}), normalizing trainerId: ${trainerId} -> ${normalizedTrainerId}`
          );
        } else {
          console.warn(
            `⚠️ [TRAINER_MGMT] Trainer ${trainerId} not found in current list (${trainers.length} trainers). Available IDs:`,
            trainers.map(t => ({ id: t.id, user_id: t.user_id, name: t.full_name }))
          );
          // Try to find by user_id if trainerId is actually a user_id
          const trainerByUserId = trainers.find(t => t.user_id === trainerId);
          if (trainerByUserId) {
            normalizedTrainerId = trainerByUserId.id;
            console.log(
              `✅ [TRAINER_MGMT] Found trainer by user_id: ${trainerByUserId.full_name} (id: ${trainerByUserId.id}), using trainer.id: ${normalizedTrainerId}`
            );
          } else {
            console.error(
              `❌ [TRAINER_MGMT] Trainer not found by user_id either. Will use original trainerId: ${trainerId}. This may cause badge not to update!`
            );
          }
        }

        if (status === 'PENDING') {
          // Normalize trainer_id in data to ensure consistency
          const normalizedData = {
            ...data,
            trainer_id: normalizedTrainerId,
            trainerId: normalizedTrainerId,
          };

          // Update pending certs optimistically - this will update the badge immediately
          console.log(
            `🔄 [TRAINER_MGMT] Calling updatePendingCertsOptimistically with normalized trainerId: ${normalizedTrainerId}, data:`,
            {
              certification_id: normalizedData?.certification_id || normalizedData?.id,
              trainer_id: normalizedData?.trainer_id,
              verification_status: normalizedData?.verification_status,
            }
          );

          // Call updatePendingCertsOptimistically - this will update state immediately
          // The state update will trigger a re-render and the badge will update
          updatePendingCertsOptimistically(normalizedData, 'add');

          console.log(
            `✅ [TRAINER_MGMT] Certification created (PENDING) - added to pending certs optimistically (no reload)`
          );

          // Log current state to verify update (after a short delay to allow state to update)
          setTimeout(() => {
            setTrainerPendingCerts(prev => {
              console.log(
                `📊 [TRAINER_MGMT] State verification - trainerPendingCerts keys:`,
                Object.keys(prev),
                `Count for ${normalizedTrainerId}:`,
                prev[normalizedTrainerId]?.length || 0,
                `All trainer counts:`,
                Object.keys(prev).map(key => ({ trainerId: key, count: prev[key]?.length || 0 }))
              );
              return prev; // Don't modify state, just log
            });
          }, 100);

          // State update is handled by updatePendingCertsOptimistically
          // The badge will update automatically when trainerPendingCerts state changes
          // No background reload - user can manually refresh if needed
        } else if (status === 'VERIFIED' && trainer) {
          // Only process VERIFIED status if trainer is found
          // AI auto-verified - specializations may have changed, update only this trainer
          // Backend already syncs specializations when creating with VERIFIED status
          console.log(
            `🔄 [TRAINER_MGMT] Certification created (VERIFIED) - updating trainer ${trainerId} optimistically (no full reload)`
          );

          // Trigger specialization sync - the endpoint returns the updated trainer with specializations
          console.log(
            `🔄 [TRAINER_MGMT] Triggering specialization sync for trainer ${trainerId} (from created event)`
          );

          trainerService
            .syncTrainerSpecializations(trainerId)
            .then(syncResponse => {
              console.log(
                `✅ [TRAINER_MGMT] Specialization sync response (from created):`,
                syncResponse
              );

              if (syncResponse.success && syncResponse.data?.trainer) {
                // Sync endpoint returns { success: true, data: { trainer } } with updated specializations
                const syncedTrainer = syncResponse.data.trainer;

                // Normalize specializations to array
                const normalizedTrainer = {
                  ...syncedTrainer,
                  specializations: Array.isArray(syncedTrainer.specializations)
                    ? syncedTrainer.specializations.filter(
                        s => s && typeof s === 'string' && s.trim()
                      )
                    : syncedTrainer.specializations
                    ? [syncedTrainer.specializations].filter(
                        s => s && typeof s === 'string' && s.trim()
                      )
                    : [],
                };

                console.log(`📋 [TRAINER_MGMT] Trainer data from sync (from created):`, {
                  id: normalizedTrainer.id,
                  full_name: normalizedTrainer.full_name,
                  specializations: normalizedTrainer.specializations,
                });

                // Check if specializations are still empty after sync
                if (normalizedTrainer.specializations.length === 0) {
                  console.warn(
                    `⚠️ [TRAINER_MGMT] Specializations are still empty after sync for trainer ${trainerId}. This might indicate no valid certifications.`
                  );
                }

                // Update trainer in state immediately with data from sync response
                setTrainers(prev => {
                  const index = prev.findIndex(t => t.id === trainerId);
                  if (index !== -1) {
                    const updated = [...prev];
                    // Merge synced trainer data with existing trainer data to preserve other fields
                    updated[index] = {
                      ...prev[index],
                      ...normalizedTrainer,
                      // Ensure specializations are updated
                      specializations: normalizedTrainer.specializations,
                    };
                    console.log(
                      `✅ [TRAINER_MGMT] Updated trainer ${trainerId} in state with synced data (specializations:`,
                      normalizedTrainer.specializations,
                      ')'
                    );
                    return updated;
                  }
                  console.warn(`⚠️ [TRAINER_MGMT] Trainer ${trainerId} not found in current list`);
                  return prev;
                });

                // Also fetch full trainer data to ensure we have all fields (optional, but ensures consistency)
                // This happens in the background and won't block the UI update
                setTimeout(() => {
                  trainerService
                    .getTrainerById(trainerId)
                    .then(response => {
                      const trainerData = response.data?.trainer || response.data;
                      if (response.success && trainerData) {
                        // Only update if we get different specializations (shouldn't happen, but safety check)
                        setTrainers(prev => {
                          const index = prev.findIndex(t => t.id === trainerId);
                          if (index !== -1) {
                            const currentSpecializations = prev[index].specializations || [];
                            const newSpecializations = Array.isArray(trainerData.specializations)
                              ? trainerData.specializations.filter(
                                  s => s && typeof s === 'string' && s.trim()
                                )
                              : trainerData.specializations
                              ? [trainerData.specializations].filter(
                                  s => s && typeof s === 'string' && s.trim()
                                )
                              : [];

                            // Only update if specializations changed (to avoid unnecessary re-renders)
                            if (
                              JSON.stringify(currentSpecializations) !==
                              JSON.stringify(newSpecializations)
                            ) {
                              console.log(
                                `🔄 [TRAINER_MGMT] Specializations changed after fetch, updating:`,
                                newSpecializations
                              );
                              const updated = [...prev];
                              updated[index] = {
                                ...prev[index],
                                ...trainerData,
                                specializations: newSpecializations,
                              };
                              return updated;
                            }
                          }
                          return prev;
                        });
                      }
                    })
                    .catch(error => {
                      console.error(`❌ [TRAINER_MGMT] Error fetching full trainer data:`, error);
                      // Ignore error - we already updated from sync response
                    });
                }, 500);
              } else {
                console.warn(
                  `⚠️ [TRAINER_MGMT] Specialization sync returned invalid response:`,
                  syncResponse
                );
                // Fallback: fetch trainer directly
                setTimeout(() => {
                  trainerService
                    .getTrainerById(trainerId)
                    .then(response => {
                      const trainerData = response.data?.trainer || response.data;
                      if (response.success && trainerData) {
                        const normalizedTrainer = {
                          ...trainerData,
                          specializations: Array.isArray(trainerData.specializations)
                            ? trainerData.specializations.filter(
                                s => s && typeof s === 'string' && s.trim()
                              )
                            : trainerData.specializations
                            ? [trainerData.specializations].filter(
                                s => s && typeof s === 'string' && s.trim()
                              )
                            : [],
                        };
                        setTrainers(prev => {
                          const index = prev.findIndex(t => t.id === trainerId);
                          if (index !== -1) {
                            const updated = [...prev];
                            updated[index] = normalizedTrainer;
                            return updated;
                          }
                          return prev;
                        });
                      }
                    })
                    .catch(error => {
                      console.error(
                        `❌ [TRAINER_MGMT] Error fetching trainer after sync failure:`,
                        error
                      );
                      // Final fallback: reload entire list
                      reloadTimeout = setTimeout(() => {
                        loadTrainers();
                        loadPendingCertifications();
                        reloadTimeout = null;
                      }, 1000);
                    });
                }, 1000);
              }
            })
            .catch(syncError => {
              console.error(`❌ [TRAINER_MGMT] Error triggering specialization sync:`, syncError);
              // Fallback: fetch trainer directly (backend may have already synced)
              setTimeout(() => {
                trainerService
                  .getTrainerById(trainerId)
                  .then(response => {
                    const trainerData = response.data?.trainer || response.data;
                    if (response.success && trainerData) {
                      const normalizedTrainer = {
                        ...trainerData,
                        specializations: Array.isArray(trainerData.specializations)
                          ? trainerData.specializations.filter(
                              s => s && typeof s === 'string' && s.trim()
                            )
                          : trainerData.specializations
                          ? [trainerData.specializations].filter(
                              s => s && typeof s === 'string' && s.trim()
                            )
                          : [],
                      };
                      setTrainers(prev => {
                        const index = prev.findIndex(t => t.id === trainerId);
                        if (index !== -1) {
                          const updated = [...prev];
                          updated[index] = normalizedTrainer;
                          return updated;
                        }
                        return prev;
                      });
                    }
                  })
                  .catch(error => {
                    console.error(
                      `❌ [TRAINER_MGMT] Error fetching trainer after sync error:`,
                      error
                    );
                    // Final fallback: reload entire list
                    reloadTimeout = setTimeout(() => {
                      loadTrainers();
                      loadPendingCertifications();
                      reloadTimeout = null;
                    }, 1000);
                  });
              }, 1500);
            });

          // Sync pending certs in background
          reloadTimeout = setTimeout(() => {
            loadPendingCertifications();
            reloadTimeout = null;
          }, 1000);
        }
      } else {
        // No trainer_id in data - try to find trainer by user_id or other means
        console.warn(
          `⚠️ [TRAINER_MGMT] No trainer_id in certification:created event. Event data:`,
          data
        );

        // No trainer_id found - log warning but don't reload
        // Optimistic update may still work if trainer can be found by other means
        console.warn(
          `⚠️ [TRAINER_MGMT] No trainer_id in certification:created event. Cannot update badge optimistically.`
        );
      }
    };

    const handleCertificationDeleted = (event: CustomEvent) => {
      console.log('📢 certification:deleted event received in TrainerManagement:', event.detail);
      const data = event.detail;

      // Remove certification from pending list optimistically (no reload)
      updatePendingCertsOptimistically(data, 'remove');

      // Background sync after delay
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      // No background reload - optimistic update is sufficient
      // User can manually refresh if needed
    };

    // Listen to custom events (dispatched by AppLayout from socket events)
    // This is more reliable than accessing socket directly
    console.log('🔧 [TRAINER_MGMT] Registering event listeners for certification events');

    // Add listeners to both window and document for better compatibility
    const handleCreated = handleCertificationCreated as EventListener;
    const handleUpdated = handleCertificationUpdated as EventListener;
    const handleDeleted = handleCertificationDeleted as EventListener;

    window.addEventListener('certification:updated', handleUpdated);
    window.addEventListener('certification:created', handleCreated);
    window.addEventListener('certification:deleted', handleDeleted);

    document.addEventListener('certification:updated', handleUpdated);
    document.addEventListener('certification:created', handleCreated);
    document.addEventListener('certification:deleted', handleDeleted);

    console.log(
      '✅ [TRAINER_MGMT] Event listeners registered successfully on both window and document'
    );

    return () => {
      window.removeEventListener('certification:updated', handleUpdated);
      window.removeEventListener('certification:created', handleCreated);
      window.removeEventListener('certification:deleted', handleDeleted);

      document.removeEventListener('certification:updated', handleUpdated);
      document.removeEventListener('certification:created', handleCreated);
      document.removeEventListener('certification:deleted', handleDeleted);

      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
    };
  }, [trainers]); // Include trainers in dependency to ensure we always use the latest trainers list

  const loadTrainers = async () => {
    try {
      setIsLoading(true);
      const response = await trainerService.getAllTrainers();

      if (response.success) {
        // Handle different response structures
        let trainersList: Trainer[] = [];

        if (Array.isArray(response.data)) {
          // Direct array response
          trainersList = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Object with trainers property: { trainers: [...] }
          const data = response.data as any;
          trainersList = data.trainers || data.data?.trainers || [];
        }

        // Ensure specializations is always an array
        trainersList = trainersList.map(trainer => ({
          ...trainer,
          specializations: Array.isArray(trainer.specializations)
            ? trainer.specializations
            : trainer.specializations
            ? [trainer.specializations]
            : [],
        }));

        console.log('📋 Loaded trainers:', trainersList.length);
        console.log('📋 Sample trainer specializations:', trainersList[0]?.specializations);

        setTrainers(trainersList);

        // Show info if no trainers found
        if (trainersList.length === 0) {
          console.info(
            'No trainers found in database. Trainers need to be created in schedule-service.'
          );
        }
      } else {
        console.warn('API returned success: false', response);
        setTrainers([]);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách huấn luyện viên', 'error');
      console.error('Error loading trainers:', error);
      setTrainers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Hoạt động';
      case 'INACTIVE':
        return 'Không hoạt động';
      case 'ON_LEAVE':
        return 'Nghỉ phép';
      case 'TERMINATED':
        return 'Đã chấm dứt';
      default:
        return 'Hoạt động';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'INACTIVE':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'ON_LEAVE':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
      case 'TERMINATED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      default:
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
    }
  };

  const getSpecializationLabel = (spec: string) => {
    switch (spec?.toUpperCase()) {
      case 'CARDIO':
        return 'Tim mạch';
      case 'STRENGTH':
        return 'Sức mạnh';
      case 'YOGA':
        return 'Yoga';
      case 'PILATES':
        return 'Pilates';
      case 'DANCE':
        return 'Khiêu vũ';
      case 'MARTIAL_ARTS':
        return 'Võ thuật';
      case 'AQUA':
        return 'Bơi lội';
      case 'FUNCTIONAL':
        return 'Chức năng';
      case 'RECOVERY':
        return 'Phục hồi';
      case 'SPECIALIZED':
        return 'Chuyên biệt';
      default:
        return spec || '-';
    }
  };

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalTrainers = trainers.length;
    const activeTrainers = trainers.filter(t => t.status === 'ACTIVE').length;
    const inactiveTrainers = trainers.filter(
      t => t.status === 'INACTIVE' || t.status === 'TERMINATED'
    ).length;
    const totalClasses = trainers.reduce((sum, t) => sum + (t.total_classes || 0), 0);

    return {
      totalTrainers,
      activeTrainers,
      inactiveTrainers,
      totalClasses,
    };
  }, [trainers]);

  const filteredTrainers = Array.isArray(trainers)
    ? trainers.filter(trainer => {
        // Search filter - improved to match full name
        const searchLower = searchTerm.trim().toLowerCase();
        const fullName = trainer?.full_name || '';
        const matchesSearch =
          !searchLower ||
          fullName.toLowerCase().includes(searchLower) ||
          trainer?.email?.toLowerCase().includes(searchLower) ||
          trainer?.phone?.toLowerCase().includes(searchLower) ||
          searchLower.split(/\s+/).every(word => fullName.toLowerCase().includes(word));

        // Status filter
        const matchesStatus =
          statusFilter === 'all' ||
          trainer?.status === statusFilter ||
          (!trainer?.status && statusFilter === 'ACTIVE');

        // Specialization filter
        const matchesSpecialization =
          specializationFilter === 'all' ||
          (trainer?.specializations &&
            Array.isArray(trainer.specializations) &&
            trainer.specializations.includes(specializationFilter));

        return matchesSearch && matchesStatus && matchesSpecialization;
      })
    : [];

  const totalPages = Math.ceil(filteredTrainers.length / itemsPerPage);
  const paginatedTrainers = filteredTrainers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (!trainerToDelete) return;

    setIsDeleting(true);
    try {
      await trainerService.deleteTrainer(trainerToDelete.id);
      showToast('Xóa huấn luyện viên thành công', 'success');
      await loadTrainers();
      setIsDeleteDialogOpen(false);
      setTrainerToDelete(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa huấn luyện viên', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = () => {
    setSelectedTrainer(null);
    setIsFormModalOpen(true);
  };

  const handleSave = async (data: Partial<Trainer>) => {
    try {
      if (selectedTrainer) {
        await trainerService.updateTrainer(selectedTrainer.id, data);
        // Toast sẽ được hiển thị trong TrainerFormModal
      } else {
        // For create, redirect to create page
        window.location.href = '/create-trainer';
        return;
      }
      await loadTrainers();
      setIsFormModalOpen(false);
      setSelectedTrainer(null);
    } catch (error: any) {
      // Error toast sẽ được hiển thị trong TrainerFormModal
      throw error;
    }
  };

  const handleReviewCertification = (trainer: Trainer) => {
    const pendingCerts = trainerPendingCerts[trainer.id];
    if (pendingCerts && pendingCerts.length > 0) {
      setSelectedCertification(pendingCerts[0]);
      setSelectedTrainerForReview(trainer);
      setIsReviewModalOpen(true);
    }
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Huấn luyện viên
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Quản lý tất cả huấn luyện viên trong hệ thống
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={loadTrainers}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <RefreshCw className='w-4 h-4' />
            Làm mới
          </button>
          <button
            onClick={handleCreate}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <Plus className='w-4 h-4' />
            Thêm huấn luyện viên
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <User className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalTrainers}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng số huấn luyện viên
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <CheckCircle2 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.activeTrainers}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Đang hoạt động
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <XCircle className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.inactiveTrainers}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Không hoạt động
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <BookOpen className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalClasses.toLocaleString()}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng số lớp học
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
          {/* Search Input */}
          <div className='md:col-span-2 group relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
            <input
              type='text'
              placeholder='Tìm kiếm huấn luyện viên...'
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Hoạt động' },
                { value: 'INACTIVE', label: 'Không hoạt động' },
                { value: 'ON_LEAVE', label: 'Nghỉ phép' },
                { value: 'TERMINATED', label: 'Đã chấm dứt' },
              ]}
              value={statusFilter}
              onChange={value => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
              placeholder='Tất cả trạng thái'
              className='font-inter'
            />
          </div>

          {/* Specialization Filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: 'Tất cả chuyên môn' },
                { value: 'CARDIO', label: 'Tim mạch' },
                { value: 'STRENGTH', label: 'Sức mạnh' },
                { value: 'YOGA', label: 'Yoga' },
                { value: 'PILATES', label: 'Pilates' },
                { value: 'DANCE', label: 'Khiêu vũ' },
                { value: 'MARTIAL_ARTS', label: 'Võ thuật' },
                { value: 'AQUA', label: 'Bơi lội' },
                { value: 'FUNCTIONAL', label: 'Chức năng' },
                { value: 'RECOVERY', label: 'Phục hồi' },
                { value: 'SPECIALIZED', label: 'Chuyên biệt' },
              ]}
              value={specializationFilter}
              onChange={value => {
                setSpecializationFilter(value);
                setCurrentPage(1);
              }}
              placeholder='Tất cả chuyên môn'
              className='font-inter'
            />
          </div>
        </div>
      </div>

      {/* Export and Actions */}
      <div className='flex justify-between items-center mb-4'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          Tổng cộng: {filteredTrainers.length} huấn luyện viên
        </div>
        {filteredTrainers.length > 0 && (
          <ExportButton
            data={filteredTrainers.map(trainer => ({
              'Họ và tên': trainer.full_name,
              Email: trainer.email || '',
              'Số điện thoại': trainer.phone || '',
              'Trạng thái':
                trainer.status === 'ACTIVE'
                  ? 'Hoạt động'
                  : trainer.status === 'INACTIVE'
                  ? 'Không hoạt động'
                  : trainer.status === 'ON_LEAVE'
                  ? 'Nghỉ phép'
                  : trainer.status === 'TERMINATED'
                  ? 'Đã chấm dứt'
                  : trainer.status || '',
              'Chuyên môn': Array.isArray(trainer.specializations)
                ? trainer.specializations.join(', ')
                : trainer.specializations || '',
              'Kinh nghiệm (năm)': trainer.experience_years || 0,
              'Đánh giá trung bình': trainer.rating_average || 0,
              'Tổng số lớp': trainer.total_classes || 0,
              'Giá mỗi giờ': trainer.hourly_rate ? `${trainer.hourly_rate} VND` : '',
              'Ngày tạo': trainer.created_at ? formatVietnamDateTime(trainer.created_at) : '',
            }))}
            columns={[
              { key: 'Họ và tên', label: 'Họ và tên' },
              { key: 'Email', label: 'Email' },
              { key: 'Số điện thoại', label: 'Số điện thoại' },
              { key: 'Trạng thái', label: 'Trạng thái' },
              { key: 'Chuyên môn', label: 'Chuyên môn' },
              { key: 'Kinh nghiệm (năm)', label: 'Kinh nghiệm (năm)' },
              { key: 'Đánh giá trung bình', label: 'Đánh giá trung bình' },
            ]}
            filename='danh-sach-huan-luyen-vien'
            title='Danh sách Huấn luyện viên'
            variant='outline'
            size='sm'
          />
        )}
      </div>

      {/* Trainers List */}
      {isLoading ? (
        <TableLoading text='Đang tải danh sách trainer...' />
      ) : filteredTrainers.length === 0 ? (
        <AdminCard padding='md' className='text-center'>
          <div className='flex flex-col items-center justify-center py-12'>
            <User className='w-20 h-20 text-gray-300 dark:text-gray-700 mb-4' />
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-heading mb-2'>
              {searchTerm ? 'Không tìm thấy huấn luyện viên nào' : 'Không có huấn luyện viên nào'}
            </div>
            {!searchTerm && trainers.length === 0 && (
              <div className='text-theme-xs text-gray-400 dark:text-gray-500 font-inter mt-2'>
                Tạo tài khoản trainer mới để bắt đầu quản lý huấn luyện viên
              </div>
            )}
          </div>
        </AdminCard>
      ) : (
        <>
          <AdminCard padding='none'>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header className='w-[15%]'>
                    <span className='whitespace-nowrap'>Huấn luyện viên</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[13%]'>
                    <span className='whitespace-nowrap'>Liên hệ</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[13%] hidden md:table-cell'>
                    <span className='whitespace-nowrap'>Chuyên môn</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[10%]'>
                    <span className='whitespace-nowrap'>Kinh nghiệm</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[8%] hidden lg:table-cell'>
                    <span className='whitespace-nowrap'>Đánh giá</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[8%] hidden lg:table-cell'>
                    <span className='whitespace-nowrap'>Lớp học</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[10%]'>
                    <span className='whitespace-nowrap'>Trạng thái</span>
                  </AdminTableCell>
                  <AdminTableCell header className='w-[11%] hidden md:table-cell'>
                    <span className='whitespace-nowrap'>Giá/giờ</span>
                  </AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {paginatedTrainers.map((trainer, index) => {
                  // Check pending certs by trainer.id (trainer ID from schedule service)
                  // Also check by user_id as fallback in case of mismatch
                  // Use Set to avoid counting duplicates if same cert exists in both keys
                  const certsById = trainerPendingCerts[trainer.id] || [];
                  const certsByUserId = trainer.user_id
                    ? trainerPendingCerts[trainer.user_id] || []
                    : [];

                  // Combine and deduplicate by certification id
                  const allPendingCerts = new Map<string, Certification>();
                  certsById.forEach(cert => allPendingCerts.set(cert.id, cert));
                  certsByUserId.forEach(cert => allPendingCerts.set(cert.id, cert));

                  const pendingCertsCount = allPendingCerts.size;
                  const hasPendingCerts = pendingCertsCount > 0;

                  // Debug logging for all trainers with pending certs or first trainer
                  if ((hasPendingCerts || index === 0) && index < 3) {
                    console.log(
                      `🔍 [TRAINER_MGMT] Render - Trainer ${trainer.full_name} (id: ${trainer.id}, user_id: ${trainer.user_id})`,
                      `hasPendingCerts: ${hasPendingCerts}, pendingCertsCount: ${pendingCertsCount}`,
                      `certsById: ${certsById.length}, certsByUserId: ${certsByUserId.length}, unique: ${allPendingCerts.size}`,
                      `trainerPendingCerts keys:`,
                      Object.keys(trainerPendingCerts),
                      `trainerPendingCerts[trainer.id]:`,
                      trainerPendingCerts[trainer.id],
                      `trainerPendingCerts[trainer.user_id]:`,
                      trainer.user_id ? trainerPendingCerts[trainer.user_id] : 'N/A'
                    );
                  }
                  return (
                    <AdminTableRow
                      key={trainer.id}
                      className={`group relative border-l-4 transition-all duration-200 cursor-pointer ${
                        hasPendingCerts
                          ? 'border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20'
                          : 'border-l-transparent hover:border-l-orange-500'
                      } ${
                        index % 2 === 0
                          ? hasPendingCerts
                            ? 'bg-yellow-50/30 dark:bg-yellow-900/10'
                            : 'bg-white dark:bg-gray-900'
                          : hasPendingCerts
                          ? 'bg-yellow-50/40 dark:bg-yellow-900/15'
                          : 'bg-gray-50/50 dark:bg-gray-800/50'
                      } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                      onClick={(e?: React.MouseEvent) => {
                        if (e) {
                          e.stopPropagation();
                          setSelectedTrainerForAction(trainer);
                          setMenuPosition({ x: e.clientX, y: e.clientY });
                          setActionMenuOpen(true);
                        }
                      }}
                    >
                      <AdminTableCell className='overflow-hidden'>
                        <div className='flex items-center gap-1.5 sm:gap-2'>
                          <div className='relative flex-shrink-0'>
                            {trainer.profile_photo ? (
                              <>
                                <img
                                  src={trainer.profile_photo}
                                  alt={trainer.full_name}
                                  className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm'
                                  onError={e => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget
                                      .nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.classList.remove('hidden');
                                      fallback.classList.add('flex');
                                    }
                                  }}
                                />
                                <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 items-center justify-center shadow-sm hidden'>
                                  <User className='w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400' />
                                </div>
                              </>
                            ) : (
                              <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 flex items-center justify-center shadow-sm'>
                                <User className='w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400' />
                              </div>
                            )}
                          </div>
                          <div className='min-w-0 flex-1 overflow-hidden'>
                            <div className='flex items-center gap-1.5'>
                              <div className='text-[9px] sm:text-[10px] md:text-[11px] font-semibold font-heading text-gray-900 dark:text-white truncate leading-tight'>
                                {trainer.full_name}
                              </div>
                              {hasPendingCerts && (
                                <span className='flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-500 dark:bg-yellow-600 text-white text-[8px] font-bold font-heading rounded-full border border-yellow-600 dark:border-yellow-700 shadow-sm'>
                                  <AlertCircle className='w-2.5 h-2.5' />
                                  {pendingCertsCount}
                                </span>
                              )}
                            </div>
                            {trainer.bio && (
                              <div className='text-[8px] sm:text-[9px] text-gray-500 dark:text-gray-400 font-inter truncate mt-0.5 leading-tight'>
                                {trainer.bio}
                              </div>
                            )}
                          </div>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden'>
                        <div className='space-y-0.5 sm:space-y-1'>
                          <div className='flex items-center gap-1 sm:gap-1.5 min-w-0'>
                            <Mail className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                            <span className='text-[9px] sm:text-[10px] md:text-[11px] font-medium font-heading text-gray-700 dark:text-gray-300 truncate leading-tight'>
                              {trainer.email}
                            </span>
                          </div>
                          {trainer.phone && (
                            <div className='flex items-center gap-1 sm:gap-1.5 min-w-0'>
                              <Phone className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                              <span className='text-[9px] sm:text-[10px] md:text-[11px] font-medium font-heading text-gray-700 dark:text-gray-300 truncate leading-tight'>
                                {trainer.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden hidden md:table-cell'>
                        {(() => {
                          const specs = Array.isArray(trainer.specializations)
                            ? trainer.specializations.filter(
                                s => s && typeof s === 'string' && s.trim()
                              )
                            : [];

                          return specs.length > 0 ? (
                            <div className='flex flex-wrap gap-1 overflow-hidden'>
                              {specs.slice(0, 2).map((spec, idx) => (
                                <span
                                  key={idx}
                                  className='px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-[9px] rounded-full font-semibold font-heading border border-orange-200 dark:border-orange-800 truncate max-w-full'
                                  title={spec}
                                >
                                  {getSpecializationLabel(spec)}
                                </span>
                              ))}
                              {specs.length > 2 && (
                                <span className='px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[9px] rounded-full font-semibold font-heading border border-gray-200 dark:border-gray-700'>
                                  +{specs.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className='text-theme-xs text-gray-400 dark:text-gray-500 font-inter'>
                              -
                            </span>
                          );
                        })()}
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className='flex items-center gap-1 sm:gap-1.5'>
                          <Briefcase className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                          <span className='text-[9px] sm:text-[10px] md:text-[11px] font-semibold font-heading text-gray-900 dark:text-white'>
                            {trainer.experience_years} năm
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='hidden lg:table-cell'>
                        <div className='flex items-center gap-1 sm:gap-1.5'>
                          {trainer.rating_average !== undefined && trainer.rating_average > 0 ? (
                            <>
                              <Star className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500 fill-yellow-500 flex-shrink-0' />
                              <span className='text-[9px] sm:text-[10px] md:text-[11px] font-semibold font-heading text-gray-900 dark:text-white'>
                                {trainer.rating_average.toFixed(1)}
                              </span>
                            </>
                          ) : (
                            <span className='text-[9px] sm:text-[10px] md:text-[11px] text-gray-400 dark:text-gray-500 font-inter'>
                              Chưa có
                            </span>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className='hidden lg:table-cell'>
                        <div className='flex items-center gap-1 sm:gap-1.5'>
                          <BookOpen className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                          {trainer.total_classes !== undefined && trainer.total_classes > 0 ? (
                            <span className='text-[9px] sm:text-[10px] md:text-[11px] font-semibold font-heading text-gray-900 dark:text-white'>
                              {trainer.total_classes}
                            </span>
                          ) : (
                            <span className='text-[9px] sm:text-[10px] md:text-[11px] text-gray-400 dark:text-gray-500 font-heading'>
                              0
                            </span>
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <StatusBadge status={trainer.status === 'ACTIVE'} size='sm' />
                      </AdminTableCell>
                      <AdminTableCell className='hidden md:table-cell'>
                        <div className='flex items-center gap-1 sm:gap-1.5'>
                          {trainer.hourly_rate ? (
                            <>
                              <DollarSign className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500 flex-shrink-0' />
                              <span className='text-[9px] sm:text-[10px] md:text-[11px] font-semibold font-heading text-gray-900 dark:text-white'>
                                {trainer.hourly_rate.toLocaleString()} VNĐ
                              </span>
                            </>
                          ) : (
                            <span className='text-[9px] sm:text-[10px] md:text-[11px] text-gray-400 dark:text-gray-500 font-inter'>
                              -
                            </span>
                          )}
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTrainers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={newItemsPerPage => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

      {/* Form Modal */}
      <TrainerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedTrainer(null);
        }}
        onSave={handleSave}
        trainer={selectedTrainer}
      />

      {/* Action Menu Popup */}
      {actionMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => {
              setActionMenuOpen(false);
              setSelectedTrainerForAction(null);
            }}
          />
          {/* Popup */}
          <div
            className='fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-2 min-w-[180px]'
            style={{
              left: `${Math.min(menuPosition.x, window.innerWidth - 200)}px`,
              top: `${Math.min(menuPosition.y + 10, window.innerHeight - 150)}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
              <p className='text-xs font-semibold font-heading text-gray-900 dark:text-white truncate max-w-[200px]'>
                {selectedTrainerForAction?.full_name}
              </p>
            </div>
            <div className='py-1'>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  handleEdit(selectedTrainerForAction!);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150'
              >
                <Edit className='w-3.5 h-3.5' />
                Sửa
              </button>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  setSelectedTrainer(selectedTrainerForAction);
                  setIsViewCertificationsModalOpen(true);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150'
              >
                <Award className='w-3.5 h-3.5' />
                Xem chứng chỉ
              </button>
              {selectedTrainerForAction &&
                trainerPendingCerts[selectedTrainerForAction.id]?.length > 0 && (
                  <button
                    onClick={() => {
                      setActionMenuOpen(false);
                      handleReviewCertification(selectedTrainerForAction!);
                    }}
                    className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-warning-600 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-900/20 transition-colors duration-150'
                  >
                    <AlertCircle className='w-3.5 h-3.5' />
                    Duyệt chứng chỉ
                  </button>
                )}
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  setTrainerToDelete(selectedTrainerForAction);
                  setIsDeleteDialogOpen(true);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors duration-150'
              >
                <Trash2 className='w-3.5 h-3.5' />
                Xóa
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setTrainerToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xác nhận xóa huấn luyện viên'
        message={`Bạn có chắc chắn muốn xóa huấn luyện viên "${trainerToDelete?.full_name}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
        isLoading={isDeleting}
      />

      {/* Review Certification Modal */}
      <ReviewCertificationModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedCertification(null);
          setSelectedTrainerForReview(null);
        }}
        certification={selectedCertification}
        trainerName={selectedTrainerForReview?.full_name}
        onReviewComplete={() => {
          // Socket events will handle the updates optimistically
          // Just sync pending certs in background, no need to reload entire trainers list
          setTimeout(() => {
            loadPendingCertifications();
          }, 1000);
        }}
      />

      {/* View Trainer Certifications Modal */}
      <ViewTrainerCertificationsModal
        isOpen={isViewCertificationsModalOpen}
        onClose={() => {
          setIsViewCertificationsModalOpen(false);
          setSelectedTrainer(null);
        }}
        trainer={selectedTrainer}
        highlightCertificationId={searchParams.get('certification_id') || undefined}
        onCertificationDeleted={() => {
          // Socket events will handle the updates optimistically
          // No reload needed - optimistic update is sufficient
        }}
      />
    </div>
  );
};

export default TrainerManagement;
