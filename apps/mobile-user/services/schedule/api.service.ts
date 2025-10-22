import { ApiService } from '../api';

// Schedule Service API (Port 3003)
export const scheduleApiService = new ApiService('http://10.0.2.2:3003');

export default scheduleApiService;
