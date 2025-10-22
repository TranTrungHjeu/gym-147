import { ApiService } from '../api';

// Member Service API (Port 3002)
export const memberApiService = new ApiService('http://10.0.2.2:3002');

export default memberApiService;
