"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  FiArrowLeft,
  FiHeart,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiMail,
  FiPhone,
  FiX,
  FiChevronRight,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiCreditCard
} from "react-icons/fi";
import { authAPI } from "../../../lib/api/auth";
import { eventsAPI, type Event } from "../../../lib/api/events";
import { ticketsAPI } from "../../../lib/api/tickets";
import { getEventImageUrl, FALLBACK_IMAGE } from "../../../lib/utils/images";
import { useToast } from "../../../lib/hooks/useToast";
import { useAppStore } from "../../../store/useAppStore";
import { Modal } from "../../../components/Modal";

const getStatusInfo = (status: string) => {
  switch (status) {
    case "confirmed":
      return {
        label: "SUBMITTED",
        icon: "check-circle",
        iconColor: "#10B981",
        className: "confirmed",
        badgeClass: "bg-[#10B981]",
        borderClass: "border-[#10B981]/50",
        bgClass: "bg-[#10B981]/20",
        textColor: "#10B981"
      };
    case "pending_payment":
      return {
        label: "PENDING",
        icon: "clock",
        iconColor: "#F59E0B",
        className: "pending",
        badgeClass: "bg-[#F59E0B]",
        borderClass: "border-[#F59E0B]/50",
        bgClass: "bg-[#F59E0B]/20",
        textColor: "#F59E0B"
      };
    case "payment_in_review":
    case "payment_submitted":
      return {
        label: "IN REVIEW",
        icon: "clock",
        iconColor: "#3B82F6",
        className: "in-review",
        badgeClass: "bg-[#3B82F6]",
        borderClass: "border-[#3B82F6]/50",
        bgClass: "bg-[#3B82F6]/20",
        textColor: "#3B82F6"
      };
    case "used":
      return {
        label: "USED",
        icon: "check",
        iconColor: "#6B7280",
        className: "used",
        badgeClass: "bg-[#6B7280]",
        borderClass: "border-[#6B7280]/50",
        bgClass: "bg-[#6B7280]/20",
        textColor: "#6B7280"
      };
    case "cancelled":
      return {
        label: "CANCELLED",
        icon: "x",
        iconColor: "#EF4444",
        className: "cancelled",
        badgeClass: "bg-[#EF4444]",
        borderClass: "border-[#EF4444]/50",
        bgClass: "bg-[#EF4444]/20",
        textColor: "#EF4444"
      };
    default:
      return {
        label: status.toUpperCase(),
        icon: "help-circle",
        iconColor: "#9CA3AF",
        className: "default",
        badgeClass: "bg-[#9CA3AF]",
        borderClass: "border-[#9CA3AF]/50",
        bgClass: "bg-[#9CA3AF]/20",
        textColor: "#9CA3AF"
      };
  }
};

const getStatusIcon = (iconName: string) => {
  switch (iconName) {
    case "check-circle":
      return FiCheck;
    case "clock":
      return FiClock;
    case "check":
      return FiCheck;
    case "x":
      return FiX;
    default:
      return FiAlertCircle;
  }
};

const formatDate = (dateString: string, time?: string) => {
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  return time ? `${dateStr}, ${time}` : dateStr;
};

