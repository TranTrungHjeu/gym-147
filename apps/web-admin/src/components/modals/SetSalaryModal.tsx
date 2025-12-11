import React, { useState, useEffect } from 'react';
import { X, DollarSign, User, Mail } from 'lucide-react';
import useTranslation from '../../hooks/useTranslation';
import { salaryService } from '../../services/salary.service';
import { useToast } from '../../hooks/useToast';

interface SetSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainerId: string;
  trainerName: string;
  onSuccess?: () => void;
}

const SetSalaryModal: React.FC<SetSalaryModalProps> = ({
  isOpen,
  onClose,
  trainerId,
  trainerName,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSalary, setCurrentSalary] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && trainerId) {
      loadCurrentSalary();
    }
  }, [isOpen, trainerId]);

  const loadCurrentSalary = async () => {
    try {
      const response = await salaryService.getTrainerSalaryStatus(trainerId);
      if (response.success && response.data) {
        setCurrentSalary(response.data.hourly_rate);
        if (response.data.hourly_rate) {
          setHourlyRate(response.data.hourly_rate.toString());
        }
      }
    } catch (error: any) {
      console.error('Error loading current salary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      showToast('error', t('setSalaryModal.errors.invalidRate'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await salaryService.setTrainerSalary(trainerId, rate, notes);

      if (response.success) {
        showToast('success', t('setSalaryModal.messages.setSuccess'));
        onSuccess?.();
        onClose();
        // Reset form
        setHourlyRate('');
        setNotes('');
      } else {
        showToast('error', response.message || t('setSalaryModal.errors.setFailed'));
      }
    } catch (error: any) {
      showToast('error', error.message || t('setSalaryModal.errors.setFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {t('setSalaryModal.title')}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{trainerName}</span>
              </div>
              {currentSalary && (
                <div className="text-sm text-gray-500">
                  {t('setSalaryModal.currentSalary', { amount: currentSalary.toLocaleString('vi-VN') })}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('setSalaryModal.form.hourlyRate')}
                </label>
                <input
                  type="number"
                  id="hourlyRate"
                  value={hourlyRate}
                  onChange={e => setHourlyRate(e.target.value)}
                  placeholder={t('setSalaryModal.form.hourlyRatePlaceholder')}
                  min="0"
                  step="1000"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('setSalaryModal.form.example')}
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('setSalaryModal.form.notes')}
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('setSalaryModal.form.notesPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? t('common.processing') : t('setSalaryModal.setSalary')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetSalaryModal;

