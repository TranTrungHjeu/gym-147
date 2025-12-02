import { environment } from '@/config/environment';

export const testApiConnection = async () => {
  console.log('[SEARCH] Testing API connection...');
  console.log('[LOCATION] API URL:', environment.API_URL);

  try {
    // Test basic connectivity
    const response = await fetch(`${environment.API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123',
      }),
    });

    console.log('[DATA] Response status:', response.status);
    console.log(
      '[STATS] Response headers:',
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log('[DATA] Response body:', responseText);

    if (response.ok) {
      console.log('[SUCCESS] API connection successful!');
      return { success: true, message: 'API connection successful' };
    } else {
      console.log(
        '[ERROR] API returned error:',
        response.status,
        response.statusText
      );
      return { success: false, message: `API error: ${response.status}` };
    }
  } catch (error: any) {
    console.log('[ERROR] Connection failed:', error.message);
    console.log('[DEBUG] Troubleshooting:');
    console.log('1. Make sure Identity Service is running on port 3001');
    console.log('2. Check if emulator can reach host machine');
    console.log('3. Try: adb shell ping 10.0.2.2');
    console.log('4. Check firewall settings');

    return { success: false, message: error.message };
  }
};

export const testNetworkConnectivity = async () => {
  console.log('[NETWORK] Testing network connectivity...');

  try {
    // Test if we can reach the host machine
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(environment.API_URL, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('[SUCCESS] Network connectivity OK');
    return true;
  } catch (error: any) {
    console.log('[ERROR] Network connectivity failed:', error.message);
    return false;
  }
};
