import PageBreadcrumb from '../components/common/PageBreadCrumb';
import UserMetaCard from '../components/UserProfile/UserMetaCard';
import UserInfoCard from '../components/UserProfile/UserInfoCard';
import UserAddressCard from '../components/UserProfile/UserAddressCard';
import useTranslation from '../hooks/useTranslation';

export default function UserProfiles() {
  const { t } = useTranslation();
  return (
    <>
      <PageBreadcrumb pageTitle={t('userProfiles.title')} />
      <div className='rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6'>
        <h3 className='mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7 font-space-grotesk'>
          {t('userProfiles.title')}
        </h3>
        <div className='space-y-6'>
          <UserMetaCard />
          <UserInfoCard />
          <UserAddressCard />
        </div>
      </div>
    </>
  );
}
