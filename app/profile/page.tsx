"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiCamera, FiMenu } from "react-icons/fi";
import { EventCard } from "../../components/EventCard";
import { authAPI } from "../../lib/api/auth";
import { eventsAPI } from "../../lib/api/events";
import { getAccessToken } from "../../lib/api/client";
import { useToast } from "../../lib/hooks/useToast";
import { useAppStore } from "../../store/useAppStore";

type TabKey = "created" | "joined" | "liked";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://ticketlybackend-production.up.railway.app/api";

const USER_STORAGE_KEY = "ticketly_user";

const resolveProfileImageUrl = (
  rawImage: string | null | undefined
): string | null => {
  if (!rawImage) return null;

  // If full URL
  if (rawImage.startsWith("http://") || rawImage.startsWith("https://")) {
    // If it points to localhost/127, rewrite to deployed origin
    if (rawImage.includes("localhost") || rawImage.includes("127.0.0.1")) {
      try {
        const url = new URL(rawImage);
        const path = url.pathname || "";
        const origin = API_BASE_URL.replace(/\/api\/?$/, "");
        return `${origin}${path}`;
      } catch {
        // Fallback: try to find /uploads path
        const uploadsIndex = rawImage.indexOf("/uploads");
        if (uploadsIndex !== -1) {
          const path = rawImage.substring(uploadsIndex);
          const origin = API_BASE_URL.replace(/\/api\/?$/, "");
          return `${origin}${path}`;
        }
      }
    }
    return rawImage;
  }

  // Relative path from backend, prefix with API origin
  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${rawImage}`;
};

export default function ProfilePage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const { success, error: showError } = useToast();

  const [createdEvents, setCreatedEvents] = useState<any[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
  const [likedEvents, setLikedEvents] = useState<any[]>([]);
  const [joinedEventsData, setJoinedEventsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("created");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authHydrating, setAuthHydrating] = useState(true);

  const loadProfile = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await authAPI.getProfile();
      if (response.success && response.user) {
        // Keep global user in sync with latest profile (including profileImage)
        setUser(response.user);

        // Set profile image from API response
        if (response.user.profileImage || (response.user as any).profileImageUrl) {
          const rawImageUrl =
            (response.user as any).profileImageUrl || response.user.profileImage;

          const finalUrl = resolveProfileImageUrl(rawImageUrl);
          if (finalUrl) {
            setProfileImageUrl(finalUrl);
            if (typeof window !== "undefined") {
              window.localStorage.setItem("ticketly_profile_image_url", finalUrl);
            }
          }
        }

        // Normalize created events
        if (
          Array.isArray(response.user.createdEvents) &&
          response.user.createdEvents.length > 0 &&
          typeof response.user.createdEvents[0] === "object"
        ) {
          // Process events to ensure images are properly set
          const processedEvents = response.user.createdEvents.map((event: any) => {
            // Check multiple possible field names for image
            const image = event.image || 
                         event.imageUrl || 
                         event.image_url ||
                         null;
            return {
              ...event,
              image: image // Set to image field for consistency
            };
          });
          setCreatedEvents(processedEvents);
        } else {
          // fallback to API
          const myEvents = await eventsAPI.getMyEvents();
          if (myEvents.success && myEvents.events) {
            // Process events to ensure images are properly set
            const processedEvents = myEvents.events.map((event: any) => {
              // Check multiple possible field names for image
              const image = event.image || 
                           event.imageUrl || 
                           event.image_url ||
                           null;
              return {
                ...event,
                image: image // Set to image field for consistency
              };
            });
            setCreatedEvents(processedEvents);
          }
        }

        // Normalize joined events
        if (
          Array.isArray(response.user.joinedEvents) &&
          response.user.joinedEvents.length > 0 &&
          typeof response.user.joinedEvents[0] === "object" &&
          (response.user.joinedEvents[0] as any).event
        ) {
          const joinedFull = response.user.joinedEvents as any[];
          setJoinedEventsData(joinedFull);
          setJoinedEvents(
            joinedFull
              .map((item) => item.event)
              .filter((e) => Boolean(e))
          );
        } else {
          setJoinedEventsData([]);
          setJoinedEvents([]);
        }

        // Normalize liked events
        if (
          Array.isArray(response.user.likedEvents) &&
          response.user.likedEvents.length > 0 &&
          typeof response.user.likedEvents[0] === "object"
        ) {
          setLikedEvents(response.user.likedEvents as any[]);
        } else {
          setLikedEvents([]);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // 1) Try to use image from current user object (store) if available
    if (!profileImageUrl) {
      const rawFromUser =
        (user as any).profileImageUrl || (user as any).profileImage;
      const resolved = resolveProfileImageUrl(rawFromUser);
      if (resolved) {
        setProfileImageUrl(resolved);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ticketly_profile_image_url", resolved);
        }
      }
    }

    // 2) If still no image, restore from localStorage to avoid disappearing avatar on refresh
    if (typeof window !== "undefined" && !profileImageUrl) {
      const stored = window.localStorage.getItem("ticketly_profile_image_url");
      if (stored) {
        setProfileImageUrl(stored);
      }
    }

    void loadProfile();
  }, [user?._id, user?.profileImage, (user as any)?.profileImageUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // If user is already in store, we're done
    if (user) {
      setAuthHydrating(false);
      return;
    }

    const token = getAccessToken();
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);

    // If we have neither token nor stored user, there is no active session
    if (!token && !storedUser) {
      setAuthHydrating(false);
      return;
    }

    // We have some session info (token or stored user), so keep hydrating
    // until AuthInitializer loads the user or tokens are cleared.
  }, [user]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("Image size should be less than 5MB.");
      return;
    }

    setUploadingImage(true);

    try {
      // Convert file to data URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imageUri = event.target?.result as string;
          
          // Upload image
          const response = await authAPI.uploadProfileImage(imageUri);
          
          if (response.success) {
            // Update profile image URL
            const imageUrl = response.profileImageUrl || response.profileImage;
            const finalUrl = resolveProfileImageUrl(imageUrl);
            if (finalUrl) {
              setProfileImageUrl(finalUrl);
              if (typeof window !== "undefined") {
                window.localStorage.setItem("ticketly_profile_image_url", finalUrl);
              }
            }
            
            // Update user in store if provided
            if (response.user) {
              setUser(response.user);
            } else {
              // Refresh profile to get updated user data
              const profile = await authAPI.getProfile();
              if (profile.success && profile.user) {
                setUser(profile.user);
              }
            }
            
            success("Profile image uploaded successfully!");
          } else {
            showError(response.message || "Failed to upload image.");
          }
        } catch (error: any) {
          console.error("Image upload error:", error);
          const errorMessage = 
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "Failed to upload image. Please try again.";
          showError(errorMessage);
        } finally {
          setUploadingImage(false);
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      
      reader.onerror = () => {
        showError("Failed to read image file.");
        setUploadingImage(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Image selection error:", error);
      showError("Failed to process image. Please try again.");
      setUploadingImage(false);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const createdCount = createdEvents.length;
  const joinedCount = joinedEventsData.length;
  const likedCount = likedEvents.length;

  const eventsToRender = useMemo(() => {
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
  }, [activeTab, createdEvents, joinedEvents, likedEvents]);

  if (!user && authHydrating) {
    return (
      <div className="bg-background">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mb-3" />
          <p className="text-sm text-mutedLight">Restoring your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-background">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <h1 className="mb-3 text-2xl font-bold text-white">
            Welcome to Ticketly
          </h1>
          <p className="mb-6 text-sm text-mutedLight">
            Login to create events, register for events, and manage your profile.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/profile")}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Login / Sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-white shadow-lg"
            aria-label="Open settings"
          >
            <FiMenu size={20} />
          </button>
        </div>

        <section className="mb-6 text-center">
          <div className="relative mx-auto mb-4 h-24 w-24">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={user.fullName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-accent text-4xl font-bold text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={uploadingImage}
              className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-background text-accent shadow-lg ring-2 ring-background transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Change profile photo"
            >
              {uploadingImage ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              ) : (
                <FiCamera size={16} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              aria-label="Upload profile image"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
          {user.companyName && (
            <p className="mt-1 text-sm font-semibold text-accent">
              {user.companyName}
            </p>
          )}
        </section>

        <section className="mb-6 flex justify-around text-center text-sm">
          <div>
            <div className="text-2xl font-bold text-white">
              {createdCount}
            </div>
            <div className="text-xs text-mutedLight">Created</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {joinedCount}
            </div>
            <div className="text-xs text-mutedLight">Joined</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {likedCount}
            </div>
            <div className="text-xs text-mutedLight">Liked</div>
          </div>
        </section>

        <section className="mb-5 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("created")}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
              activeTab === "created"
                ? "bg-accent text-white"
                : "bg-surface text-mutedLight"
            }`}
          >
            Created events
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("joined")}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
              activeTab === "joined"
                ? "bg-accent text-white"
                : "bg-surface text-mutedLight"
            }`}
          >
            Joined events
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("liked")}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
              activeTab === "liked"
                ? "bg-accent text-white"
                : "bg-surface text-mutedLight"
            }`}
          >
            Liked events
          </button>
        </section>

        <section className="mb-8 min-h-[120px]">
          {loading ? (
            <div className="py-10 text-center text-sm text-mutedLight">
              Loading…
            </div>
          ) : eventsToRender.length === 0 ? (
            <div className="py-10 text-center text-sm text-mutedLight">
              {activeTab === "created" && "No events created yet."}
              {activeTab === "joined" && "No events joined yet."}
              {activeTab === "liked" && "No events liked yet."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:flex md:flex-wrap md:justify-between md:gap-y-4">
              {eventsToRender.map((event: any) => {
                const id = event._id ?? event.id;
                const href =
                  activeTab === "created"
                    ? `/created-events/${id}`
                    : `/events/${id}`;
                return (
                  <EventCard key={id} event={event} href={href} />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


