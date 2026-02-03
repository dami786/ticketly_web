"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { EventCard } from "../../../components/EventCard";
import { EventCardSkeletonList } from "../../../components/EventCardSkeleton";
import { authAPI } from "../../../lib/api/auth";
import { getEventImageUrl } from "../../../lib/utils/images";
import { useToast } from "../../../lib/hooks/useToast";
import { BACKEND_API_URL } from "../../../lib/config";

type TabKey = "created" | "joined" | "liked";

interface PublicUserProfile {
  _id: string;
  fullName: string;
  username?: string;
  email: string;
  phone?: string;
  companyName?: string;
  profileImage?: string;
  profileImageUrl?: string;
  createdEvents?: any[];
  joinedEvents?: any[];
  likedEvents?: any[];
  createdAt?: string;
}

const resolveProfileImageUrl = (rawImage: string | null | undefined): string | null => {
  if (!rawImage || rawImage.trim() === "" || rawImage === "null" || rawImage === "undefined") {
    return null;
  }

  // If full URL
  if (rawImage.startsWith("http://") || rawImage.startsWith("https://")) {
    // If it points to localhost/127, rewrite to deployed origin
    if (rawImage.includes("localhost") || rawImage.includes("127.0.0.1")) {
      try {
        const url = new URL(rawImage);
        const path = url.pathname || "";
        const origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
        return `${origin}${path}`;
      } catch {
        // Fallback: try to find /uploads path
        const uploadsIndex = rawImage.indexOf("/uploads");
        if (uploadsIndex !== -1) {
          const path = rawImage.substring(uploadsIndex);
          const origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
          return `${origin}${path}`;
        }
      }
    }
    return rawImage;
  }

  // Relative path from backend, prefix with API origin
  const origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
  return `${origin}${rawImage}`;
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { error: showError } = useToast();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [createdEvents, setCreatedEvents] = useState<any[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
  const [likedEvents, setLikedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("created");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const loadProfile = async (silent = false) => {
    if (!userId) return;
    try {
      if (!silent) setLoading(true);
      const response = await authAPI.getUserProfileById(userId);
      if (response.success && response.user) {
        setProfile(response.user);

        // Set profile image
        const rawImageUrl = response.user.profileImageUrl || response.user.profileImage;
        const finalUrl = resolveProfileImageUrl(rawImageUrl);
        setProfileImageUrl(finalUrl || null);

        // Process events
        const processEvents = (events: any[]) => {
          if (!Array.isArray(events)) return [];
          return events.map((event: any) => ({
            ...event,
            image: getEventImageUrl(event),
          }));
        };

        if (response.user.createdEvents) {
          setCreatedEvents(processEvents(response.user.createdEvents));
        }
        if (response.user.joinedEvents) {
          setJoinedEvents(processEvents(response.user.joinedEvents));
        }
        if (response.user.likedEvents) {
          setLikedEvents(processEvents(response.user.likedEvents));
        }
      }
    } catch (err: any) {
      console.error("Error loading user profile:", err);
      showError(
        err?.response?.data?.message || err?.message || "Failed to load user profile."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile(true);
  };

  const getActiveEvents = () => {
    switch (activeTab) {
      case "created":
        return createdEvents;
      case "joined":
        return joinedEvents;
      case "liked":
        return likedEvents;
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="space-y-3 text-center">
              <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-gray-600">Loading profile…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md space-y-4 text-center">
              <p className="text-base font-semibold text-[#EF4444]">User not found.</p>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeEvents = getActiveEvents();
  const stats = {
    created: createdEvents.length,
    joined: joinedEvents.length,
    liked: likedEvents.length,
  };

  const displayName = profile.fullName || profile.username || "User";
  const initial =
    (displayName && displayName.trim().charAt(0).toUpperCase()) || "?";

  return (
    <div className="min-h-screen bg-white relative">
      {/* Fixed Back Button (top-left overlay) */}
      <button
        type="button"
        onClick={() => router.back()}
        className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white"
        style={{ paddingTop: "calc(4px + env(safe-area-inset-top))" }}
      >
        <FiArrowLeft className="h-5 w-5 text-gray-900" />
      </button>

      <div className="mx-auto max-w-4xl px-4 pb-20 pt-20 sm:px-6 sm:pt-24">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <button
            type="button"
            onClick={() => setAvatarModalOpen(true)}
            className="relative mb-4 h-24 w-24 overflow-hidden rounded-full bg-primary flex items-center justify-center shadow-lg"
          >
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                onError={() => setProfileImageUrl(null)}
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {initial}
              </span>
            )}
          </button>

          {/* Name & Meta */}
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          {profile.username && (
            <p className="mt-1 text-sm text-gray-500">@{profile.username}</p>
          )}
          {profile.companyName && (
            <p className="mt-1 text-sm font-semibold text-primary">
              {profile.companyName}
            </p>
          )}
        </div>

        {/* Stats Row */}
        <div className="mt-6 flex justify-around border-y border-gray-200 py-4">
          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-gray-900">{stats.created}</div>
            <div className="text-xs text-gray-400">Created</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-gray-900">{stats.joined}</div>
            <div className="text-xs text-gray-400">Joined</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-gray-900">{stats.liked}</div>
            <div className="text-xs text-gray-400">Liked</div>
          </div>
        </div>

        {/* Tabs Row */}
        <div className="mt-5 mx-auto max-w-md rounded-2xl bg-gray-100 p-1 flex">
          {(["created", "joined", "liked"] as TabKey[]).map((tab) => {
            const label =
              tab === "created"
                ? "Created"
                : tab === "joined"
                ? "Joined"
                : "Liked";
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-2xl py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600"
                }`}
              >
                {label} Events
              </button>
            );
          })}
        </div>

        {/* Events Grid */}
        <div className="mt-6">
          {refreshing && activeEvents.length > 0 ? (
            <EventCardSkeletonList count={3} />
          ) : activeEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {activeEvents.map((event: any) => {
                const eventId = event._id || event.id;
                return (
                  <EventCard
                    key={eventId}
                    event={event}
                    href={eventId ? `/events/${eventId}` : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <p className="mb-2 text-sm font-medium text-gray-500">
                {activeTab === "created"
                  ? "No created events yet."
                  : activeTab === "joined"
                  ? "No joined events yet."
                  : "No liked events yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Fullscreen Modal */}
      {avatarModalOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/90"
          onClick={() => setAvatarModalOpen(false)}
        >
          <div
            className="relative flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAvatarModalOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            >
              <span className="text-sm font-semibold">✕</span>
            </button>

            {/* Big Circular Avatar */}
            <div className="h-80 w-80 max-w-[80vw] max-h-[80vw] rounded-full bg-primary flex items-center justify-center overflow-hidden">
              {profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImageUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  onError={() => setProfileImageUrl(null)}
                />
              ) : (
                <span className="text-6xl font-bold text-white">
                  {initial}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

