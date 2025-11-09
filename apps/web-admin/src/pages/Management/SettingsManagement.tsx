import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Settings, Save, Bell, Shield, Database } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';

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
    <div className='p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold font-heading text-gray-900 dark:text-white'>
            Cài đặt Hệ thống
          </h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1 font-inter'>
            Cấu hình và quản lý hệ thống
          </p>
        </div>
        <AdminButton
          variant='primary'
          icon={Save}
          onClick={saveSettings}
          disabled={isSaving}
          isLoading={isSaving}
        >
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </AdminButton>
      </div>

      {/* Tabs */}
      <div className='border-b border-gray-200 dark:border-gray-800'>
        <nav className='-mb-px flex space-x-8'>
          {[
            { id: 'general', name: 'Tổng quan', icon: Settings },
            { id: 'notifications', name: 'Thông báo', icon: Bell },
            { id: 'security', name: 'Bảo mật', icon: Shield },
            { id: 'integrations', name: 'Tích hợp', icon: Database },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm font-inter transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className='w-5 h-5' />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <AdminCard>
          <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-6'>
            Thông tin phòng gym
          </h3>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
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
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                Múi giờ
              </label>
              <select
                value={settings.timezone}
                onChange={e => handleChange('timezone', e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter'
              >
                <option value='Asia/Ho_Chi_Minh'>Asia/Ho_Chi_Minh</option>
                <option value='UTC'>UTC</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                Tiền tệ
              </label>
              <select
                value={settings.currency}
                onChange={e => handleChange('currency', e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter'
              >
                <option value='VND'>VND</option>
                <option value='USD'>USD</option>
                <option value='EUR'>EUR</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
                Ngôn ngữ
              </label>
              <select
                value={settings.language}
                onChange={e => handleChange('language', e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter'
              >
                <option value='vi'>Tiếng Việt</option>
                <option value='en'>English</option>
              </select>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <AdminCard>
          <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-6'>
            Cài đặt thông báo
          </h3>
          
          <div className='space-y-4'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div>
                <label className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                  Bật thông báo
                </label>
                <p className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
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
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div>
                <label className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                  Thông báo qua Email
                </label>
                <p className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
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
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div>
                <label className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                  Thông báo qua SMS
                </label>
                <p className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
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
          <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-6'>
            Cài đặt bảo mật
          </h3>
          
          <div className='space-y-4'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div>
                <label className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                  Yêu cầu xác thực 2 bước
                </label>
                <p className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
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
          <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-6'>
            Tích hợp hệ thống
          </h3>
          
          <div className='space-y-4'>
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div>
                <label className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                  Bật API
                </label>
                <p className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
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
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
              <div>
                <label className='text-sm font-medium text-gray-900 dark:text-white font-inter'>
                  Bật Webhook
                </label>
                <p className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
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
