import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Settings, Save, Bell, Shield, Database } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { ButtonSpinner } from '../../components/ui/AppLoading';
import CustomSelect from '../../components/common/CustomSelect';

const SettingsManagement: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'integrations'>('general');
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
    enableWebhook: false,
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
      showToast('Không thể tải cài đặt', 'error');
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      localStorage.setItem('gymSettings', JSON.stringify(settings));
      showToast('Đã lưu cài đặt thành công', 'success');
    } catch (error: any) {
      showToast('Không thể lưu cài đặt', 'error');
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
            Cài đặt Hệ thống
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            Cấu hình và quản lý hệ thống
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
              Đang lưu...
            </>
          ) : (
            <>
              <Save className='w-4 h-4' />
              Lưu thay đổi
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-1'>
        <nav className='flex space-x-1'>
          {[
            { id: 'general', name: 'Tổng quan', icon: Settings },
            { id: 'notifications', name: 'Thông báo', icon: Bell },
            { id: 'security', name: 'Bảo mật', icon: Shield },
            { id: 'integrations', name: 'Tích hợp', icon: Database },
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
            Thông tin phòng gym
          </h3>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <AdminInput
              label='Tên phòng gym'
              value={settings.gymName}
              onChange={e => handleChange('gymName', e.target.value)}
            />
            <AdminInput
              label='Số điện thoại'
              value={settings.gymPhone}
              onChange={e => handleChange('gymPhone', e.target.value)}
            />
            <AdminInput
              label='Địa chỉ'
              value={settings.gymAddress}
              onChange={e => handleChange('gymAddress', e.target.value)}
            />
            <AdminInput
              label='Email'
              type='email'
              value={settings.gymEmail}
              onChange={e => handleChange('gymEmail', e.target.value)}
            />
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                Múi giờ
              </label>
              <CustomSelect
                options={[
                  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                value={settings.timezone}
                onChange={value => handleChange('timezone', value)}
                placeholder='Chọn múi giờ'
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                Tiền tệ
              </label>
              <CustomSelect
                options={[
                  { value: 'VND', label: 'VND' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                ]}
                value={settings.currency}
                onChange={value => handleChange('currency', value)}
                placeholder='Chọn tiền tệ'
              />
            </div>
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                Ngôn ngữ
              </label>
              <CustomSelect
                options={[
                  { value: 'vi', label: 'Tiếng Việt' },
                  { value: 'en', label: 'English' },
                ]}
                value={settings.language}
                onChange={value => handleChange('language', value)}
                placeholder='Chọn ngôn ngữ'
              />
            </div>
          </div>
        </AdminCard>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <AdminCard>
          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white mb-4'>
            Cài đặt thông báo
          </h3>
          
          <div className='space-y-3'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Bật thông báo
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  Cho phép hệ thống gửi thông báo
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
                  Thông báo qua Email
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  Gửi thông báo qua email
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
                  Thông báo qua SMS
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  Gửi thông báo qua SMS
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
            Cài đặt bảo mật
          </h3>
          
          <div className='space-y-3'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Yêu cầu xác thực 2 bước
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  Bắt buộc sử dụng 2FA cho tất cả tài khoản
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
              label='Thời gian hết hạn phiên (phút)'
              type='number'
              value={settings.sessionTimeout.toString()}
              onChange={e => handleChange('sessionTimeout', parseInt(e.target.value) || 30)}
            />
            <AdminInput
              label='Số lần đăng nhập sai tối đa'
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
            Tích hợp hệ thống
          </h3>
          
          <div className='space-y-3'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Bật API
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  Cho phép truy cập API từ bên ngoài
                </p>
              </div>
              <input
                type='checkbox'
                checked={settings.enableAPI}
                onChange={e => handleChange('enableAPI', e.target.checked)}
                className='w-5 h-5 accent-orange-600 rounded focus:ring-orange-500 dark:bg-gray-900'
              />
            </div>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Bật Webhook
                </label>
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                  Cho phép gửi webhook events
                </p>
              </div>
              <input
                type='checkbox'
                checked={settings.enableWebhook}
                onChange={e => handleChange('enableWebhook', e.target.checked)}
                className='w-5 h-5 accent-orange-600 rounded focus:ring-orange-500 dark:bg-gray-900'
              />
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
};

export default SettingsManagement;
