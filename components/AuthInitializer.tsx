"use client";

import { useEffect } from "react";
import { authAPI } from "../lib/api/auth";
import { getAccessToken } from "../lib/api/client";
import { useAppStore } from "../store/useAppStore";

const USER_STORAGE_KEY = "ticketly_user";

export default function AuthInitializer() {
  const user = useAppStore((state) => state.user);
  const login = useAppStore((state) => state.login);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only run once on mount - don't re-run when user changes
    let cancelled = false;

    const bootstrap = async () => {
      // 1) Try to hydrate from localStorage first for instant UI
      if (!user) {
        try {
          const stored = window.localStorage.getItem(USER_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed._id) {
              login(parsed);
            }
          }
        } catch {
          // ignore
        }
      }

      // 2) If we have a token, verify it with backend and refresh user
      // Only call API if we don't have a user yet (to avoid unnecessary calls)
      const token = getAccessToken();
      if (!token || user) {
        return; // Already have user or no token
      }

      try {
        const response = await authAPI.getProfile();
        if (!cancelled && response.success && response.user) {
          login(response.user);
        }
      } catch {
        // Token invalid -> response interceptor will clear tokens
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  return null;
}



