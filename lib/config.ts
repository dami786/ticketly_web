// Web-specific API configuration for the Ticketly web app.
// Uses NEXT_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_BASE_URL from .env.local

// Get API base URL from environment variables
// Support both NEXT_PUBLIC_API_BASE_URL (Next.js) and EXPO_PUBLIC_API_BASE_URL (Expo/React Native)
const getBackendUrl = () => {
  // Priority: NEXT_PUBLIC_API_BASE_URL > EXPO_PUBLIC_API_BASE_URL > default
  // Default matches .env.local configuration
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    "https://ticketly-backend-oem4.onrender.com/api"
  );
};

// Backend URL (used by proxy route and direct calls)
export const BACKEND_API_URL = getBackendUrl();

// Always use direct backend URL (backend should have CORS configured)
// This ensures all API calls go directly to https://ticketly-backend-oem4.onrender.com/api
export const API_BASE_URL = BACKEND_API_URL;
