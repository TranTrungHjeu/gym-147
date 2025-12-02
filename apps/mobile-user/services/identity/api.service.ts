import { SERVICE_URLS } from '@/config/environment';
import { ApiService } from '../api';

// Identity Service API (Port 3001)
// Log service URL on initialization for debugging
console.log('[CONFIG] Identity Service URL:', SERVICE_URLS.IDENTITY);
console.log('[CONFIG] All SERVICE_URLS:', SERVICE_URLS);

export const identityApiService = new ApiService(SERVICE_URLS.IDENTITY);

export default identityApiService;
