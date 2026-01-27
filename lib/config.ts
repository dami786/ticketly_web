// Web-specific API configuration for the Ticketly web app.
// Uses NEXT_PUBLIC_API_BASE_URL so it can be configured per environment.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001/api";


