import { SERVICE_URLS } from '@/config/environment';
import { ApiService } from '../api';

// Billing Service API (Port 3004)
export const billingApiService = new ApiService(SERVICE_URLS.BILLING);
