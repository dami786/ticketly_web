"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiCamera, FiMenu } from "react-icons/fi";
import { EventCard } from "../../components/EventCard";
import { EventCardSkeletonList } from "../../components/EventCardSkeleton";
import { authAPI } from "../../lib/api/auth";
import { eventsAPI } from "../../lib/api/events";
import { getAccessToken } from "../../lib/api/client";
import { useToast } from "../../lib/hooks/useToast";
import { useAppStore } from "../../store/useAppStore";

type TabKey = "created" | "joined" | "liked";

import { BACKEND_API_URL } from "../../lib/config";

const USER_STORAGE_KEY = "ticketly_user";

const resolveProfileImageUrl = (
  rawImage: string | null | undefined
): string | null => {
  if (!rawImage) {
    console.log("resolveProfileImageUrl: No raw image provided");
    return null;
  }

  console.log("resolveProfileImageUrl: Input:", rawImage);

  const isDevelopment = process.env.NODE_ENV === "development";

  // If full URL
  if (rawImage.startsWith("http://") || rawImage.startsWith("https://")) {
    // In development, use proxy for all backend URLs to avoid CORS
    if (isDevelopment && (rawImage.includes("ticketlybackend-production") || rawImage.includes("localhost") || rawImage.includes("127.0.0.1"))) {
      try {
        const url = new URL(rawImage);
        const path = url.pathname || "";
        // Use Next.js proxy in development
        const resolved = `/api${path}`;
        console.log("resolveProfileImageUrl: Using proxy in development:", resolved);
        return resolved;
      } catch (error) {
        console.warn("resolveProfileImageUrl: Error parsing URL:", error);
        // Fallback: try to find /uploads path
        const uploadsIndex = rawImage.indexOf("/uploads");
        if (uploadsIndex !== -1) {
          const path = rawImage.substring(uploadsIndex);
          const resolved = `/api${path}`;
          console.log("resolveProfileImageUrl: Resolved via /uploads fallback (proxy):", resolved);
          return resolved;
        }
      }
    }
    
    // If it points to localhost/127 in production, rewrite to deployed origin
    if (!isDevelopment && (rawImage.includes("localhost") || rawImage.includes("127.0.0.1"))) {
      try {
        const url = new URL(rawImage);
        const path = url.pathname || "";
        const origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
        const resolved = `${origin}${path}`;
        console.log("resolveProfileImageUrl: Resolved localhost URL to:", resolved);
        return resolved;
      } catch (error) {
        console.warn("resolveProfileImageUrl: Error parsing URL:", error);
        // Fallback: try to find /uploads path
        const uploadsIndex = rawImage.indexOf("/uploads");
        if (uploadsIndex !== -1) {
          const path = rawImage.substring(uploadsIndex);
          const origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
          const resolved = `${origin}${path}`;
          console.log("resolveProfileImageUrl: Resolved via /uploads fallback to:", resolved);
          return resolved;
        }
      }
    }
    
    console.log("resolveProfileImageUrl: Returning full URL as-is:", rawImage);
    return rawImage;
  }

  // Relative path from backend
  if (rawImage.startsWith("/")) {
    if (isDevelopment) {
      // Use proxy in development
      const resolved = `/api${rawImage}`;
      console.log("resolveProfileImageUrl: Resolved relative path (proxy):", resolved);
      return resolved;
    } else {
      // In production, prefix with backend origin
      const origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
      const resolved = `${origin}${rawImage}`;
      console.log("resolveProfileImageUrl: Resolved relative path to:", resolved);
      return resolved;
    }
  }

  console.log("resolveProfileImageUrl: Returning raw image as-is (unhandled case):", rawImage);
  return rawImage;
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
  // Initialize with 0 to avoid hydration mismatch (Date.now() differs on server/client)
  const [imageUploadTimestamp, setImageUploadTimestamp] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authHydrating, setAuthHydrating] = useState(true);
  const [hydrationTimeout, setHydrationTimeout] = useState(false);
  const [mounted, setMounted] = useState(false);

  const loadProfile = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await authAPI.getProfile();
      if (response.success && response.user) {
        // Stop hydration immediately when profile loads
        setAuthHydrating(false);
        setHydrationTimeout(false);
        
        // Keep global user in sync with latest profile (including profileImage)
        setUser(response.user);

        // Set profile image from API response
        // Always update profileImageUrl from API response to keep it in sync
        const rawImageUrl = (response.user as any).profileImageUrl || response.user.profileImage;
        if (rawImageUrl) {
          const finalUrl = resolveProfileImageUrl(rawImageUrl);
          console.log("loadProfile - Raw image URL:", rawImageUrl);
          console.log("loadProfile - Resolved URL:", finalUrl);
          if (finalUrl) {
            console.log("loadProfile - Setting profileImageUrl to:", finalUrl);
            setProfileImageUrl(finalUrl);
            if (typeof window !== "undefined") {
              window.localStorage.setItem("ticketly_profile_image_url", finalUrl);
            }
          } else {
            console.warn("loadProfile - Failed to resolve image URL:", rawImageUrl);
          }
        } else {
          console.log("loadProfile - No image URL in user profile");
          // If no image in API response, clear state
          setProfileImageUrl(null);
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

  // Load profile only once on mount (when component first mounts)
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasLoadedRef.current) return; // Already loaded
    
    hasLoadedRef.current = true;
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update profileImageUrl from user object (without calling API)
  useEffect(() => {
    if (!user) return;
    
    // Update profileImageUrl from user object if available
    const rawFromUser =
      (user as any).profileImageUrl || (user as any).profileImage;
    
    if (rawFromUser) {
      const resolved = resolveProfileImageUrl(rawFromUser);
      if (resolved) {
        setProfileImageUrl(resolved);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ticketly_profile_image_url", resolved);
        }
      }
    } else {
      // If no image in user object, try localStorage as fallback
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("ticketly_profile_image_url");
        if (stored) {
          setProfileImageUrl(stored);
        }
      }
    }
  }, [user?.profileImage, (user as any)?.profileImageUrl]); // Only update when image changes

  // Set mounted state on client side only
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return;
    }

    // If user is already in store, we're done
    if (user) {
      console.log("✅ User found in store, stopping hydration");
      setAuthHydrating(false);
      setHydrationTimeout(false);
      return;
    }

    const token = getAccessToken();
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);

    console.log("🔍 Checking auth state:", { token: !!token, storedUser: !!storedUser, user: !!user });

    // If we have neither token nor stored user, there is no active session
    if (!token && !storedUser) {
      console.log("❌ No token or stored user, stopping hydration");
      setAuthHydrating(false);
      setHydrationTimeout(false);
      return;
    }

    // If we have stored user in localStorage, try to use it immediately
    if (storedUser && !user) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed._id) {
          // User exists in localStorage, stop hydrating and proceed
          console.log("✅ Stored user found in localStorage, stopping hydration");
          setAuthHydrating(false);
          setHydrationTimeout(false);
          return;
        }
      } catch (error) {
        console.warn("⚠️ Invalid stored user, continuing with timeout:", error);
        // Invalid stored user, continue with timeout
      }
    }

    // Set a timeout to stop hydrating after 1 second (reduced from 1.5s)
    // This prevents infinite loading if AuthInitializer is slow or fails
    console.log("⏱️ Setting hydration timeout (1s)");
    const timeoutId = setTimeout(() => {
      console.log("⏱️ Hydration timeout reached, stopping hydration");
      setAuthHydrating(false);
      setHydrationTimeout(true);
    }, 1000);

    // Cleanup timeout if user loads before timeout
    return () => {
      clearTimeout(timeoutId);
    };
  }, [user]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("📸 Image selected:", {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
    });

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("Image file is too large. Maximum size is 5MB.");
      return;
    }

    setUploadingImage(true);

    try {
      console.log("🔄 Starting profile image upload...");
      console.log("📤 File details:", {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
      });
      
      // Upload image directly using File object (Web)
      const response = await authAPI.uploadProfileImageFile(file);
      
      console.log("=== Profile Image Upload Response ===");
      console.log("Response success:", response.success);
      console.log("Response message:", response.message);
      console.log("Full response:", JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log("✅ Profile image upload successful!");
        // Try multiple possible fields for image URL
        const responseAny = response as any;
        const imageUrl = 
          response.profileImageUrl || 
          response.profileImage ||
          (response.user as any)?.profileImageUrl ||
          (response.user as any)?.profileImage ||
          responseAny.imageUrl ||
          responseAny.image;
        
        console.log("Extracted image URL:", imageUrl);
        
        // Update profile image URL immediately
        let finalImageUrl: string | null = null;
        
        if (imageUrl) {
          finalImageUrl = resolveProfileImageUrl(imageUrl);
          console.log("Resolved final URL from response:", finalImageUrl);
        }
        
        // Update user in store if provided
        if (response.user) {
          console.log("Updating user in store with:", response.user);
          setUser(response.user);
          
          // Also check user object for image URL if not found in response
          if (!finalImageUrl) {
            const userImageUrl = (response.user as any).profileImageUrl || (response.user as any).profileImage;
            if (userImageUrl) {
              finalImageUrl = resolveProfileImageUrl(userImageUrl);
              console.log("Resolved final URL from user object:", finalImageUrl);
            }
          }
        }
        
        // Set the image URL if we found one
        if (finalImageUrl) {
          console.log("✅ Setting profile image URL to:", finalImageUrl);
          console.log("✅ Image URL before setState:", profileImageUrl);
          
          // Set state immediately - this will trigger useMemo to recalculate displayImageUrl
          setProfileImageUrl(finalImageUrl);
          
          // Update timestamp to force image reload (cache-busting)
          setImageUploadTimestamp(Date.now());
          
          // Also save to localStorage
          if (typeof window !== "undefined") {
            window.localStorage.setItem("ticketly_profile_image_url", finalImageUrl);
            console.log("✅ Saved to localStorage:", finalImageUrl);
          }
          
          // Force a re-render by updating the user object in store
          // This ensures the memoized displayImageUrl recalculates
          if (response.user) {
            // Update user again to trigger re-render
            setTimeout(() => {
              setUser({ ...response.user } as any);
            }, 50);
          }
          
          // Force re-render by updating state again after a brief delay
          setTimeout(() => {
            console.log("✅ Verifying image URL is set...");
            setProfileImageUrl((current) => {
              if (current !== finalImageUrl) {
                console.log("⚠️ Image URL mismatch detected, restoring...");
                return finalImageUrl;
              }
              console.log("✅ Image URL is correct:", current);
              return current;
            });
          }, 100);
        } else {
          // If no image URL in response, refresh profile to get it
          console.log("⚠️ No image URL in response, refreshing profile...");
          const profile = await authAPI.getProfile();
          if (profile.success && profile.user) {
            console.log("Profile refreshed, user:", profile.user);
            setUser(profile.user);
            
            // Update image from refreshed profile
            const refreshedImageUrl = (profile.user as any).profileImageUrl || (profile.user as any).profileImage;
            console.log("Refreshed profile image URL:", refreshedImageUrl);
            if (refreshedImageUrl) {
              finalImageUrl = resolveProfileImageUrl(refreshedImageUrl);
              console.log("✅ Resolved final URL from refreshed profile:", finalImageUrl);
              if (finalImageUrl) {
                setProfileImageUrl(finalImageUrl);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("ticketly_profile_image_url", finalImageUrl);
                }
              }
            } else {
              console.warn("⚠️ No image URL found in refreshed profile");
            }
          }
        }
        
        // Verify image URL is set
        if (finalImageUrl) {
          // Use setTimeout to ensure state is updated
          setTimeout(() => {
            console.log("✅ Verifying profile image URL after state update");
            // Force update if somehow it got cleared
            if (!profileImageUrl || profileImageUrl !== finalImageUrl) {
              console.log("⚠️ Image URL mismatch, restoring...");
              setProfileImageUrl(finalImageUrl);
            }
          }, 200);
        }
        
        success("Profile image uploaded successfully!");
      } else {
        showError(response.message || "Failed to upload image.");
      }
    } catch (error: any) {
      console.error("❌ Upload error caught:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        code: error?.code,
      });

      // Handle specific error cases
      let errorMessage = "Failed to upload image. Please try again.";
      
      if (error?.code === "ERR_NETWORK" || error?.message?.includes("Network")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error?.response?.status === 413) {
        errorMessage = "Image file is too large. Maximum size is 5MB.";
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.message || "Invalid image file. Please try a different image.";
      } else if (error?.response?.status === 401) {
        errorMessage = "Unauthorized. Please login again.";
        setTimeout(() => {
          router.push("/login?redirect=/profile");
        }, 2000);
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const createdCount = createdEvents.length;
  const joinedCount = joinedEventsData.length;
  const likedCount = likedEvents.length;

  // Memoize profile image URL calculation to prevent unnecessary recalculations
  const displayImageUrl = useMemo(() => {
    // Priority 1: Use profileImageUrl state if available
    if (profileImageUrl) {
      return profileImageUrl;
    }
    // Priority 2: Resolve from user.profileImageUrl
    if ((user as any)?.profileImageUrl) {
      const resolved = resolveProfileImageUrl((user as any).profileImageUrl);
      if (resolved) return resolved;
    }
    // Priority 3: Resolve from user.profileImage
    if ((user as any)?.profileImage) {
      const resolved = resolveProfileImageUrl((user as any).profileImage);
      if (resolved) return resolved;
    }
    return null;
  }, [profileImageUrl, (user as any)?.profileImageUrl, (user as any)?.profileImage]);

  // Memoize cache-busted URL to prevent reloading on every render
  // Use timestamp to force reload when image is uploaded
  const cacheBustedImageUrl = useMemo(() => {
    if (!displayImageUrl) return null;
    // Add cache-busting parameter with timestamp to force reload on upload
    return `${displayImageUrl}?v=${imageUploadTimestamp}`;
  }, [displayImageUrl, imageUploadTimestamp]);

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

  // Only show "Restoring session" if we're actively hydrating and haven't timed out
  // Also check if we have a token - if no token, don't show restoring message
  // Only check hasToken on client side to avoid hydration mismatch
  const hasToken = mounted && typeof window !== "undefined" ? !!getAccessToken() : false;
  const shouldShowRestoring = mounted && !user && authHydrating && !hydrationTimeout && hasToken;
  
  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }
  
  if (shouldShowRestoring) {
    return (
      <div className="bg-white">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-gray-600">Restoring your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <h1 className="mb-3 text-2xl font-bold text-gray-900">
            Welcome to Ticketly
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            Login to create events, register for events, and manage your profile.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/profile")}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C]"
          >
            Login / Sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200"
            aria-label="Open settings"
          >
            <FiMenu size={20} />
          </button>
        </div>

        <section className="mb-6 text-center">
          <div className="relative mx-auto mb-4 inline-block">
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={uploadingImage}
              className="relative block h-[100px] w-[100px] overflow-hidden rounded-full transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200"
              aria-label="Change profile photo"
              style={{
                minHeight: '100px',
                minWidth: '100px',
              }}
            >
              {/* Avatar Circle */}
              {(() => {
                // Use memoized cache-busted URL
                const finalImageUrl = cacheBustedImageUrl && cacheBustedImageUrl.trim() ? cacheBustedImageUrl : null;
                
                console.log("Avatar render - profileImageUrl state:", profileImageUrl);
                console.log("Avatar render - user.profileImageUrl:", (user as any)?.profileImageUrl);
                console.log("Avatar render - user.profileImage:", (user as any)?.profileImage);
                console.log("Avatar render - displayImageUrl (memoized):", displayImageUrl);
                console.log("Avatar render - cacheBustedImageUrl:", cacheBustedImageUrl);
                console.log("Avatar render - finalImageUrl:", finalImageUrl);
                
                return finalImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`avatar-${displayImageUrl}`} // Force re-render when base URL changes
                    src={finalImageUrl} // Use cache-busted URL
                    alt={user.fullName}
                    className="h-full w-full object-cover rounded-full"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    crossOrigin="anonymous"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      console.error("❌ Image load error for URL:", finalImageUrl);
                      console.error("Error event:", e);
                      console.error("Image element:", e.currentTarget);
                      // Try to get from user object as fallback
                      const fallbackUrl = resolveProfileImageUrl((user as any)?.profileImageUrl) ||
                                        resolveProfileImageUrl((user as any)?.profileImage);
                      if (fallbackUrl && fallbackUrl !== finalImageUrl) {
                        console.log("Trying fallback URL:", fallbackUrl);
                        setProfileImageUrl(fallbackUrl);
                      } else {
                        console.warn("No fallback URL available, clearing profileImageUrl");
                        setProfileImageUrl(null);
                      }
                    }}
                    onLoad={(e) => {
                      console.log("✅ Image loaded successfully:", finalImageUrl);
                      console.log("✅ Image element dimensions:", {
                        width: e.currentTarget.width,
                        height: e.currentTarget.height,
                        naturalWidth: e.currentTarget.naturalWidth,
                        naturalHeight: e.currentTarget.naturalHeight,
                      });
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary text-4xl font-bold text-white rounded-full">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                );
              })()}

              {/* Loading Overlay */}
              {uploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 z-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                aria-label="Upload profile image"
              />
            </button>

            {/* Camera Icon - Outside the circle, bottom-right */}
            {!uploadingImage && (
              <button
                type="button"
                onClick={handleCameraClick}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary border-2 border-white shadow-lg transition-all hover:scale-110 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed z-10"
                aria-label="Change profile photo"
              >
                <FiCamera size={16} className="text-white" />
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
          {user.companyName && (
            <p className="mt-1 text-sm font-semibold text-primary">
              {user.companyName}
            </p>
          )}
        </section>

        <section className="mb-6 flex justify-around text-center text-sm">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {createdCount}
            </div>
            <div className="text-[10px] text-gray-500">Created</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {joinedCount}
            </div>
            <div className="text-[10px] text-gray-500">Joined</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {likedCount}
            </div>
            <div className="text-[10px] text-gray-500">Liked</div>
          </div>
        </section>

        <section className="mb-5 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("created")}
            className={`flex-1 rounded-md px-3 py-2 font-semibold ${
              activeTab === "created"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Created events
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("joined")}
            className={`flex-1 rounded-md px-3 py-2 font-semibold ${
              activeTab === "joined"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Joined events
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("liked")}
            className={`flex-1 rounded-md px-3 py-2 font-semibold ${
              activeTab === "liked"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Liked events
          </button>
        </section>

        <section className="mb-8 min-h-[120px]">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:flex md:flex-wrap md:justify-between md:gap-y-4">
              <EventCardSkeletonList count={4} />
            </div>
          ) : eventsToRender.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">
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


