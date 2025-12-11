import { useState, useEffect } from 'react';
import useTranslation from '../../hooks/useTranslation';
import AdminModal from './AdminModal';
import Button from '../ui/Button/Button';
import CustomSelect from './CustomSelect';
import DatePicker from './DatePicker';
import { PerformanceGoal } from '../../services/schedule.service';

interface SetGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Omit<PerformanceGoal, 'id' | 'current_value' | 'status' | 'progress_percentage'>) => Promise<void>;
  editingGoal?: PerformanceGoal | null;
}

// GOAL_TYPES sẽ được tạo trong component để có access đến t()

export default function SetGoalModal({ isOpen, onClose, onSave, editingGoal }: SetGoalModalProps) {
  const { t } = useTranslation();
  const GOAL_TYPES = [
    { value: 'classes', label: t('setGoalModal.goalTypes.classes'), unit: t('setGoalModal.units.classes') },
    { value: 'students', label: t('setGoalModal.goalTypes.students'), unit: t('setGoalModal.units.students') },
    { value: 'rating', label: t('setGoalModal.goalTypes.rating'), unit: t('setGoalModal.units.rating') },
    { value: 'revenue', label: t('setGoalModal.goalTypes.revenue'), unit: t('setGoalModal.units.revenue') },
    { value: 'attendance', label: t('setGoalModal.goalTypes.attendance'), unit: t('setGoalModal.units.attendance') },
    { value: 'sessions', label: t('setGoalModal.goalTypes.sessions'), unit: t('setGoalModal.units.sessions') },
  ];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState('classes');
  const [targetValue, setTargetValue] = useState<number>(0);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description);
      setTargetValue(editingGoal.target_value);
      setDeadline(editingGoal.deadline.split('T')[0]); // Extract date part
      // Try to infer goal type from unit
      const type = GOAL_TYPES.find(t => t.unit === editingGoal.unit);
      if (type) {
        setGoalType(type.value);
      }
    } else {
      resetForm();
    }
  }, [editingGoal, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGoalType('classes');
    setTargetValue(0);
    setDeadline('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('setGoalModal.errors.titleRequired'),
          duration: 3000,
        });
      }
      return;
    }

    if (targetValue <= 0) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('setGoalModal.errors.targetValueInvalid'),
          duration: 3000,
        });
      }
      return;
    }

    if (!deadline) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('setGoalModal.errors.deadlineRequired'),
          duration: 3000,
        });
      }
      return;
    }

    const selectedType = GOAL_TYPES.find(t => t.value === goalType);
    if (!selectedType) {
      return;
    }

    try {
      setLoading(true);
      await onSave({
        title: title.trim(),
        description: description.trim(),
        target_value: targetValue,
        current_value: editingGoal?.current_value || 0,
        unit: selectedType.unit,
        deadline: new Date(deadline).toISOString(),
      });

      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: editingGoal ? t('setGoalModal.messages.updateSuccess') : t('setGoalModal.messages.createSuccess'),
          duration: 3000,
        });
      }

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || t('setGoalModal.errors.saveFailed'),
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedType = GOAL_TYPES.find(t => t.value === goalType);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={editingGoal ? t('setGoalModal.editTitle') : t('setGoalModal.createTitle')}
      size='md'
    >
      <form onSubmit={handleSubmit} className='space-y-3'>
        <div>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-1.5'>
            {t('setGoalModal.form.title')} <span className='text-[var(--color-error-500)]'>*</span>
          </label>
          <input
            type='text'
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('setGoalModal.form.titlePlaceholder')}
            className='w-full px-3 py-2 text-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-lg bg-white dark:bg-[var(--color-gray-800)] text-[var(--color-gray-900)] dark:text-[var(--color-white)] placeholder:text-[var(--color-gray-400)] focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-[var(--color-orange-500)] transition-all font-sans'
            required
          />
        </div>

        <div>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-1.5'>
            {t('setGoalModal.form.description')}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('setGoalModal.form.descriptionPlaceholder')}
            rows={3}
            className='w-full px-3 py-2 text-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-lg bg-white dark:bg-[var(--color-gray-800)] text-[var(--color-gray-900)] dark:text-[var(--color-white)] placeholder:text-[var(--color-gray-400)] focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-[var(--color-orange-500)] resize-none transition-all font-sans'
          />
        </div>

        <div>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-1.5'>
            {t('setGoalModal.form.goalType')} <span className='text-[var(--color-error-500)]'>*</span>
          </label>
          <CustomSelect
            options={GOAL_TYPES.map(type => ({ value: type.value, label: type.label }))}
            value={goalType}
            onChange={setGoalType}
            placeholder={t('setGoalModal.form.goalTypePlaceholder')}
            className='w-full'
          />
        </div>

        <div>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-1.5'>
            {t('setGoalModal.form.targetValue', { unit: selectedType?.unit })} <span className='text-[var(--color-error-500)]'>*</span>
          </label>
          <input
            type='number'
            value={targetValue}
            onChange={e => setTargetValue(parseFloat(e.target.value) || 0)}
            min='0'
            step={goalType === 'rating' ? '0.1' : '1'}
            placeholder={t('setGoalModal.form.targetValuePlaceholder')}
            className='w-full px-3 py-2 text-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] rounded-lg bg-white dark:bg-[var(--color-gray-800)] text-[var(--color-gray-900)] dark:text-[var(--color-white)] placeholder:text-[var(--color-gray-400)] focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-[var(--color-orange-500)] transition-all font-sans'
            required
          />
        </div>

        <div>
          <label className='block text-xs font-semibold font-heading text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-1.5'>
            {t('setGoalModal.form.deadline')} <span className='text-[var(--color-error-500)]'>*</span>
          </label>
          <DatePicker
            value={deadline}
            onChange={value => setDeadline(typeof value === 'string' ? value : '')}
            placeholder={t('setGoalModal.form.deadlinePlaceholder')}
            minDate={new Date()}
            dateFormat='d/m/Y'
            className='w-full'
          />
        </div>

        <div className='flex justify-end gap-2 pt-3 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button type='submit' variant='primary' size='sm' disabled={loading}>
            {loading ? t('setGoalModal.saving') : editingGoal ? t('setGoalModal.update') : t('setGoalModal.create')}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}

