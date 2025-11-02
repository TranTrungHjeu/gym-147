import { SERVICE_URLS } from '@/config/environment';
import { ApiService } from '../api';

// Identity Service API (Port 3001)
export const identityApiService = new ApiService(SERVICE_URLS.IDENTITY);

export default identityApiService;
