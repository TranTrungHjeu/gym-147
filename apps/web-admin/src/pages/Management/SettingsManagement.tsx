import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { Settings, Save, Bell, Shield, Database } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { ButtonSpinner } from '../../components/ui/AppLoading';
import CustomSelect from '../../components/common/CustomSelect';

const SettingsManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'general' | 'notifications' | 'security' | 'integrations'
  >('general');
  const [settings, setSettings] = useState({
    gymName: 'GYM 147',
    gymAddress: '',
    gymPhone: '',
    gymEmail: '',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    language: 'vi',
    enableNotifications: true,
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    sessionTimeout: 30,
    require2FA: false,
    maxLoginAttempts: 5,
    enableAPI: false,
    // enableWebhook removed - webhook management not needed
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = localStorage.getItem('gymSettings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error: any) {
      showToast(t('settingsManagement.messages.loadError'), 'error');
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      localStorage.setItem('gymSettings', JSON.stringify(settings));
      showToast(t('settingsManagement.messages.saveSuccess'), 'success');
    } catch (error: any) {
      showToast(t('settingsManagement.messages.saveError'), 'error');
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            {t('settingsManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            {t('settingsManagement.subtitle')}
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSaving ? (
            <>
              <ButtonSpinner />
              {t('settingsManagement.actions.saving')}
            </>
          ) : (
            <>
              <Save className='w-4 h-4' />
              {t('settingsManagement.actions.save')}
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-1'>
        <nav className='flex space-x-1'>
          {[
            { id: 'general', name: t('settingsManagement.tabs.general'), icon: Settings },
            { id: 'notifications', name: t('settingsManagement.tabs.notifications'), icon: Bell },
            { id: 'security', name: t('settingsManagement.tabs.security'), icon: Shield },
            { id: 'integrations', name: t('settingsManagement.tabs.integrations'), icon: Database },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-theme-xs font-heading transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white dark:bg-orange-500 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className='w-4 h-4' />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <AdminCard>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-4'>
            {t('settingsManagement.general.title')}
          </h3>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <AdminInput
              label={t('settingsManagement.general.gymName')}
              value={settings.gymName}
              onChange={e => handleChange('gymName', e.target.value)}
            />
            <AdminInput
              label={t('settingsManagement.general.gymPhone')}
              value={settings.gymPhone}
              onChange={e => handleChange('gymPhone', e.target.value)}
            />
            <AdminInput
              label={t('settingsManagement.general.gymAddress')}
              value={settings.gymAddress}
              onChange={e => handleChange('gymAddress', e.target.value)}
            />
            <AdminInput
              label={t('settingsManagement.general.gymEmail')}
              type='email'
              value={settings.gymEmail}
              onChange={e => handleChange('gymEmail', e.target.value)}
            />
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                {t('settingsManagement.general.timezone')}
              </label>
              <CustomSelect
                options={[
                  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                value={settings.timezone}
                onChange={value => handleChange('timezone', value)}
                placeholder={t('settingsManagement.general.selectTimezone')}
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                {t('settingsManagement.general.currency')}
              </label>
              <CustomSelect
                options={[
                  { value: 'VND', label: 'VND' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                ]}
                value={settings.currency}
                onChange={value => handleChange('currency', value)}
                placeholder={t('settingsManagement.general.selectCurrency')}
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                {t('settingsManagement.general.language')}
              </label>
              <CustomSelect
                options={[
                  { value: 'vi', label: t('settingsManagement.general.languages.vi') },
                  { value: 'en', label: t('settingsManagement.general.languages.en') },
                ]}
                value={settings.language}
                onChange={value => handleChange('language', value)}
                placeholder={t('settingsManagement.general.selectLanguage')}
              />
            </div>
          </div>
        </AdminCard>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <AdminCard>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-4'>
            {t('settingsManagement.notifications.title')}
          </h3>

          <div className='space-y-3'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  {t('settingsManagement.notifications.enableNotifications')}
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  {t('settingsManagement.notifications.enableNotificationsDesc')}
                </p>
              </div>
              <input
                type='checkbox'
                checked={settings.enableNotifications}
                onChange={e => handleChange('enableNotifications', e.target.checked)}
                className='w-5 h-5 accent-orange-600 rounded focus:ring-orange-500 dark:bg-gray-900'
              />
            </div>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  {t('settingsManagement.notifications.enableEmailNotifications')}
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  {t('settingsManagement.notifications.enableEmailNotificationsDesc')}
                </p>
              </div>
              <input
                type='checkbox'
                checked={settings.enableEmailNotifications}
                onChange={e => handleChange('enableEmailNotifications', e.target.checked)}
                className='w-5 h-5 accent-orange-600 rounded focus:ring-orange-500 dark:bg-gray-900'
              />
            </div>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  {t('settingsManagement.notifications.enableSMSNotifications')}
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  {t('settingsManagement.notifications.enableSMSNotificationsDesc')}
                </p>
              </div>
              <input
                type='checkbox'
                checked={settings.enableSMSNotifications}
                onChange={e => handleChange('enableSMSNotifications', e.target.checked)}
                className='w-5 h-5 accent-orange-600 rounded focus:ring-orange-500 dark:bg-gray-900'
              />
            </div>
          </div>
        </AdminCard>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <AdminCard>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-4'>
            {t('settingsManagement.security.title')}
          </h3>

          <div className='space-y-3'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  {t('settingsManagement.security.require2FA')}
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  {t('settingsManagement.security.require2FADesc')}
                </p>
              </div>
              <input
                type='checkbox'
                checked={settings.require2FA}
                onChange={e => handleChange('require2FA', e.target.checked)}
                className='w-5 h-5 accent-orange-600 rounded focus:ring-orange-500 dark:bg-gray-900'
              />
            </div>
            <AdminInput
              label={t('settingsManagement.security.sessionTimeout')}
              type='number'
              value={settings.sessionTimeout.toString()}
              onChange={e => handleChange('sessionTimeout', parseInt(e.target.value) || 30)}
            />
            <AdminInput
              label={t('settingsManagement.security.maxLoginAttempts')}
              type='number'
              value={settings.maxLoginAttempts.toString()}
              onChange={e => handleChange('maxLoginAttempts', parseInt(e.target.value) || 5)}
            />
          </div>
        </AdminCard>
      )}

      {/* Integrations Settings */}
      {activeTab === 'integrations' && (
        <AdminCard>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-4'>
            {t('settingsManagement.integrations.title')}
          </h3>

          <div className='space-y-3'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  {t('settingsManagement.integrations.enableAPI')}
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  {t('settingsManagement.integrations.enableAPIDesc')}
                </p>
              </div>
              <input
                type='checkbox'
                checked={settings.enableAPI}
                onChange={e => handleChange('enableAPI', e.target.checked)}
                className='w-5 h-5 accent-orange-600 rounded focus:ring-orange-500 dark:bg-gray-900'
              />
            </div>
            {/* enableWebhook setting removed - webhook management not needed */}
          </div>
        </AdminCard>
      )}
    </div>
  );
};

export default SettingsManagement;
