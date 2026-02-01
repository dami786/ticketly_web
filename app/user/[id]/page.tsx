"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiCalendar, FiHeart, FiMapPin, FiUsers } from "react-icons/fi";
import { EventCard } from "../../../components/EventCard";
import { EventCardSkeletonList } from "../../../components/EventCardSkeleton";
import { authAPI } from "../../../lib/api/auth";
import { eventsAPI } from "../../../lib/api/events";
import { getEventImageUrl } from "../../../lib/utils/images";
import { useToast } from "../../../lib/hooks/useToast";

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

import { BACKEND_API_URL } from "../../../lib/config";

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
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-mutedLight hover:text-white"
            >
              ← Back
            </button>
          </div>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="space-y-3 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto" />
              <p className="text-sm text-mutedLight">Loading profile…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-mutedLight hover:text-white"
            >
              ← Back
            </button>
          </div>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md space-y-4 text-center">
              <p className="text-base font-semibold text-danger">User not found.</p>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
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

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width Header Image (300px) */}
      <div className="relative h-[300px] w-full overflow-hidden bg-[#1F1F1F]">
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={profile.fullName}
            className="h-full w-full object-cover"
            onError={() => setProfileImageUrl(null)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/20 to-accent/10">
            <div className="text-6xl font-bold text-accent">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
        >
          <FiArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Rounded Top Card with User Info */}
      <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="-mt-5 rounded-t-3xl bg-[#1F1F1F] p-5 shadow-xl">
          {/* User Name and Company */}
          <div className="mb-6">
            <h1 className="mb-1 text-2xl font-bold text-white">{profile.fullName}</h1>
            {profile.companyName && (
              <p className="text-base font-semibold text-accent">{profile.companyName}</p>
            )}
            {profile.username && (
              <p className="mt-1 text-sm text-mutedLight">@{profile.username}</p>
            )}
          </div>

          {/* Stats Row */}
          <div className="mb-6 flex justify-around border-t border-b border-[#2D2D2D] py-4">
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-white">{stats.created}</div>
              <div className="text-xs text-mutedLight">Created</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-white">{stats.joined}</div>
              <div className="text-xs text-mutedLight">Joined</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-white">{stats.liked}</div>
              <div className="text-xs text-mutedLight">Liked</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-5 flex gap-2">
            {(["created", "joined", "liked"] as TabKey[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg py-2.5 text-center text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-accent text-white"
                    : "bg-[#2D2D2D] text-mutedLight hover:bg-[#374151]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Events List */}
        <div className="mt-6">
          {refreshing && activeEvents.length > 0 ? (
            <EventCardSkeletonList count={3} />
          ) : activeEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="rounded-2xl bg-[#1F1F1F] p-8 text-center shadow-xl">
              <p className="text-sm text-mutedLight">
                No {activeTab} events yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

