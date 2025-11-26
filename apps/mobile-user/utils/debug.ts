import { environment } from '@/config/environment';
import { Platform } from 'react-native';

/**
 * Debug utility for API connection testing
 */
export const debugApi = {
  /**
   * Test API connection
   * Note: Skips on web platform due to CORS restrictions
   */
  async testConnection(): Promise<boolean> {
    // Skip connection test on web platform to avoid CORS issues
    if (Platform.OS === 'web') {
      console.log('🌐 Skipping API connection test on web platform (CORS restrictions)');
      return true; // Return true to not block the app
    }

    try {
      console.log('🔍 Testing API connection...');
      console.log('📍 API URL:', environment.API_URL);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

      const response = await fetch(`${environment.API_URL}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Accept 404 as success (no route for /) and other 4xx/5xx as connection success
      if (response.status >= 200 && response.status < 600) {
        console.log(
          '✅ API connection successful (status:',
          response.status,
          ')'
        );
        return true;
      } else {
        console.log(
          '❌ API connection failed:',
          response.status,
          response.statusText
        );
        return false;
      }
    } catch (error: any) {
      // Handle CORS errors gracefully
      if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
        console.log('⚠️ CORS error detected - this is expected on web platform');
        console.log('💡 To test API on web, configure CORS on your backend server');
        return true; // Return true to not block the app
      }

      console.log('❌ API connection error:', error.message);
      console.log('🔧 Troubleshooting tips:');
      console.log('1. Make sure your backend services are running');
      console.log('2. Check if the service URL is correct');
      console.log('3. For Android emulator, use: http://10.0.2.2:3001');
      console.log('4. For iOS simulator, use: http://localhost:3001');
      console.log(
        '5. For real device, use your computer IP: http://192.168.1.xxx:3001'
      );
      console.log('6. Make sure Identity Service is running on port 3001');
      return false;
    }
  },

  /**
   * Test specific endpoint
   */
  async testEndpoint(endpoint: string): Promise<boolean> {
    try {
      console.log(`🔍 Testing endpoint: ${endpoint}`);

      const response = await fetch(`${environment.API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`📊 Response status: ${response.status}`);
      console.log(
        `📊 Response headers:`,
        Object.fromEntries(response.headers.entries())
      );

      if (response.ok) {
        const data = await response.text();
        console.log('✅ Endpoint test successful');
        console.log('📄 Response data:', data);
        return true;
      } else {
        console.log(
          '❌ Endpoint test failed:',
          response.status,
          response.statusText
        );
        return false;
      }
    } catch (error: any) {
      console.log('❌ Endpoint test error:', error.message);
      return false;
    }
  },

  /**
   * Get network info
   */
  getNetworkInfo() {
    console.log('🌐 Network Information:');
    console.log('📍 API URL:', environment.API_URL);
    console.log('🏠 Environment:', environment.ENVIRONMENT);
    console.log('🐛 Debug mode:', environment.DEBUG);
    console.log('📱 Platform:', Platform.OS);

    return {
      apiUrl: environment.API_URL,
      environment: environment.ENVIRONMENT,
      debug: environment.DEBUG,
    };
  },

  /**
   * Test login endpoint specifically
   */
  async testLoginEndpoint(): Promise<boolean> {
    try {
      console.log('🔍 Testing login endpoint...');

      const response = await fetch(`${environment.API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'member1@gym147.dev',
          password: 'admin123@A',
        }),
      });

      console.log(`📊 Login endpoint status: ${response.status}`);

      // We expect this to fail with 401/400, but the endpoint should be reachable
      if (
        response.status === 401 ||
        response.status === 400 ||
        response.status === 422
      ) {
        console.log('✅ Login endpoint is reachable (expected auth failure)');
        return true;
      } else if (response.ok) {
        console.log('✅ Login endpoint is working');
        return true;
      } else {
        console.log(
          '❌ Login endpoint failed:',
          response.status,
          response.statusText
        );
        return false;
      }
    } catch (error: any) {
      console.log('❌ Login endpoint error:', error.message);
      return false;
    }
  },
};

