import { SERVICE_URLS } from '@/config/environment';
import { ApiService } from '../api';

// Schedule Service API (Port 3003)
export const scheduleApiService = new ApiService(SERVICE_URLS.SCHEDULE);

export default scheduleApiService;
