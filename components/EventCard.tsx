"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import type { Event } from "../lib/api/events";
import { getEventImageUrl, FALLBACK_IMAGE, getProfileImageUrl } from "../lib/utils/images";

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

  // Date formatting - "15 Jan 18:00" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };
  const dateTimeDisplay = event.time ? `${formatDate(event.date)} ${event.time}` : formatDate(event.date);

  // Get event image
  const eventImageUrl = getEventImageUrl(event as any) || FALLBACK_IMAGE;

  // Price calculation
  const priceValue = typeof event.price === 'number' ? event.price : (event.ticketPrice || 0);
  const isFree = priceValue === 0;
  const priceLabel = isFree 
    ? 'Free' 
    : `Rs ${priceValue.toLocaleString('en-PK')}`;

  // Host logic
  const host = event.createdBy as any;
  const hostAvatarUrl = event.hostAvatarUrl ?? null;
  const organizerId = event.organizerId || host?._id || host?.id || '';
  const organizerName = event.organizerName || host?.fullName || 'Host';
  const showHostRow = event.organizerName || host?.fullName || organizerId;
  
  const getHostAvatarUrl = (): string => {
    if (hostAvatarUrl) {
      return hostAvatarUrl;
    }
    if (host?.profileImageUrl) {
      const url = getProfileImageUrl({
        profileImage: host.profileImage,
        profileImageUrl: host.profileImageUrl
      });
      if (url) return url;
    }
    return PROFILE_FALLBACK;
  };

  // Joined users logic
  const joinedUsers = event.joinedUsers || [];
  const joinedCount = event.joinedCount ?? joinedUsers.length ?? 0;
  const visibleJoined = joinedUsers.slice(0, 3);
  const remainingCount = Math.max(joinedCount - visibleJoined.length, 0);
  const showJoinedUsers = joinedUsers.length > 0 || joinedCount > 0;
  
  const getUserAvatarUrl = (user: any): string => {
    if (user.avatarUrl) {
      return user.avatarUrl;
    }
    if (user.profileImageUrl) {
      const url = getProfileImageUrl({
        profileImage: user.profileImage,
        profileImageUrl: user.profileImageUrl
      });
      if (url) return url;
    }
    return PROFILE_FALLBACK;
  };

  // Handlers
  const handleCardClick = (e: React.MouseEvent) => {
    if (onPress) {
      e.preventDefault();
      e.stopPropagation();
      onPress();
    } else {
      e.preventDefault();
      router.push(url);
    }
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
      {/* Background Image - Full card coverage */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={eventImageUrl}
        alt={event.title || "Event"}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.src.includes("unsplash.com")) {
            target.src = FALLBACK_IMAGE;
          }
        }}
      />

      {/* Gradient Overlay - Bottom 60% */}
      <div 
        className="absolute bottom-0 left-0 right-0 w-full"
        style={{
          height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.6) 65%, transparent 100%)'
        }}
      />

      {/* Price Pill - Top-Left */}
      <div className="absolute top-2 left-2 z-[5]">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${
          isFree ? 'bg-[#6B7280]' : 'bg-primary'
        }`}>
          {priceLabel}
        </span>
      </div>

      {/* Joined Users Avatars - Top-Right */}
      {showJoinedUsers && (
        <div className="absolute top-2 right-2 z-[5] flex items-center">
          {joinedUsers.length > 0 ? (
            <div
              onClick={handleJoinedUsersClick}
              className="flex items-center cursor-pointer active:opacity-90"
            >
              <div className="flex items-center">
                {visibleJoined.map((user: any, index: number) => (
                  <img
                    key={user._id || user.id || index}
                    src={getUserAvatarUrl(user)}
                    alt={user.fullName || user.name || "User"}
                    className="w-6 h-6 rounded-full border-[0.5px] border-white object-cover bg-[#374151]"
                    style={{ marginLeft: index === 0 ? 0 : -8 }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = PROFILE_FALLBACK;
                    }}
                  />
                ))}
                {remainingCount > 0 && (
                  <span className="ml-1 px-1.5 py-[2px] rounded-full bg-black/70 text-white text-[9px] font-medium">
                    +{remainingCount}
                  </span>
                )}
              </div>
            </div>
          ) : joinedCount > 0 ? (
            <div
              onClick={handleJoinedUsersClick}
              className="rounded-full bg-black/70 px-2 py-1 cursor-pointer active:opacity-90"
            >
              <span className="text-white text-[9px] font-medium">
                {joinedCount} going
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Event Details - Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-[2]">
        {/* Date & Time */}
        <div className="text-[#D1D5DB] text-[10px] mb-1">
          {dateTimeDisplay}
        </div>

        {/* Event Title */}
        <h3 
          className="text-white text-[14px] font-semibold mb-2 overflow-hidden text-ellipsis whitespace-nowrap"
          title={event.title}
        >
          {event.title}
        </h3>

        {/* Host Row */}
        {showHostRow && (
          organizerId ? (
            <button
              type="button"
              onClick={handleHostClick}
              className="flex items-center gap-2 text-left active:opacity-80"
            >
              <img
                src={getHostAvatarUrl()}
                alt={organizerName}
                className="w-6 h-6 rounded-full border-[0.5px] border-white object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = PROFILE_FALLBACK;
                }}
              />
              <div className="flex flex-col min-w-0">
                <div 
                  className="text-white text-[11px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ maxWidth: '100px' }}
                  title={organizerName}
                >
                  {organizerName}
                </div>
                <div className="text-[#9CA3AF] text-[9px]">(Host)</div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <img
                src={getHostAvatarUrl()}
                alt={organizerName}
                className="w-6 h-6 rounded-full border-[0.5px] border-white object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = PROFILE_FALLBACK;
                }}
              />
              <div className="flex flex-col min-w-0">
                <div 
                  className="text-white text-[11px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ maxWidth: '100px' }}
                  title={organizerName}
                >
                  {organizerName}
                </div>
                <div className="text-[#9CA3AF] text-[9px]">(Host)</div>
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
          className="rounded-md overflow-hidden w-full h-[220px] relative cursor-pointer active:opacity-80"
        >
          {CardContent}
        </div>
      ) : (
        <Link
          href={url}
          className="rounded-md overflow-hidden w-full h-[220px] relative cursor-pointer block active:opacity-80"
        >
          {CardContent}
        </Link>
      )}

      {/* Joined Users Modal */}
      {showJoinedUsersModal && showJoinedUsers && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => setShowJoinedUsersModal(false)}
        >
          <div
            className="w-full bg-[#1F1F1F] rounded-t-2xl border-t border-[#374151] sm:rounded-2xl sm:border-t-0 sm:max-w-md sm:max-h-[400px] flex flex-col"
            style={{ minHeight: '50vh', maxHeight: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#4B5563]" />
            </div>

            {/* Modal Title */}
            <div className="px-4 pb-2">
              <h3 className="text-white text-sm font-semibold">
                Joined ({joinedCount > 0 ? joinedCount : joinedUsers.length})
              </h3>
            </div>

            {/* Users List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide">
              {joinedUsers.length === 0 && joinedCount > 0 ? (
                <div className="text-[#9CA3AF] text-sm py-4 text-center">
                  No attendee list available
                </div>
              ) : (
                joinedUsers.map((user: any, index: number) => {
                  const userAvatar = getUserAvatarUrl(user);
                  const userId = user._id || user.id;
                  const userName = user.fullName || user.name || 'User';
                  return (
                    <button
                      key={user._id || user.id || index}
                      type="button"
                      onClick={() => {
                        if (userId) {
                          setShowJoinedUsersModal(false);
                          router.push(`/user/${userId}`);
                        }
                      }}
                      disabled={!userId}
                      className="w-full flex items-center py-3 border-b border-[#374151]/50 active:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="w-6 h-6 rounded-full bg-[#374151] object-cover flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = PROFILE_FALLBACK;
                        }}
                      />
                      <div className="text-white text-base font-medium ml-3 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                        {userName}
                      </div>
                    </button>
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
