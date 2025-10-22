import { ApiService } from '../api';

// Identity Service API (Port 3001)
export const identityApiService = new ApiService('http://10.0.2.2:3001');

export default identityApiService;
