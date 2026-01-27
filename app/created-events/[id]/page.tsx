"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { eventsAPI, type Event } from "../../../lib/api/events";

type TicketStatus =
  | "all"
  | "pending_payment"
  | "payment_submitted"
  | "confirmed"
  | "used"
  | "cancelled";

interface Ticket {
  id: string;
  user?: {
    _id: string;
    fullName: string;
    username?: string;
    email: string;
  };
  username: string;
  email: string;
  phone: string;
  status: string;
  qrCodeUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CreatedEventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TicketStatus>("all");
  const [refreshing, setRefreshing] = useState(false);

  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const loadEvent = async () => {
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
          err?.response?.data?.error ??
          err?.message ??
          "Failed to load event."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    if (!eventId) return;
    try {
      setLoadingTickets(true);
      const response = await eventsAPI.getTicketsByEventId(String(eventId));
      if (response.success && response.tickets) {
        setTickets(response.tickets);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load tickets", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    void loadTickets();
  }, [event?._id]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadEvent(), loadTickets()]);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredTickets = tickets.filter((ticket: Ticket) =>
    activeTab === "all" ? true : ticket.status === activeTab
  );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          badgeLabel: "Confirmed",
          badgeColor: "bg-[#10B981]",
          borderClass: "border-[#10B981]/50",
          bgClass: "bg-[#10B981]/20"
        };
      case "pending_payment":
        return {
          badgeLabel: "Pending payment",
          badgeColor: "bg-[#F59E0B]",
          borderClass: "border-[#F59E0B]/50",
          bgClass: "bg-[#F59E0B]/20"
        };
      case "payment_submitted":
        return {
          badgeLabel: "Payment submitted",
          badgeColor: "bg-[#3B82F6]",
          borderClass: "border-[#3B82F6]/50",
          bgClass: "bg-[#3B82F6]/20"
        };
      case "used":
        return {
          badgeLabel: "Used",
          badgeColor: "bg-[#6B7280]",
          borderClass: "border-[#6B7280]/50",
          bgClass: "bg-[#6B7280]/20"
        };
      case "cancelled":
        return {
          badgeLabel: "Cancelled",
          badgeColor: "bg-[#EF4444]",
          borderClass: "border-[#EF4444]/50",
          bgClass: "bg-[#EF4444]/20"
        };
      default:
        return {
          badgeLabel: status,
          badgeColor: "bg-[#9CA3AF]",
          borderClass: "border-[#9CA3AF]/50",
          bgClass: "bg-[#9CA3AF]/20"
        };
    }
  };

  const tabs: { key: TicketStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending_payment", label: "Pending" },
    { key: "payment_submitted", label: "Submitted" },
    { key: "confirmed", label: "Confirmed" },
    { key: "used", label: "Used" },
    { key: "cancelled", label: "Cancelled" }
  ];

  const statusCount = (key: TicketStatus) =>
    key === "all"
      ? tickets.length
      : tickets.filter((t: Ticket) => t.status === key).length;

  if ((loading && !event) || (!eventId && !error)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto" />
          <p className="text-sm text-mutedLight">Loading event…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4">
        <p className="mb-4 text-base font-semibold text-danger">
          {error ?? "Event not found."}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-mutedLight hover:text-white"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing || loading}
            className="rounded-full bg-surface px-3 py-2 text-xs text-mutedLight hover:text-white disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-surface shadow-xl">
          <div className="h-64 w-full bg-[#111827]">
            {event.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.image}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="flex-1 text-2xl font-bold text-white">
                {event.title}
              </h1>
              <span className="rounded-xl bg-[#374151] px-3 py-1.5 text-xs font-semibold text-[#D1D5DB]">
                {event.status === "approved"
                  ? "Approved"
                  : event.status === "pending"
                  ? "Pending"
                  : "Draft"}
              </span>
            </div>

            <div className="space-y-3 text-sm text-[#D1D5DB]">
              <div>
                <div className="text-xs font-semibold text-white">
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
                <div className="text-xs font-semibold text-white">
                  Location
                </div>
                <div>{event.location}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Tickets sold
                </div>
                <div>{tickets.length} total</div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1F2937] bg-background px-5 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                const count = statusCount(tab.key);
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${
                      active ? "bg-accent text-white" : "bg-surface text-mutedLight"
                    }`}
                  >
                    <span className="font-semibold">{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        active ? "bg-white/20 text-white" : "bg-[#374151] text-mutedLight"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 px-5 pb-5 pt-3">
            {loadingTickets ? (
              <div className="py-8 text-center text-sm text-mutedLight">
                Loading tickets…
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-8 text-center text-sm text-mutedLight">
                {activeTab === "all"
                  ? "No tickets found."
                  : `No ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()} tickets.`}
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const statusInfo = getStatusInfo(ticket.status);
                const displayName =
                  ticket.user?.fullName ?? ticket.username ?? "Unknown user";
                const displayEmail =
                  ticket.user?.email ?? ticket.email ?? "No email";
                const displayPhone = ticket.phone || "No phone";
                return (
                  <div
                    key={ticket.id}
                    className={`rounded-xl border px-4 py-3 text-sm text-[#D1D5DB] ${statusInfo.bgClass} ${statusInfo.borderClass}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="font-semibold text-white">
                        {displayName}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase text-white ${statusInfo.badgeColor}`}
                      >
                        {statusInfo.badgeLabel}
                      </span>
                    </div>
                    <div className="mb-1 text-xs">{displayEmail}</div>
                    <div className="mb-1 text-xs">{displayPhone}</div>
                    {ticket.createdAt && (
                      <div className="text-[11px] text-muted">
                        {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


