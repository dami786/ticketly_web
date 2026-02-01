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

// Backend URL (used by proxy route)
export const BACKEND_API_URL = getBackendUrl();

// In development, use Next.js API proxy to avoid CORS issues
// In production, use direct backend URL (if CORS is configured)
const isDevelopment = process.env.NODE_ENV === "development";

// Frontend API base URL - uses proxy in dev, direct backend in production
export const API_BASE_URL = isDevelopment 
  ? "/api" // Use Next.js proxy in development
  : BACKEND_API_URL; // Use direct backend in production
