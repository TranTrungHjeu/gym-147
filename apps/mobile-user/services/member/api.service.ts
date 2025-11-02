import { SERVICE_URLS } from '@/config/environment';
import { ApiService } from '../api';

// Member Service API (Port 3002)
export const memberApiService = new ApiService(SERVICE_URLS.MEMBER);

export default memberApiService;
