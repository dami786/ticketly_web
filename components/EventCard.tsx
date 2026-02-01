"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import type { Event } from "../lib/api/events";
import { getEventImageUrl, FALLBACK_IMAGE } from "../lib/utils/images";
import { getProfileImageUrl } from "../lib/utils/images";

interface EventCardProps {
  event: Event & { 
    id?: string; 
    joinedCount?: number; 
    joinedUsers?: any[];
    hostAvatarUrl?: string;
    organizerId?: string;
    organizerName?: string;
    price?: number;
  };
  href?: string;
  onPress?: () => void;
}

const PROFILE_FALLBACK = "https://images.unsplash.com/photo-1494797710133-75adf6c1f4a3?w=200";


export function EventCard({ event, href, onPress }: EventCardProps) {
  const router = useRouter();
  const id = event._id ?? event.id;
  const url = href ?? (id ? `/events/${id}` : "#");
  const [showJoinedUsersModal, setShowJoinedUsersModal] = useState(false);

  // Date formatting - "15 Feb 11:00" format as per EVENT_CARD_DESIGN.md
  const formattedDate = new Date(event.date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
  const time = event.time || "";
  const dateTimeDisplay = time ? `${formattedDate} ${time}` : formattedDate;

  // Get event image - with fallback
  const eventImageUrl = getEventImageUrl(event as any) || FALLBACK_IMAGE;

  // Price calculation - as per EVENT_CARD_DESIGN.md
  const priceValue = typeof event.price === 'number' ? event.price : (event.ticketPrice || 0);
  const isFree = priceValue === 0;
  const priceLabel = isFree 
    ? 'Free' 
    : `Rs ${priceValue.toLocaleString('en-PK')}`;

  // ============================================
  // HOST AVATAR LOGIC - as per Avatar Display Functionality Guide
  // ============================================
  const host = event.createdBy as any;
  const hostAvatarUrl = event.hostAvatarUrl ?? null;
  const organizerId = event.organizerId || host?._id || host?.id || '';
  const organizerName = event.organizerName || host?.fullName || 'Host';
  
  // Check if host row should be shown - as per Display Conditions
  const showHostRow = event.organizerName || host?.fullName || organizerId;
  
  // Host avatar URL helper - Priority: hostAvatarUrl > createdBy.profileImageUrl
  const getHostAvatarUrl = (): string => {
    // Priority 1: Direct hostAvatarUrl from converted event
    if (hostAvatarUrl) {
      return hostAvatarUrl;
    }
    
    // Priority 2: Try to get from createdBy
    if (host?.profileImageUrl) {
      const url = getProfileImageUrl({
        profileImage: host.profileImage,
        profileImageUrl: host.profileImageUrl
      });
      if (url) return url;
    }
    
    // Priority 3: Fallback to default
    return PROFILE_FALLBACK;
  };

  // ============================================
  // JOINED USERS AVATARS LOGIC - as per Avatar Display Functionality Guide
  // ============================================
  const joinedUsers = event.joinedUsers || [];
  const joinedCount = event.joinedCount ?? joinedUsers.length ?? 0;
  const visibleJoined = joinedUsers.slice(0, 3);  // First 3 only
  const remainingCount = Math.max(joinedCount - visibleJoined.length, 0);
  
  // Check if joined users section should be shown - as per Display Conditions
  const showJoinedUsers = joinedUsers.length > 0 || joinedCount > 0;
  
  // User avatar URL helper - Priority: avatarUrl > profileImageUrl
  const getUserAvatarUrl = (user: any): string => {
    // Priority 1: avatarUrl from converted event
    if (user.avatarUrl) {
      return user.avatarUrl;
    }
    
    // Priority 2: profileImageUrl (raw from API)
    if (user.profileImageUrl) {
      const url = getProfileImageUrl({
        profileImage: user.profileImage,
        profileImageUrl: user.profileImageUrl
      });
      if (url) return url;
    }
    
    // Priority 3: Fallback to default
    return PROFILE_FALLBACK;
  };
  
  // ============================================
  // DATA VALIDATION - as per AVATAR_FUNCTIONALITY_COMPLETE.md
  // ============================================
  useEffect(() => {
    // Validate event data for debugging
    if (process.env.NODE_ENV === 'development') {
      // Check host avatar
      if (!event.hostAvatarUrl && !host?.profileImageUrl) {
        console.warn('[EventCard] Event missing host avatar:', event.id || event._id);
      }
      
      // Check joined users
      if (joinedCount > 0 && (!joinedUsers || joinedUsers.length === 0)) {
        console.warn('[EventCard] Event has count but no user list:', event.id || event._id, 'Count:', joinedCount);
      }
      
      // Check joined users avatars
      if (joinedUsers && joinedUsers.length > 0) {
        joinedUsers.forEach((user, index) => {
          if (!user.avatarUrl && !user.profileImageUrl) {
            console.warn(`[EventCard] User ${index} missing avatar:`, user.id || user._id, user);
          }
        });
      }
    }
  }, [event, host, joinedUsers, joinedCount]);

  // ============================================
  // HANDLERS - as per Avatar Display Functionality Guide
  // ============================================
  const handleCardClick = (e: React.MouseEvent) => {
    if (onPress) {
      e.preventDefault();
      e.stopPropagation();
      onPress();
    }
    // Otherwise, Link will handle navigation
  };

  const handleHostClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (organizerId) {
      router.push(`/user/${organizerId}`);
    }
  };

  const handleJoinedUsersClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showJoinedUsers) {
      setShowJoinedUsersModal(true);
    }
  };


  const CardContent = (
    <>
      {/* Image Container - 150px height, overflow visible for avatars as per AVATAR_POSITIONING_GUIDE.md */}
      <div className="relative h-[150px] w-full overflow-visible">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={eventImageUrl}
          alt={event.title || "Event"}
          className="h-full w-full object-cover block relative z-[1]"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes("unsplash.com")) {
              target.src = FALLBACK_IMAGE;
            }
          }}
        />

        {/* Price Pill - bottom-left, z-index 5 as per AVATAR_POSITIONING_GUIDE.md */}
        <div className="absolute bottom-2 left-3 rounded-full bg-black/80 px-3 py-1 z-[5] pointer-events-auto">
          <span className="text-[11px] font-semibold text-white leading-none">{priceLabel}</span>
        </div>

        {/* JOINED USERS AVATARS (Bottom Right, Overlapping) - as per Avatar Display Functionality Guide */}
        {showJoinedUsers && (
          <div className="absolute bottom-0 right-[-5px] h-5 flex items-center z-[10] transform translate-y-1/2 pointer-events-auto">
            {joinedUsers.length > 0 ? (
              <div
                onClick={handleJoinedUsersClick}
                className="flex items-center cursor-pointer hover:opacity-80 transition-opacity pr-1 relative z-[11]"
              >
                <div className="flex items-center relative pr-2">
                  {visibleJoined.map((user: any, index: number) => {
                    const zIndexValue = 15 - index; // First avatar: 15, second: 14, third: 13
                    return (
                      <div
                        key={user._id || user.id || index}
                        className="relative"
                        style={{ 
                          marginLeft: index === 0 ? 0 : -6,
                          zIndex: zIndexValue
                        }}
                      >
                        <img
                          src={getUserAvatarUrl(user)}
                          alt={user.fullName || user.name || "User"}
                          className="h-7 w-7 rounded-full border border-[#111827] object-cover bg-[#374151] block flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.error('User avatar failed to load:', getUserAvatarUrl(user));
                            target.src = PROFILE_FALLBACK;
                          }}
                          onLoad={() => {
                            // Image loaded successfully
                          }}
                        />
                      </div>
                    );
                  })}
                  {remainingCount > 0 && (
                    <div 
                      className="ml-1 rounded-full bg-[#111827] px-1.5 py-[1px] h-4 flex items-center justify-center z-[16] relative"
                      style={{ minWidth: '20px', paddingRight: '8px' }}
                    >
                      <span className="text-[8px] font-medium text-white leading-none whitespace-nowrap">+{remainingCount}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : joinedCount > 0 ? (
              <div
                onClick={handleJoinedUsersClick}
                className="rounded-full bg-[#111827] px-2 py-[1px] h-4 flex items-center cursor-pointer hover:opacity-80 transition-opacity mr-1 relative z-[11]"
              >
                <span className="text-[8px] font-medium text-white leading-none whitespace-nowrap">{joinedCount} going</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Content Section - padding 12px as per EVENT_CARD_DESIGN.md */}
      <div className="p-3">
        {/* Date & Time - 9px font, gray-500, mb-1 as per EVENT_CARD_DESIGN.md */}
        <div className="text-[9px] text-[#9CA3AF] mb-1 leading-tight">
          {dateTimeDisplay}
        </div>

        {/* Event Title - 13px font, semibold, white, single line truncate as per EVENT_CARD_DESIGN.md */}
        <h3 
          className="text-[13px] font-semibold text-white mb-2 leading-tight overflow-hidden text-ellipsis whitespace-nowrap"
          title={event.title}
        >
          {event.title}
        </h3>

        {/* HOST AVATAR (Content Section) - as per Avatar Display Functionality Guide */}
        {showHostRow && (
          organizerId ? (
            <button
              type="button"
              onClick={handleHostClick}
              className="flex w-full items-center gap-2 text-left hover:opacity-80 transition-opacity cursor-pointer mt-2"
            >
              <img
                src={getHostAvatarUrl()}
                alt={organizerName}
                className="h-7 w-7 rounded-full border border-[#111827] object-cover bg-black/80 flex-shrink-0 block"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error('Host avatar failed to load:', getHostAvatarUrl());
                  target.src = PROFILE_FALLBACK;
                }}
                onLoad={() => {
                  // Host avatar loaded successfully
                }}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <div 
                  className="text-[10px] font-semibold text-white leading-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]"
                  title={organizerName}
                >
                  {organizerName}
                </div>
                <div className="text-[9px] text-[#9CA3AF] leading-tight">(Host)</div>
              </div>
            </button>
          ) : (
            <div className="flex w-full items-center gap-2 mt-2">
              <img
                src={getHostAvatarUrl()}
                alt={organizerName}
                className="h-7 w-7 rounded-full border border-[#111827] object-cover bg-black/80 flex-shrink-0 block"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error('Host avatar failed to load:', getHostAvatarUrl());
                  target.src = PROFILE_FALLBACK;
                }}
                onLoad={() => {
                  // Host avatar loaded successfully
                }}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <div 
                  className="text-[10px] font-semibold text-white leading-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]"
                  title={organizerName}
                >
                  {organizerName}
                </div>
                <div className="text-[9px] text-[#9CA3AF] leading-tight">(Host)</div>
              </div>
            </div>
          )
        )}
      </div>
    </>
  );

  return (
    <>
      {onPress ? (
        <div
          onClick={handleCardClick}
          className="mb-4 block w-full rounded-md bg-[#1F1F1F] text-left shadow-sm transition hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden"
        >
          {CardContent}
        </div>
      ) : (
        <Link
          href={url}
          className="mb-4 block w-full rounded-md bg-[#1F1F1F] text-left shadow-sm transition hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden"
        >
          {CardContent}
        </Link>
      )}

      {/* Joined Users Drop-up Modal - as per Avatar Display Functionality Guide */}
      {showJoinedUsersModal && showJoinedUsers && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0"
          onClick={() => setShowJoinedUsersModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-[#1F1F1F] p-6 shadow-2xl sm:rounded-2xl max-h-[50vh] sm:max-h-[400px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="mb-4 flex items-center justify-center">
              <div className="h-1 w-10 rounded-full bg-[#4B5563]" />
            </div>

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Joined ({joinedCount > 0 ? joinedCount : joinedUsers.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinedUsersModal(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-[#2F2F2F] hover:text-white transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Users List - Scrollable */}
            <div className="flex-1 space-y-3 overflow-y-auto min-h-0">
              {joinedUsers.length === 0 && joinedCount > 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No attendee list available</p>
              ) : (
                joinedUsers.map((user: any, index: number) => {
                  const userAvatar = getUserAvatarUrl(user);
                  const userId = user._id || user.id || user.id;
                  const userName = user.fullName || user.name || 'User';
                  return (
                    <Link
                      key={user._id || user.id || index}
                      href={userId ? `/user/${userId}` : "#"}
                      className="flex items-center gap-3 rounded-xl p-3 hover:bg-[#2F2F2F] transition-colors"
                      onClick={() => setShowJoinedUsersModal(false)}
                    >
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error('User avatar failed to load in modal:', userAvatar, user);
                          target.src = PROFILE_FALLBACK;
                        }}
                        onLoad={() => {
                          // User avatar loaded successfully
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {userName}
                        </div>
                        {user.email && (
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        )}
      </div>
    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

