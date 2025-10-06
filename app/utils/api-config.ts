// Dynamic API configuration that works on any network
let cachedApiBase: string | null = null;

export async function getApiBase(): Promise<string> {
  // If we already have a cached API base, return it
  if (cachedApiBase) {
    return cachedApiBase;
  }

  // Try to detect the API base dynamically
  try {
    // Get current hostname from browser
    const currentHost = window.location.hostname;
    
    // If we're on localhost, try localhost first
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      cachedApiBase = 'http://localhost:3000';
    } else {
      // Use the same IP as frontend for API
      cachedApiBase = `http://${currentHost}:3000`;
    }

    // Test if the API is reachable
    const response = await fetch(`${cachedApiBase}/health`);
    if (response.ok) {
      return cachedApiBase;
    }
  } catch (error) {
    console.warn('Failed to detect API base automatically:', error);
  }

  // Fallback to localhost
  cachedApiBase = 'http://localhost:3000';
  return cachedApiBase;
}

// Reset cache when network changes
export function resetApiConfig() {
  cachedApiBase = null;
}