import { create } from "zustand";
import type { UserProfile } from "../lib/api/auth";
import { clearTokens } from "../lib/api/client";
import type { Event } from "../lib/api/events";

interface AppState {
  user: UserProfile | null;
  events: Event[];
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  setEvents: (events: Event[]) => void;
  toggleEventLike: (eventId: string, userId: string) => void;
  registerForEvent: (eventId: string, userId: string) => void;
  unregisterFromEvent: (eventId: string, userId: string) => void;
  addEvent: (event: Event) => void;
  login: (user: UserProfile) => void;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  events: [],
  isAuthenticated: false,

  setUser: (user) => set({ user }),

  setEvents: (events) => set({ events }),

  toggleEventLike: (eventId, userId) =>
    set((state) => ({
      events: state.events.map((event) =>
        (event as any).id === eventId || event._id === eventId
          ? {
              ...event,
              likedUsers: (event as any).likedUsers?.includes(userId)
                ? (event as any).likedUsers.filter((id: string) => id !== userId)
                : [...((event as any).likedUsers ?? []), userId]
            }
          : event
      )
    })),

  registerForEvent: (eventId, userId) =>
    set((state) => ({
      events: state.events.map((event) =>
        (event as any).id === eventId || event._id === eventId
          ? {
              ...event,
              registeredUsers: (event as any).registeredUsers?.includes(userId)
                ? (event as any).registeredUsers
                : [...((event as any).registeredUsers ?? []), userId]
            }
          : event
      )
    })),

  unregisterFromEvent: (eventId, userId) =>
    set((state) => ({
      events: state.events.map((event) =>
        (event as any).id === eventId || event._id === eventId
          ? {
              ...event,
              registeredUsers: (event as any).registeredUsers?.filter((id: string) => id !== userId) ?? []
            }
          : event
      )
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events]
    })),

  login: (user) => set({ user, isAuthenticated: true }),

  logout: async () => {
    try {
      clearTokens();
      set({ user: null, isAuthenticated: false, events: [] });
    } catch (error) {
      console.error("Logout error:", error);
      set({ user: null, isAuthenticated: false, events: [] });
    }
  }
}));


