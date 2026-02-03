// Web-specific API configuration for the Ticketly web app.
// Uses NEXT_PUBLIC_API_BASE_URL from .env.local

// Get API base URL from environment variables
// Priority: NEXT_PUBLIC_API_BASE_URL (from .env.local) > default fallback
const getBackendUrl = () => {
  // Read from .env.local: NEXT_PUBLIC_API_BASE_URL=https://ticketly-backend-oem4.onrender.com/api
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Fallback to default (matches .env.local configuration)
  return "https://ticketly-backend-oem4.onrender.com/api";
};

// Backend URL (used by proxy route and direct calls)
// This will be: https://ticketly-backend-oem4.onrender.com/api (from .env.local)
export const BACKEND_API_URL = getBackendUrl();

// API Base URL for all API calls
// Always use direct backend URL (backend should have CORS configured)
export const API_BASE_URL = BACKEND_API_URL;