const formatDateShort = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [userTickets, setUserTickets] = useState<any[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [backgroundFetching, setBackgroundFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showInvalidPhoneModal, setShowInvalidPhoneModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [loginModalMessage, setLoginModalMessage] = useState("");
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const likeScaleRef = useRef(1);
  const { success, error: showError, warning, info } = useToast();

  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const loadEvent = async (silent = false) => {
    if (!eventId) {
      setError("Event ID is required.");
      setLoading(false);
      return;
    }
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setBackgroundFetching(true);
      }
      setError(null);
      const response = await eventsAPI.getEventById(String(eventId));
      if (response.success && response.event) {
        const e: any = response.event;
        const transformed: Event = {
          ...e,
          _id: e.id || e._id
        };
        setEvent(transformed);
        setLikeCount(e.likeCount || 0);
      } else {
        setError("Event not found.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to load event."
      );
    } finally {
      setLoading(false);
      setBackgroundFetching(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEvent(true);
      if (user) {
        try {
          const ticketsResponse = await ticketsAPI.getMyTickets();
          if (ticketsResponse.success && ticketsResponse.tickets) {
            const eventTickets = ticketsResponse.tickets.filter((ticket: any) => {
              const tEvent = ticket.event ?? {};
              return (
                tEvent._id === eventId ||
                tEvent.id === eventId ||
                ticket.eventId === eventId
              );
            });
            setUserTickets(eventTickets);
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadTickets = async () => {
      if (!eventId || !user) return;
      try {
        const response = await ticketsAPI.getMyTickets();
        if (response.success && response.tickets) {
          const eventTickets = response.tickets.filter((ticket: any) => {
            const tEvent = ticket.event ?? {};
            return (
              tEvent._id === eventId ||
              tEvent.id === eventId ||
              ticket.eventId === eventId
            );
          });
          setUserTickets(eventTickets);
        }
      } catch {
        // ignore
      }
    };
    void loadTickets();
  }, [eventId, user]);

  // Check if event is liked
  useEffect(() => {
    if (!user || !eventId) {
      setIsLiked(false);
      return;
    }
    
    const likedEvents = user.likedEvents || [];
    const isEventLiked = likedEvents.some((likedEvent: any) => {
      const eventIdToCheck = typeof likedEvent === "string" 
        ? likedEvent 
        : likedEvent._id || likedEvent.id;
      return eventIdToCheck === eventId;
    });
    
    setIsLiked(isEventLiked);
  }, [user, eventId]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      setLoginModalMessage("You need to login to like events.");
      setShowLoginModal(true);
      return;
    }

    if (!eventId) return;

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? Math.max(0, prev - 1) : prev + 1));

    // Animate heart
    likeScaleRef.current = 1.25;
    setTimeout(() => {
      likeScaleRef.current = 0.85;
      setTimeout(() => {
        likeScaleRef.current = 1.0;
      }, 150);
    }, 150);

    setLiking(true);
    try {
      if (wasLiked) {
        const response = await eventsAPI.unlikeEvent(String(eventId));
        if (response.success) {
          const responseAny = response as any;
          if (responseAny.likeCount !== undefined) {
            setLikeCount(responseAny.likeCount);
          }
          try {
            const profile = await authAPI.getProfile();
            if (profile.success && profile.user) {
              setUser(profile.user);
            }
          } catch {
            // ignore
          }
        } else {
          // Revert optimistic update
          setIsLiked(wasLiked);
          setLikeCount((prev) => (wasLiked ? prev + 1 : Math.max(0, prev - 1)));
          showError(response.message || "Failed to unlike event");
        }
      } else {
        const response = await eventsAPI.likeEvent(String(eventId));
        if (response.success) {
          const responseAny = response as any;
          if (responseAny.likeCount !== undefined) {
            setLikeCount(responseAny.likeCount);
          }
          try {
            const profile = await authAPI.getProfile();
            if (profile.success && profile.user) {
              setUser(profile.user);
            }
          } catch {
            // ignore
          }
        } else {
          // Revert optimistic update
          setIsLiked(wasLiked);
          setLikeCount((prev) => (wasLiked ? prev + 1 : Math.max(0, prev - 1)));
          showError(response.message || "Failed to like event");
        }
      }
    } catch (error: any) {
      // Revert optimistic update
      setIsLiked(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : Math.max(0, prev - 1)));
      showError(
        error?.response?.data?.message ??
          error?.message ??
          "Failed to update like status"
      );
    } finally {
      setLiking(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      setLoginModalMessage("You need to login to register for events.");
      setShowLoginModal(true);
      return;
    }
    if (!user || !event || !eventId) return;

    const phone = (user.phone ?? "").trim();
    if (!phone) {
      setShowPhoneModal(true);
      return;
    }
    await createTicket(phone);
  };

  const handlePhoneSubmit = async () => {
    const phone = phoneInput.trim();
    if (!phone || phone.length < 10) {
      setShowInvalidPhoneModal(true);
      return;
    }
    await createTicket(phone);
  };

  const createTicket = async (phone: string) => {
    if (!user || !event || !eventId) return;
    setCreatingTicket(true);
    try {
      const ticketData = {
        eventId: String(eventId),
        username: user.username ?? user.fullName,
        email: user.email,
        phone: phone.trim()
      };
      const response = await ticketsAPI.createTicket(ticketData);
      if (response.success && response.ticket) {
        const ticketAny = response.ticket as any;
        setCreatedTicketId(ticketAny.id || ticketAny._id);
        setSuccessModalMessage(
          "Your ticket has been created successfully! You can view it below."
        );
        setShowSuccessModal(true);
        setShowPhoneModal(false);
        setPhoneInput("");
        
        try {
          const profile = await authAPI.getProfile();
          if (profile.success && profile.user) {
            setUser(profile.user);
          }
        } catch {
          // ignore
        }
        try {
          const ticketsResponse = await ticketsAPI.getMyTickets();
          if (ticketsResponse.success && ticketsResponse.tickets) {
            const eventTickets = ticketsResponse.tickets.filter((ticket: any) => {
              const tEvent = ticket.event ?? {};
              return (
                tEvent._id === eventId ||
                tEvent.id === eventId ||
                ticket.eventId === eventId
              );
            });
            setUserTickets(eventTickets);
          }
        } catch {
          // ignore
        }
      } else {
        setErrorModalMessage(response.message || "Failed to create ticket.");
        setShowErrorModal(true);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to create ticket.";
      setErrorModalMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setCreatingTicket(false);
    }
  };

  const getTicketPrice = () => {
    if (!event) return "Free";
    const eventAny = event as any;
    const price = eventAny.price?.price;
    const currency = eventAny.price?.currency;
    const ticketPrice = event.ticketPrice;

    if (price === "free" || currency === null || !currency) {
      return "Free";
    }
    if (currency && price) {
      return `${currency} ${price}`;
    }
    if (ticketPrice) {
      return `PKR ${ticketPrice.toLocaleString()}`;
    }
    return "Free";
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-gray-600">Loading event…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4">
        <p className="mb-4 text-base font-semibold text-[#EF4444]">
          {error ?? "Event not found."}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
        >
          Go back
        </button>
      </div>
    );
  }

  const eventImageUrl = getEventImageUrl(event);
  const isRegistered = userTickets.length > 0;
  const organizerId = (event as any).createdBy?._id || (event as any).organizerId;

  return (
    <div className="bg-white min-h-screen">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Fixed Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="fixed left-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
          style={{ top: 'calc(8px + env(safe-area-inset-top))' }}
        >
          <FiArrowLeft size={20} className="text-gray-900" />
        </button>

        {/* Header Image */}
        <div
          className="w-full h-[300px] relative cursor-pointer"
          onClick={() => setShowImageViewer(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={eventImageUrl || FALLBACK_IMAGE}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = FALLBACK_IMAGE;
            }}
          />
        </div>

        {/* Event Info Card */}
        <div className="bg-white rounded-t-3xl px-3 py-2.5 -mt-5 border-t border-gray-200 overflow-hidden relative">
          {/* Background Loading Line */}
          {backgroundFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200 z-[1] overflow-hidden">
              <div className="h-full bg-primary animate-loading-progress" />
            </div>
          )}

          {/* Title & Like Button Row */}
          <div className="flex flex-row justify-between items-center mb-3">
            <h1 className="text-gray-900 text-lg font-bold flex-1 mr-2">
              {event.title}
            </h1>
            <button
              type="button"
              onClick={handleLike}
              disabled={liking}
              className="flex flex-row items-center gap-1 bg-gray-100 py-1 px-2 rounded-lg active:opacity-70 disabled:opacity-50"
            >
              <div
                style={{
                  transform: `scale(${likeScaleRef.current})`,
                  transition: 'transform 0.2s ease-out'
                }}
              >
                <FiHeart
                  size={16}
                  className={isLiked ? "text-[#EF4444] fill-current" : "text-[#9CA3AF]"}
                />
              </div>
              <span className="text-gray-700 text-xs font-semibold">{likeCount}</span>
            </button>
          </div>

          {/* Event Date & Time */}
          <div className="flex flex-row mb-2 items-start">
            <FiCalendar size={16} className="text-[#6B7280] mr-2 mt-0.5" />
            <div className="flex-1">
              <div className="text-gray-900 text-xs font-semibold mb-0.5">
                Event Date & Time
              </div>
              <div className="text-gray-700 text-xs">
                {formatDate(event.date, event.time)}
              </div>
            </div>
          </div>

          {/* Location (Optional) */}
          {event.location && (
            <div className="flex flex-row mb-2 items-start">
              <FiMapPin size={16} className="text-[#6B7280] mr-2 mt-0.5" />
              <div className="flex-1">
                <div className="text-gray-900 text-xs font-semibold mb-0.5">
                  Location
                </div>
                <div className="text-gray-700 text-xs">{event.location}</div>
              </div>
            </div>
          )}

          {/* Gender (Optional) */}
          {(event as any).gender && (
            <div className="flex flex-row mb-2 items-start">
              <FiUser size={16} className="text-[#6B7280] mr-2 mt-0.5" />
              <div className="flex-1">
                <div className="text-gray-900 text-xs font-semibold mb-0.5">
                  Gender
                </div>
                <div className="text-gray-700 text-xs capitalize">
                  {(event as any).gender}
                </div>
              </div>
            </div>
          )}

          {/* Ticket Price */}
          <div className="flex flex-row mb-2 items-start">
            <FiCreditCard size={16} className="text-[#6B7280] mr-2 mt-0.5" />
            <div className="flex-1">
              <div className="text-gray-900 text-xs font-semibold mb-0.5">
                Ticket Price
              </div>
              <div className="text-gray-700 text-xs">{getTicketPrice()}</div>
              {(event as any).totalTickets != null && (event as any).totalTickets > 0 && (
                <div className="text-gray-600 text-[10px] mt-0.5">
                  {(event as any).totalTickets} tickets available
                </div>
              )}
            </div>
          </div>

          {/* Register / Get More Tickets Button */}
          <button
            type="button"
            onClick={handleRegister}
            disabled={creatingTicket}
            className="py-2.5 rounded-lg flex items-center justify-center mt-2 bg-primary w-full disabled:opacity-60"
          >
            {creatingTicket ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span className="text-white text-xs font-bold">
                {isRegistered ? "Get More Tickets" : "Register Now"}
              </span>
            )}
          </button>
        </div>

        {/* Event Description Section */}
        {event.description && (
          <div className="px-3 py-2 border-t border-gray-200 bg-white">
            <div className="text-gray-900 text-sm font-bold mb-1.5">
              Event Description
            </div>
            <div className="text-gray-700 text-xs leading-5">{event.description}</div>
          </div>
        )}

        {/* Contact Information Section */}
        {(event.email || event.phone) && (
          <div className="px-3 py-2 border-t border-gray-200 bg-white">
            <div className="text-gray-900 text-sm font-bold mb-1.5">
              Contact Information
            </div>
            {event.email && (
              <div className="flex flex-row items-center mb-1">
                <FiMail size={14} className="text-[#6B7280] mr-2" />
                <span className="text-gray-700 text-xs">{event.email}</span>
              </div>
            )}
            {event.phone && (
              <div className="flex flex-row items-center">
                <FiPhone size={14} className="text-[#6B7280] mr-2" />
                <span className="text-gray-700 text-xs">{event.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Organized By Section */}
        {((event as any).createdBy || (event as any).organizerName) && (
          <div className="px-3 py-2 border-t border-gray-200 bg-white">
            <div className="text-gray-900 text-sm font-bold mb-1.5">
              Organized By
            </div>
            {organizerId ? (
              <button
                type="button"
                onClick={() => router.push(`/user/${organizerId}`)}
                className="text-gray-800 text-xs font-semibold text-primary active:opacity-70"
              >
                {(event as any).createdBy?.fullName ?? (event as any).organizerName ?? "—"}
              </button>
            ) : (
              <span className="text-gray-800 text-xs font-semibold text-primary">
                {(event as any).createdBy?.fullName ?? (event as any).organizerName ?? "—"}
              </span>
            )}
            {((event as any).createdBy?.email || event.email) && (
              <div className="text-gray-600 text-[10px] mt-0.5">
                {(event as any).createdBy?.email ?? event.email}
              </div>
            )}
          </div>
        )}

        {/* User's Tickets Section */}
        {user && userTickets.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-white" style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom))' }}>
            <div className="text-gray-900 text-sm font-bold mb-2">
              Your Tickets ({userTickets.length})
            </div>
            {userTickets.map((ticket: any) => {
              const statusInfo = getStatusInfo(ticket.status);
              const StatusIcon = getStatusIcon(statusInfo.icon);
              const ticketId = ticket.id || ticket._id;
              const last8Chars = String(ticketId).slice(-8).toUpperCase();

              return (
                <button
                  key={ticketId}
                  type="button"
                  onClick={() => router.push(`/tickets/${ticketId}`)}
                  className={`rounded-lg p-2.5 mb-2 border w-full text-left active:opacity-70 ${statusInfo.bgClass} ${statusInfo.borderClass}`}
                >
                  <div className="flex flex-row items-start justify-between">
                    <div className="flex-1 mr-2 min-w-0">
                      <div className="flex flex-row items-center justify-between mb-2">
                        <div className="flex flex-row items-center flex-1 min-w-0">
                          <StatusIcon size={16} className="mr-1.5" style={{ color: statusInfo.iconColor }} />
                          <span className="text-gray-900 text-xs font-bold truncate">
                            Ticket #{last8Chars}
                          </span>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full ml-1 ${statusInfo.badgeClass}`}>
                          <span className="text-white text-[9px] font-bold uppercase">
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex flex-row items-center mb-1">
                          <FiMail size={12} className="text-[#6B7280] mr-1.5" />
                          <span className="text-gray-700 text-[10px] flex-1 truncate">
                            {ticket.email}
                          </span>
                        </div>
                        <div className="flex flex-row items-center mb-1">
                          <FiPhone size={12} className="text-[#6B7280] mr-1.5" />
                          <span className="text-gray-700 text-[10px]">{ticket.phone}</span>
                        </div>
                        {ticket.createdAt && (
                          <div className="flex flex-row items-center">
                            <FiCalendar size={12} className="text-[#6B7280] mr-1.5" />
                            <span className="text-gray-600 text-[9px]">
                              {formatDateShort(ticket.createdAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <FiChevronRight size={18} className="text-[#6B7280]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          {/* Fixed Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="fixed top-6 left-6 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
          >
            <FiArrowLeft size={20} className="text-gray-900" />
          </button>

          {/* Header Image */}
          <div
            className="w-full h-[300px] rounded-2xl overflow-hidden mb-4 relative cursor-pointer"
            onClick={() => setShowImageViewer(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={eventImageUrl || FALLBACK_IMAGE}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = FALLBACK_IMAGE;
              }}
            />
          </div>

          {/* Event Info Card */}
          <div className="bg-white rounded-2xl px-5 py-4 border border-gray-200 shadow-sm mb-4 relative overflow-hidden">
            {/* Background Loading Line */}
            {backgroundFetching && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200 z-1 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: '40%',
                    animation: 'loadingProgress 1.2s infinite'
                  }}
                />
              </div>
            )}

            {/* Title & Like Button Row */}
            <div className="flex flex-row justify-between items-center mb-4">
              <h1 className="text-gray-900 text-2xl font-bold flex-1 mr-3">
                {event.title}
              </h1>
              <button
                type="button"
                onClick={handleLike}
                disabled={liking}
                className="flex flex-row items-center gap-1 bg-gray-100 py-1 px-2 rounded-lg hover:opacity-80 disabled:opacity-50"
              >
                <div
                  style={{
                    transform: `scale(${likeScaleRef.current})`,
                    transition: 'transform 0.2s ease-out'
                  }}
                >
                  <FiHeart
                    size={16}
                    className={isLiked ? "text-[#EF4444] fill-current" : "text-[#9CA3AF]"}
                  />
                </div>
                <span className="text-gray-700 text-xs font-semibold">{likeCount}</span>
              </button>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Event Date & Time */}
              <div className="flex flex-row items-start">
                <FiCalendar size={16} className="text-[#6B7280] mr-2 mt-0.5" />
                <div className="flex-1">
                  <div className="text-gray-900 text-xs font-semibold mb-0.5">
                    Event Date & Time
                  </div>
                  <div className="text-gray-700 text-xs">
                    {formatDate(event.date, event.time)}
                  </div>
                </div>
              </div>

              {/* Location (Optional) */}
              {event.location && (
                <div className="flex flex-row items-start">
                  <FiMapPin size={16} className="text-[#6B7280] mr-2 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-gray-900 text-xs font-semibold mb-0.5">
                      Location
                    </div>
                    <div className="text-gray-700 text-xs">{event.location}</div>
                  </div>
                </div>
              )}

              {/* Gender (Optional) */}
              {(event as any).gender && (
                <div className="flex flex-row items-start">
                  <FiUser size={16} className="text-[#6B7280] mr-2 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-gray-900 text-xs font-semibold mb-0.5">
                      Gender
                    </div>
                    <div className="text-gray-700 text-xs capitalize">
                      {(event as any).gender}
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Price */}
              <div className="flex flex-row items-start">
                <FiCreditCard size={16} className="text-[#6B7280] mr-2 mt-0.5" />
                <div className="flex-1">
                  <div className="text-gray-900 text-xs font-semibold mb-0.5">
                    Ticket Price
                  </div>
                  <div className="text-gray-700 text-xs">{getTicketPrice()}</div>
                  {(event as any).totalTickets != null && (event as any).totalTickets > 0 && (
                    <div className="text-gray-600 text-[10px] mt-0.5">
                      {(event as any).totalTickets} tickets available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Register / Get More Tickets Button */}
            <button
              type="button"
              onClick={handleRegister}
              disabled={creatingTicket}
              className="py-2.5 rounded-lg flex items-center justify-center mt-2 bg-primary w-full disabled:opacity-60 hover:bg-[#B91C1C]"
            >
              {creatingTicket ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span className="text-white text-xs font-bold">
                  {isRegistered ? "Get More Tickets" : "Register Now"}
                </span>
              )}
            </button>
          </div>

          {/* Event Description Section */}
          {event.description && (
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-200 shadow-sm mb-4">
              <div className="text-gray-900 text-sm font-bold mb-1.5">
                Event Description
              </div>
              <div className="text-gray-700 text-xs leading-5">{event.description}</div>
            </div>
          )}

          {/* Contact Information Section */}
          {(event.email || event.phone) && (
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-200 shadow-sm mb-4">
              <div className="text-gray-900 text-sm font-bold mb-1.5">
                Contact Information
              </div>
              {event.email && (
                <div className="flex flex-row items-center mb-1">
                  <FiMail size={14} className="text-[#6B7280] mr-2" />
                  <span className="text-gray-700 text-xs">{event.email}</span>
                </div>
              )}
              {event.phone && (
                <div className="flex flex-row items-center">
                  <FiPhone size={14} className="text-[#6B7280] mr-2" />
                  <span className="text-gray-700 text-xs">{event.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Organized By Section */}
          {((event as any).createdBy || (event as any).organizerName) && (
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-200 shadow-sm mb-4">
              <div className="text-gray-900 text-sm font-bold mb-1.5">
                Organized By
              </div>
              {organizerId ? (
                <button
                  type="button"
                  onClick={() => router.push(`/user/${organizerId}`)}
                  className="text-gray-800 text-xs font-semibold text-primary hover:opacity-80"
                >
                  {(event as any).createdBy?.fullName ?? (event as any).organizerName ?? "—"}
                </button>
              ) : (
                <span className="text-gray-800 text-xs font-semibold text-primary">
                  {(event as any).createdBy?.fullName ?? (event as any).organizerName ?? "—"}
                </span>
              )}
              {((event as any).createdBy?.email || event.email) && (
                <div className="text-gray-600 text-[10px] mt-0.5">
                  {(event as any).createdBy?.email ?? event.email}
                </div>
              )}
            </div>
          )}

          {/* User's Tickets Section */}
          {user && userTickets.length > 0 && (
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-200 shadow-sm mb-4">
              <div className="text-gray-900 text-sm font-bold mb-2">
                Your Tickets ({userTickets.length})
              </div>
              <div className="space-y-2">
                {userTickets.map((ticket: any) => {
                  const statusInfo = getStatusInfo(ticket.status);
                  const StatusIcon = getStatusIcon(statusInfo.icon);
                  const ticketId = ticket.id || ticket._id;
                  const last8Chars = String(ticketId).slice(-8).toUpperCase();

                  return (
                    <button
                      key={ticketId}
                      type="button"
                      onClick={() => router.push(`/tickets/${ticketId}`)}
                      className={`rounded-lg p-2.5 border w-full text-left hover:opacity-80 ${statusInfo.bgClass} ${statusInfo.borderClass}`}
                    >
                      <div className="flex flex-row items-start justify-between">
                        <div className="flex-1 mr-2 min-w-0">
                          <div className="flex flex-row items-center justify-between mb-2">
                            <div className="flex flex-row items-center flex-1 min-w-0">
                              <StatusIcon size={16} className="mr-1.5" style={{ color: statusInfo.iconColor }} />
                              <span className="text-gray-900 text-xs font-bold truncate">
                                Ticket #{last8Chars}
                              </span>
                            </div>
                            <div className={`px-2 py-0.5 rounded-full ml-1 ${statusInfo.badgeClass}`}>
                              <span className="text-white text-[9px] font-bold uppercase">
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <div className="flex flex-row items-center mb-1">
                              <FiMail size={12} className="text-[#6B7280] mr-1.5" />
                              <span className="text-gray-700 text-[10px] flex-1 truncate">
                                {ticket.email}
                              </span>
                            </div>
                            <div className="flex flex-row items-center mb-1">
                              <FiPhone size={12} className="text-[#6B7280] mr-1.5" />
                              <span className="text-gray-700 text-[10px]">{ticket.phone}</span>
                            </div>
                            {ticket.createdAt && (
                              <div className="flex flex-row items-center">
                                <FiCalendar size={12} className="text-[#6B7280] mr-1.5" />
                                <span className="text-gray-600 text-[9px]">
                                  {formatDateShort(ticket.createdAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-center">
                          <FiChevronRight size={18} className="text-[#6B7280]" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phone Modal */}
      {showPhoneModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
          onClick={() => {
            if (!creatingTicket) {
              setShowPhoneModal(false);
              setPhoneInput("");
            }
          }}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 p-4 w-full max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="flex items-center justify-center pt-1 pb-2">
              <div className="w-8 h-0.5 rounded-full bg-gray-300" />
            </div>

            {/* Modal Title */}
            <h2 className="text-gray-900 text-base font-bold mb-1.5 text-center">
              Phone Number Required
            </h2>

            {/* Modal Message */}
            <p className="text-gray-600 text-xs leading-5 mb-3 text-center">
              Enter your phone number to create a ticket
            </p>

            {/* Phone Input */}
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Enter your phone number"
              className="w-full bg-gray-50 text-gray-900 text-xs px-3 py-2 rounded-lg mb-3 border border-gray-200 outline-none placeholder:text-[#9CA3AF]"
              autoFocus
            />

            {/* Buttons */}
            <div className="flex flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!creatingTicket) {
                    setShowPhoneModal(false);
                    setPhoneInput("");
                  }
                }}
                disabled={creatingTicket}
                className="flex-1 py-2 rounded-lg flex items-center justify-center bg-gray-100 border border-gray-200"
              >
                <span className="text-gray-900 text-xs font-semibold">Cancel</span>
              </button>
              <button
                type="button"
                onClick={handlePhoneSubmit}
                disabled={creatingTicket}
                className="flex-1 py-2 rounded-lg flex items-center justify-center bg-primary disabled:opacity-60"
              >
                {creatingTicket ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span className="text-white text-xs font-semibold">Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={() => setShowImageViewer(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={eventImageUrl || FALLBACK_IMAGE}
            alt={event.title}
            className="w-full h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setShowImageViewer(false)}
            className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            style={{ top: 'calc(32px + env(safe-area-inset-top))' }}
          >
            <FiX size={24} className="text-white" />
          </button>
        </div>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (createdTicketId) {
            router.push(`/tickets/${createdTicketId}`);
          }
        }}
        title="Success"
        message={successModalMessage}
        variant="success"
        primaryButtonText="View Ticket"
        onPrimaryPress={() => {
          setShowSuccessModal(false);
          if (createdTicketId) {
            router.push(`/tickets/${createdTicketId}`);
          }
        }}
      />

      {/* Login Modal */}
      <Modal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Login Required"
        message={loginModalMessage}
        variant="info"
        primaryButtonText="Login"
        secondaryButtonText="Cancel"
        onPrimaryPress={() => router.push("/login")}
        onSecondaryPress={() => setShowLoginModal(false)}
      />

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        message={errorModalMessage}
        variant="error"
        primaryButtonText="OK"
        onPrimaryPress={() => setShowErrorModal(false)}
      />

      {/* Invalid Phone Modal */}
      <Modal
        visible={showInvalidPhoneModal}
        onClose={() => setShowInvalidPhoneModal(false)}
        title="Invalid Phone"
        message="Please enter a valid phone number (at least 10 digits)."
        variant="error"
        primaryButtonText="OK"
        onPrimaryPress={() => setShowInvalidPhoneModal(false)}
      />
    </div>
  );
}
