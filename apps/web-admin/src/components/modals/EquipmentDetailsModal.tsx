import React from 'react';
import { MapPin, Hash, Calendar, Clock, Weight, Activity, Wrench, Zap, Wifi, Package } from 'lucide-react';
import Modal from '../Modal/Modal';
import { Equipment } from '../../services/equipment.service';
import useTranslation from '../../hooks/useTranslation';
import EquipmentIcon from '../equipment/EquipmentIcon';

interface EquipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  onEdit?: () => void;
}

const EquipmentDetailsModal: React.FC<EquipmentDetailsModalProps> = ({
  isOpen,
  onClose,
  equipment,
  onEdit,
}) => {
  const { t } = useTranslation();

  if (!equipment) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800';
      case 'IN_USE':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'MAINTENANCE':
        return 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800';
      case 'OUT_OF_ORDER':
        return 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800';
      case 'RESERVED':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CARDIO':
        return 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800';
      case 'STRENGTH':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'FREE_WEIGHTS':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'FUNCTIONAL':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
      case 'STRETCHING':
        return 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800';
      case 'RECOVERY':
        return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
      case 'SPECIALIZED':
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-4xl m-4'>
      <div className='relative w-full max-w-4xl overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[90vh]'>
        {/* Header */}
        <div className='sticky top-0 z-10 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700 px-6 py-4 rounded-t-2xl'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-bold font-heading text-gray-900 dark:text-white'>
              {t('equipmentManagement.details.title')}
            </h2>
            {onEdit && (
              <button
                onClick={onEdit}
                className='px-4 py-2 text-theme-xs font-semibold font-heading text-orange-700 dark:text-orange-300 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-all duration-200'
              >
                {t('equipmentManagement.actions.edit')}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {/* Photo and Basic Info */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Photo */}
            <div className='space-y-3'>
              <h3 className='text-sm font-semibold font-heading text-gray-900 dark:text-white'>
                {t('equipmentManagement.details.photo')}
              </h3>
              {equipment.photo ? (
                <div className='relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800'>
                  <img
                    src={equipment.photo}
                    alt={equipment.name}
                    className='w-full h-full object-cover'
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-equipment.png';
                    }}
                  />
                </div>
              ) : (
                <div className='relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center'>
                  <div className='text-center'>
                    <Package className='w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-2' />
                    <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
                      {t('equipmentManagement.details.noPhoto')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className='space-y-4'>
              <div>
                <h3 className='text-lg font-bold font-heading text-gray-900 dark:text-white mb-2'>
                  {equipment.name}
                </h3>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-theme-xs font-semibold font-heading tracking-wide ${getStatusColor(
                      equipment.status
                    )}`}
                  >
                    {t(`equipmentManagement.statuses.${equipment.status}`) || equipment.status}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-theme-xs font-semibold font-heading tracking-wide ${getCategoryColor(
                      equipment.category
                    )}`}
                  >
                    {t(`equipmentManagement.categories.${equipment.category}`) || equipment.category}
                  </span>
                </div>
              </div>

              {/* Category Icon */}
              <div className='flex items-center gap-3'>
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${getCategoryColor(
                    equipment.category
                  )} p-4 shadow-md`}
                >
                  <EquipmentIcon category={equipment.category} className='w-full h-full' use3DIcon={true} />
                </div>
                <div className='flex-1'>
                  {(equipment.brand || equipment.model) && (
                    <div className='flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300 font-inter mb-1'>
                      <Hash className='w-4 h-4 text-gray-400 dark:text-gray-500' />
                      <span className='font-semibold font-heading'>
                        {equipment.brand && equipment.model
                          ? `${equipment.brand} ${equipment.model}`
                          : equipment.brand || equipment.model}
                      </span>
                    </div>
                  )}
                  {equipment.location && (
                    <div className='flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-400 font-inter'>
                      <MapPin className='w-4 h-4 text-gray-400 dark:text-gray-500' />
                      <span>{equipment.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Information Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Usage Hours */}
            {equipment.usage_hours !== undefined && (
              <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50'>
                <div className='flex items-center gap-3 mb-2'>
                  <Clock className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.usageHours')}
                  </span>
                </div>
                <p className='text-lg font-bold font-heading text-blue-700 dark:text-blue-300'>
                  {equipment.usage_hours} {t('equipmentManagement.details.hours')}
                </p>
              </div>
            )}

            {/* Max Weight */}
            {equipment.max_weight && (
              <div className='p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/50'>
                <div className='flex items-center gap-3 mb-2'>
                  <Weight className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.maxWeight')}
                  </span>
                </div>
                <p className='text-lg font-bold font-heading text-purple-700 dark:text-purple-300'>
                  {equipment.max_weight} kg
                </p>
              </div>
            )}

            {/* Usage Count */}
            {equipment._count?.usage_logs !== undefined && (
              <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/50'>
                <div className='flex items-center gap-3 mb-2'>
                  <Activity className='w-5 h-5 text-green-600 dark:text-green-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.usageCount')}
                  </span>
                </div>
                <p className='text-lg font-bold font-heading text-green-700 dark:text-green-300'>
                  {equipment._count.usage_logs}
                </p>
              </div>
            )}

            {/* Maintenance Count */}
            {equipment._count?.maintenance_logs !== undefined && (
              <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-800/50'>
                <div className='flex items-center gap-3 mb-2'>
                  <Wrench className='w-5 h-5 text-yellow-600 dark:text-yellow-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.maintenanceCount')}
                  </span>
                </div>
                <p className='text-lg font-bold font-heading text-yellow-700 dark:text-yellow-300'>
                  {equipment._count.maintenance_logs}
                </p>
              </div>
            )}

            {/* Serial Number */}
            {equipment.serial_number && (
              <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-3 mb-2'>
                  <Hash className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.serialNumber')}
                  </span>
                </div>
                <p className='text-base font-medium font-inter text-gray-900 dark:text-white'>
                  {equipment.serial_number}
                </p>
              </div>
            )}

            {/* Sensor ID */}
            {equipment.sensor_id && (
              <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-3 mb-2'>
                  <Zap className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.sensorId')}
                  </span>
                </div>
                <p className='text-base font-medium font-inter text-gray-900 dark:text-white'>
                  {equipment.sensor_id}
                </p>
              </div>
            )}

            {/* Purchase Date */}
            {equipment.purchase_date && (
              <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-3 mb-2'>
                  <Calendar className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.purchaseDate')}
                  </span>
                </div>
                <p className='text-base font-medium font-inter text-gray-900 dark:text-white'>
                  {new Date(equipment.purchase_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Warranty Until */}
            {equipment.warranty_until && (
              <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-3 mb-2'>
                  <Calendar className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.warrantyUntil')}
                  </span>
                </div>
                <p className='text-base font-medium font-inter text-gray-900 dark:text-white'>
                  {new Date(equipment.warranty_until).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Last Maintenance */}
            {equipment.last_maintenance && (
              <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-3 mb-2'>
                  <Wrench className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.lastMaintenance')}
                  </span>
                </div>
                <p className='text-base font-medium font-inter text-gray-900 dark:text-white'>
                  {new Date(equipment.last_maintenance).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Next Maintenance */}
            {equipment.next_maintenance && (
              <div className='p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800'>
                <div className='flex items-center gap-3 mb-2'>
                  <Calendar className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.nextMaintenance')}
                  </span>
                </div>
                <p className='text-base font-medium font-inter text-orange-700 dark:text-orange-300'>
                  {new Date(equipment.next_maintenance).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Queue Count */}
            {equipment._count?.queue !== undefined && equipment._count.queue > 0 && (
              <div className='p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl border border-warning-200 dark:border-warning-800'>
                <div className='flex items-center gap-3 mb-2'>
                  <Zap className='w-5 h-5 text-warning-600 dark:text-warning-400' />
                  <span className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    {t('equipmentManagement.details.queueCount')}
                  </span>
                </div>
                <p className='text-lg font-bold font-heading text-warning-700 dark:text-warning-300'>
                  {equipment._count.queue}
                </p>
              </div>
            )}
          </div>

          {/* Smart Features */}
          {(equipment.has_heart_monitor ||
            equipment.has_calorie_counter ||
            equipment.has_rep_counter ||
            equipment.wifi_enabled) && (
            <div className='pt-4 border-t border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2 mb-3'>
                <Zap className='w-5 h-5 text-orange-500 dark:text-orange-400' />
                <h3 className='text-base font-semibold font-heading text-gray-900 dark:text-white'>
                  {t('equipmentManagement.details.features')}
                </h3>
              </div>
              <div className='flex items-center gap-2 flex-wrap'>
                {equipment.has_heart_monitor && (
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-theme-xs font-semibold font-heading bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-sm'>
                    <Activity className='w-4 h-4' />
                    {t('equipmentManagement.details.heartMonitor')}
                  </span>
                )}
                {equipment.has_calorie_counter && (
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-theme-xs font-semibold font-heading bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shadow-sm'>
                    <Zap className='w-4 h-4' />
                    {t('equipmentManagement.details.calorieCounter')}
                  </span>
                )}
                {equipment.has_rep_counter && (
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-theme-xs font-semibold font-heading bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm'>
                    <Activity className='w-4 h-4' />
                    {t('equipmentManagement.details.repCounter')}
                  </span>
                )}
                {equipment.wifi_enabled && (
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-theme-xs font-semibold font-heading bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm'>
                    <Wifi className='w-4 h-4' />
                    {t('equipmentManagement.details.wifiEnabled')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className='pt-4 border-t border-gray-200 dark:border-gray-700'>
            <div className='grid grid-cols-2 gap-4 text-theme-xs text-gray-600 dark:text-gray-400 font-inter'>
              <div>
                <span className='font-semibold'>{t('equipmentManagement.details.createdAt')}:</span>{' '}
                {new Date(equipment.created_at).toLocaleString()}
              </div>
              <div>
                <span className='font-semibold'>{t('equipmentManagement.details.updatedAt')}:</span>{' '}
                {new Date(equipment.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 rounded-b-2xl flex justify-end'>
          <button
            onClick={onClose}
            className='px-5 py-2.5 text-theme-xs font-semibold font-inter text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md'
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EquipmentDetailsModal;

