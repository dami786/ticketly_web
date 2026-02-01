"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiHeart, FiMail, FiPhone } from "react-icons/fi";
import { authAPI } from "../../../lib/api/auth";
import { eventsAPI, type Event } from "../../../lib/api/events";
import { ticketsAPI } from "../../../lib/api/tickets";
import { getEventImageUrl } from "../../../lib/utils/images";
import { useToast } from "../../../lib/hooks/useToast";
import { useAppStore } from "../../../store/useAppStore";

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
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const { success, error: showError, warning } = useToast();

  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    const load = async () => {
      if (!eventId) {
        setError("Event ID is required.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await eventsAPI.getEventById(String(eventId));
        if (response.success && response.event) {
          const e: any = response.event;
          const transformed: Event = {
            ...e,
            _id: e.id || e._id
          };
          setEvent(transformed);
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
      }
    };
    void load();
  }, [eventId]);

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

  const handleRegister = async () => {
    if (!isAuthenticated) {
      if (confirm("You need to login to register. Go to login page?")) {
        router.push("/login");
      }
      return;
    }
    if (!user || !event || !eventId) return;

    const phone = (user.phone ?? "").trim();
    if (!phone) {
      setShowPhonePrompt(true);
      return;
    }
    await createTicket(phone);
  };

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      if (confirm("You need to login to like events. Go to login page?")) {
        router.push("/login");
      }
      return;
    }

    if (!eventId) return;

    setLiking(true);
    try {
      if (isLiked) {
        const response = await eventsAPI.unlikeEvent(String(eventId));
        if (response.success) {
          setIsLiked(false);
          success("Event removed from liked events");
          // Refresh user profile to update likedEvents
          try {
            const profile = await authAPI.getProfile();
            if (profile.success && profile.user) {
              setUser(profile.user);
            }
          } catch {
            // ignore
          }
        } else {
          showError(response.message || "Failed to unlike event");
        }
      } else {
        const response = await eventsAPI.likeEvent(String(eventId));
        if (response.success) {
          setIsLiked(true);
          success("Event added to liked events");
          // Refresh user profile to update likedEvents
          try {
            const profile = await authAPI.getProfile();
            if (profile.success && profile.user) {
              setUser(profile.user);
            }
          } catch {
            // ignore
          }
        } else {
          showError(response.message || "Failed to like event");
        }
      }
    } catch (error: any) {
      showError(
        error?.response?.data?.message ??
          error?.message ??
          "Failed to update like status"
      );
    } finally {
      setLiking(false);
    }
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
        try {
          const profile = await authAPI.getProfile();
          if (profile.success && profile.user) {
            setUser(profile.user);
          }
        } catch {
          // ignore
        }
        success("Ticket created successfully! You can view it below.");
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
    } catch (error: any) {
      showError(
        error?.response?.data?.message ??
          error?.message ??
          "Failed to create ticket."
      );
    } finally {
      setCreatingTicket(false);
      setShowPhonePrompt(false);
      setPhoneInput("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto" />
          <p className="text-sm text-gray-600">Loading event…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4">
        <p className="mb-4 text-base font-semibold text-danger">
          {error ?? "Event not found."}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-primary/90"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>

        <div className="overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-xl">
          <div className="h-64 w-full bg-[#111827]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getEventImageUrl(event as any)}
              alt={event.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                // Hide image on error, show background text
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="flex-1 text-2xl font-bold text-gray-900">
                {event.title}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLikeToggle}
                  disabled={liking}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    isLiked
                      ? "bg-primary text-gray-900 hover:bg-primary/90"
                      : "bg-[#374151] text-[#D1D5DB] hover:bg-[#4B5563]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-label={isLiked ? "Unlike event" : "Like event"}
                >
                  {liking ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <FiHeart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
                  )}
                  <span>{isLiked ? "Liked" : "Like"}</span>
                </button>
                <span className="rounded-xl bg-[#374151] px-3 py-1.5 text-xs font-semibold text-[#D1D5DB]">
                  {event.status === "approved"
                    ? "Approved"
                    : event.status === "pending"
                    ? "Pending"
                    : "Draft"}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-[#D1D5DB]">
              <div>
                <div className="text-xs font-semibold text-gray-900">
                  Date & time
                </div>
                <div>
                  {new Date(event.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })}{" "}
                  {event.time && `, ${event.time}`}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-900">
                  Location
                </div>
                <div>{event.location}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-900">
                  Ticket price
                </div>
                <div>
                  {event.ticketPrice
                    ? `PKR ${event.ticketPrice.toLocaleString()}`
                    : "Free"}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={creatingTicket}
              onClick={handleRegister}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-primary/90 disabled:opacity-60"
            >
              {creatingTicket
                ? "Processing…"
                : userTickets.length > 0
                ? "Get more tickets"
                : "Register now"}
            </button>
          </div>

          <div className="border-t border-[#1F2937] p-5">
            <h2 className="mb-2 text-lg font-bold text-gray-900">Description</h2>
            <p className="text-sm text-[#D1D5DB] leading-relaxed">
              {event.description}
            </p>
          </div>

          {(event.email || event.phone) && (
            <div className="border-t border-[#1F2937] p-5">
              <h2 className="mb-3 text-lg font-bold text-gray-900">
                Contact information
              </h2>
              {event.email && (
                <div className="mb-2 flex items-center gap-2 text-sm text-[#D1D5DB]">
                  <FiMail className="h-4 w-4 text-gray-600" />
                  <span>{event.email}</span>
                </div>
              )}
              {event.phone && (
                <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
                  <FiPhone className="h-4 w-4 text-gray-600" />
                  <span>{event.phone}</span>
                </div>
              )}
            </div>
          )}

          {event.createdBy && (
            <div className="border-t border-[#1F2937] p-5">
              <h2 className="mb-3 text-lg font-bold text-gray-900">
                Organized by
              </h2>
              <p className="text-base font-semibold text-gray-900">
                {event.createdBy.fullName}
              </p>
              {event.createdBy.email && (
                <p className="mt-1 text-sm text-gray-600">
                  {event.createdBy.email}
                </p>
              )}
            </div>
          )}

          {user && userTickets.length > 0 && (
            <div className="border-t border-[#1F2937] p-5">
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Your tickets ({userTickets.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {userTickets.map((ticket: any, index: number) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className="group relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-4 text-left transition-all hover:border-accent hover:shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                  >
                    {/* Decorative corner accent */}
                    <div className="absolute top-0 right-0 h-16 w-16 rounded-bl-full bg-primary/10" />
                    
                    {/* Ticket content */}
                    <div className="relative">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="rounded-lg bg-primary/20 px-2.5 py-1">
                          <span className="text-xs font-bold text-accent">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-success">
                          ✓ Confirmed
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-gray-600 mb-1">
                          Ticket ID
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {ticket.id.slice(-8).toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-[#D1D5DB]">
                          <span className="text-gray-600">Email:</span>
                          <span className="truncate">{ticket.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#D1D5DB]">
                          <span className="text-gray-600">Phone:</span>
                          <span>{ticket.phone}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                        <span>View details</span>
                        <span>→</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {showPhonePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl">
              <h2 className="mb-2 text-lg font-bold text-gray-900">
                Phone number required
              </h2>
              <p className="mb-4 text-sm text-[#D1D5DB]">
                Please enter your phone number to create a ticket.
              </p>
              <input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+92…"
                className="mb-4 w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhonePrompt(false);
                    setPhoneInput("");
                  }}
                  className="flex-1 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={creatingTicket}
                  onClick={() => {
                    if (!phoneInput.trim() || phoneInput.trim().length < 10) {
                      warning("Please enter a valid phone number (at least 10 digits).");
                      return;
                    }
                    void createTicket(phoneInput);
                  }}
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-primary/90 disabled:opacity-60"
                >
                  {creatingTicket ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


