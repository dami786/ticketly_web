"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiEdit,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiDollarSign,
  FiCheck,
  FiX,
  FiMail,
  FiPhone,
  FiClock,
  FiCamera,
  FiSave,
  FiAlertCircle,
  FiHash,
  FiChevronDown,
  FiChevronUp,
  FiChevronRight,
} from "react-icons/fi";
import { MdPalette } from "react-icons/md";
import QRScanner from "../../../components/QRScanner";
import { eventsAPI, type Event } from "../../../lib/api/events";
import { ticketsAPI } from "../../../lib/api/tickets";
import { useToast } from "../../../lib/hooks/useToast";
import { getEventImageUrl, FALLBACK_IMAGE } from "../../../lib/utils/images";

type TicketStatus =
  | "all"
  | "pending_payment"
  | "payment_in_review"
  | "confirmed"
  | "used"
  | "cancelled";

interface Ticket {
  id: string;
  _id?: string;
  accessKey?: string;
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

const tabs: { key: TicketStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending" },
  { key: "payment_in_review", label: "In Review" },
  { key: "confirmed", label: "Submitted" },
  { key: "used", label: "Used" },
  { key: "cancelled", label: "Cancelled" }
];

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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatEventDate = (dateString: string, time?: string) => {
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  return time ? `${dateStr}, ${time}` : dateStr;
};

export default function CreatedEventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [backgroundFetching, setBackgroundFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TicketStatus>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"used" | "cancelled" | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const { success, error: showError } = useToast();
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const loadEvent = async (isBackground = false) => {
    if (!eventId) {
      setError("Event ID is required.");
      setLoading(false);
      return;
    }
    try {
      if (!isBackground && !event) {
      setLoading(true);
      }
      if (isBackground) {
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
      if (!isBackground) {
      setLoading(false);
      }
      if (isBackground) {
        setBackgroundFetching(false);
      }
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
      await Promise.all([loadEvent(true), loadTickets()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateTicketStatus = async () => {
    if (!ticketNumber.trim()) {
      setUpdateError("Please enter a ticket number");
      return;
    }

    if (!selectedStatus) {
      setUpdateError("Please select a status");
      return;
    }

    try {
      setUpdatingStatus(true);
      setUpdateError(null);

      const response = await ticketsAPI.updateTicketStatusByKey({
        accessKey: ticketNumber.trim(),
        status: selectedStatus
      });

      if (response.success) {
        setUpdateModalOpen(false);
        setTicketNumber("");
        setSelectedStatus(null);
        setUpdateError(null);
        await loadTickets();
        success(response.message || "Ticket status updated successfully.");
      } else {
        setUpdateError(response.message || "Failed to update ticket status.");
        showError(response.message || "Failed to update ticket status.");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        "Failed to update ticket status.";
      setUpdateError(message);
      showError(message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleScanQrClick = () => {
    setQrScannerOpen(true);
  };


  const filteredTickets = tickets.filter((ticket: Ticket) => {
    if (activeTab === "all") return true;
    // Map confirmed to payment_in_review for filtering if needed
    if (activeTab === "payment_in_review") {
      return ticket.status === "payment_in_review" || ticket.status === "payment_submitted";
    }
    return ticket.status === activeTab;
  });

  const getStatusCount = (key: TicketStatus) => {
    if (key === "all") return tickets.length;
    if (key === "payment_in_review") {
      return tickets.filter(
        (t: Ticket) => t.status === "payment_in_review" || t.status === "payment_submitted"
      ).length;
    }
    return tickets.filter((t: Ticket) => t.status === key).length;
  };

  const getTicketPrice = () => {
    if (!event) return "Free";
    const price = (event as any).price?.price;
    const currency = (event as any).price?.currency;
    const ticketPrice = (event as any).ticketPrice;

    if (price === "free" || currency === null || !currency) {
      return "Free";
    }
    if (currency && price) {
      return `${currency} ${price}`;
    }
    if (ticketPrice) {
      return `PKR ${ticketPrice}`;
    }
    return "Free";
  };

  if ((loading && !event) || (!eventId && !error)) {
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
        <p className="mb-4 text-base font-semibold text-[#EF4444]">{error ?? "Event not found."}</p>
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

  return (
    <div className="bg-white min-h-screen">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Header Image Section */}
        <div className="relative w-full h-[300px]">
          <button
            type="button"
            onClick={() => setImageViewerOpen(true)}
            className="absolute inset-0 w-full h-full"
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
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute top-[50px] left-5 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
            style={{ paddingTop: 'calc(50px + env(safe-area-inset-top))' }}
          >
            <FiArrowLeft size={20} className="text-gray-900" />
          </button>

          {/* Edit Button (Top Right) */}
          <button
            type="button"
            onClick={() => router.push(`/edit-event/${eventId}`)}
            className="absolute top-[50px] right-5 z-10 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md"
            style={{ paddingTop: 'calc(50px + env(safe-area-inset-top))' }}
          >
            <FiEdit size={20} className="text-white" />
          </button>
        </div>

        {/* Event Info Card (Sticky) */}
        <div className="bg-white rounded-t-3xl -mt-5 p-5 border-t border-gray-200 sticky top-0 z-5 relative overflow-hidden">
          {/* Loading Line (Background Fetch) */}
          {backgroundFetching && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gray-200 overflow-hidden">
              <div className="h-full bg-primary animate-loading-progress" />
            </div>
          )}

          {/* Title, Status Badge & Edit Button Row */}
          <div className="flex flex-row justify-between items-start mb-6">
            <h1 className="text-gray-900 text-2xl font-bold flex-1 mr-3">{event.title}</h1>
            <div className="flex flex-row items-center gap-2">
              {/* Status Badge */}
              <div className="bg-gray-100 py-1.5 px-3 rounded-xl">
                <span className="text-gray-700 text-xs font-semibold">
                  {event.status === "approved"
                    ? "Approved"
                    : event.status === "pending"
                    ? "Pending"
                    : "Draft"}
                </span>
              </div>
              {/* Edit Button */}
              <button
                type="button"
                onClick={() => router.push(`/edit-event/${eventId}`)}
                className="bg-primary py-2 px-3 rounded-xl flex flex-row items-center"
              >
                <FiEdit size={16} className="text-white mr-1" />
                <span className="text-white text-xs font-semibold">Edit</span>
              </button>
            </div>
          </div>

          {/* Collapsible Event Details Header */}
          <button
            type="button"
            onClick={() => setDetailsExpanded((prev) => !prev)}
            className="mb-2 flex w-full flex-row items-center justify-between"
          >
            <span className="text-gray-900 text-sm font-semibold">Event details</span>
            {detailsExpanded ? (
              <FiChevronUp size={18} className="text-[#6B7280]" />
            ) : (
              <FiChevronDown size={18} className="text-[#6B7280]" />
            )}
          </button>

          {detailsExpanded && (
            <>
              {/* Event Date & Time */}
              <div className="flex flex-row mb-5 items-start">
                <FiCalendar size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                <div className="flex-1">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Event Date & Time</div>
                  <div className="text-gray-700 text-sm mb-0.5">
                    {formatEventDate(event.date, event.time)}
                  </div>
                </div>
              </div>

              {/* Location (Optional) */}
              {event.location && (
                <div className="flex flex-row mb-5 items-start">
                  <FiMapPin size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-gray-900 text-sm font-semibold mb-1">Location</div>
                    <div className="text-gray-700 text-sm mb-0.5">{event.location}</div>
                  </div>
                </div>
              )}

              {/* Description (Optional) */}
              {event.description && (
                <div className="mb-5">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Description</div>
                  <div className="text-gray-700 text-sm leading-6">{event.description}</div>
                </div>
              )}

              {/* Gender (Optional) */}
              {(event as any).gender && (
                <div className="flex flex-row mb-5 items-start">
                  <FiUser size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-gray-900 text-sm font-semibold mb-1">Gender</div>
                    <div className="text-gray-700 text-sm mb-0.5 capitalize">{(event as any).gender}</div>
                  </div>
                </div>
              )}

              {/* Ticket Price */}
              <div className="flex flex-row mb-5 items-start">
                <FiDollarSign size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                <div className="flex-1">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Ticket Price</div>
                  <div className="text-gray-700 text-sm mb-0.5">{getTicketPrice()}</div>
                </div>
              </div>

              {/* Total Tickets Sold */}
              <div className="flex flex-row items-start mb-4">
                <FiDollarSign size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                <div className="flex-1">
                  <div className="text-gray-900 text-sm font-semibold mb-1">Total Tickets</div>
                  <div className="text-gray-700 text-sm mb-0.5">
                    {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} sold
                  </div>
                </div>
              </div>

            </>
          )}

          {/* Event Ticket Theme Button */}
          <button
            type="button"
            onClick={() => {
              if (eventId) {
                router.push(`/event-ticket-theme/${eventId}`);
              }
            }}
            className="mt-4 flex w-full flex-row items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
          >
            <div className="flex flex-row items-center gap-2">
              <MdPalette size={16} className="text-primary" />
              <div className="flex flex-col items-start">
                <span className="text-xs font-semibold text-gray-900">Event Ticket</span>
                <span className="text-[10px] text-gray-600">Customize colors &amp; look</span>
              </div>
            </div>
            <FiChevronRight size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs Section (Sticky) */}
        <div className="px-2 pt-2 pb-2 bg-white sticky top-0 z-4">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = getStatusCount(tab.key);
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-1.5 px-3 rounded-lg flex flex-row items-center gap-1.5 whitespace-nowrap ${
                    isActive ? "bg-primary" : "bg-gray-100"
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold ${
                      isActive ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {tab.label}
                  </span>
                  <div
                    className={`px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-white/20" : "bg-[#374151]"
                    }`}
                  >
                    <span
                      className={`text-[9px] font-bold text-white`}
                    >
                      {count}
                    </span>
                  </div>
          </button>
              );
            })}
          </div>
        </div>

        {/* Update Ticket Status Button */}
        <div className="px-2 mt-2 mb-1">
          <button
            type="button"
            onClick={() => setUpdateModalOpen(true)}
            className="bg-primary py-2.5 px-3 rounded-lg flex flex-row items-center justify-center w-full"
          >
            <FiEdit size={14} className="text-white mr-1.5" />
            <span className="text-white text-xs font-semibold">Update Ticket Status by Ticket #</span>
          </button>
        </div>

        {/* Tickets List */}
        <div className="px-3 mt-2" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
          {loadingTickets ? (
            <div className="py-10 flex items-center justify-center flex-col">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-gray-700 text-sm mt-4">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-10 flex items-center justify-center flex-col">
              <div className="text-5xl text-[#6B7280] mb-3">🎫</div>
              <p className="text-[#6B7280] text-sm mt-4">
                {activeTab === "all"
                  ? "No tickets found"
                  : `No ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()} tickets`}
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const statusInfo = getStatusInfo(ticket.status);
              const StatusIcon = getStatusIcon(statusInfo.icon);
              const displayName =
                ticket.user?.fullName ?? ticket.username ?? "Unknown User";
              const displayEmail = ticket.user?.email ?? ticket.email ?? "No email";
              const displayPhone = ticket.phone || "No phone";

              return (
                <div
                  key={ticket.id || ticket._id}
                  className={`rounded-lg border p-2.5 mb-2 ${statusInfo.bgClass} ${statusInfo.borderClass}`}
                >
                  {/* Ticket Header */}
                  <div className="flex flex-row items-start justify-between mb-2">
                    <div className="flex flex-row items-center flex-1">
                      <StatusIcon size={16} className="mr-2" style={{ color: statusInfo.iconColor }} />
                      <span className="text-gray-900 text-xs font-bold flex-1 truncate">{displayName}</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full ${statusInfo.badgeClass}`}>
                      <span className="text-white text-[9px] font-bold uppercase">
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="flex flex-col gap-1">
                    {/* Access Key */}
                    {ticket.accessKey && (
                      <div className="flex flex-row items-center">
                        <FiHash size={12} className="text-[#9CA3AF] mr-2" />
                        <span className="text-gray-700 text-[9px] font-mono flex-1 truncate">
                          {ticket.accessKey}
                        </span>
                      </div>
                    )}

                    {/* Email */}
                    <div className="flex flex-row items-center">
                      <FiMail size={12} className="text-[#9CA3AF] mr-2" />
                      <span className="text-gray-700 text-[10px] flex-1 truncate">{displayEmail}</span>
                    </div>

                    {/* Phone */}
                    <div className="flex flex-row items-center">
                      <FiPhone size={12} className="text-[#9CA3AF] mr-2" />
                      <span className="text-gray-700 text-[10px]">{displayPhone}</span>
                    </div>

                    {/* Date */}
                    {ticket.createdAt && (
                      <div className="flex flex-row items-center">
                        <FiCalendar size={12} className="text-[#9CA3AF] mr-2" />
                        <span className="text-gray-600 text-[9px]">{formatDate(ticket.createdAt)}</span>
                      </div>
                    )}

                    {/* Username */}
                    {ticket.user?.username && (
                      <div className="flex flex-row items-center">
                        <FiUser size={12} className="text-[#9CA3AF] mr-2" />
                        <span className="text-gray-600 text-[9px]">@{ticket.user.username}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          {/* Header Image Section */}
          <div className="relative w-full h-[300px] rounded-2xl overflow-hidden mb-4">
            <button
              type="button"
              onClick={() => setImageViewerOpen(true)}
              className="absolute inset-0 w-full h-full"
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
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => router.back()}
              className="absolute top-5 left-5 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
            >
              <FiArrowLeft size={20} className="text-gray-900" />
            </button>

            {/* Edit Button (Top Right) */}
            <button
              type="button"
              onClick={() => router.push(`/edit-event/${eventId}`)}
              className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md"
            >
              <FiEdit size={20} className="text-white" />
            </button>
          </div>

          {/* Event Info Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-4 relative overflow-hidden">
            {/* Loading Line (Background Fetch) */}
            {backgroundFetching && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gray-200 overflow-hidden">
                <div className="h-full bg-primary animate-loading-progress" />
              </div>
            )}

            {/* Title, Status Badge & Edit Button Row */}
            <div className="flex flex-row justify-between items-start mb-6">
              <h1 className="text-gray-900 text-2xl font-bold flex-1 mr-3">{event.title}</h1>
              <div className="flex flex-row items-center gap-2">
                {/* Status Badge */}
                <div className="bg-gray-100 py-1.5 px-3 rounded-xl">
                  <span className="text-gray-700 text-xs font-semibold">
                {event.status === "approved"
                  ? "Approved"
                  : event.status === "pending"
                  ? "Pending"
                  : "Draft"}
              </span>
                </div>
                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => router.push(`/edit-event/${eventId}`)}
                  className="bg-primary py-2 px-3 rounded-xl flex flex-row items-center"
                >
                  <FiEdit size={16} className="text-white mr-1" />
                  <span className="text-white text-xs font-semibold">Edit</span>
                </button>
              </div>
            </div>

            {/* Collapsible Event Details Header */}
            <button
              type="button"
              onClick={() => setDetailsExpanded((prev) => !prev)}
              className="mb-3 flex w-full flex-row items-center justify-between"
            >
              <span className="text-gray-900 text-sm font-semibold">Event details</span>
              {detailsExpanded ? (
                <FiChevronUp size={18} className="text-[#6B7280]" />
              ) : (
                <FiChevronDown size={18} className="text-[#6B7280]" />
              )}
            </button>

            {detailsExpanded && (
              <>
                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Event Date & Time */}
                  <div className="flex flex-row items-start">
                    <FiCalendar size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-gray-900 text-sm font-semibold mb-1">Event Date & Time</div>
                      <div className="text-gray-700 text-sm mb-0.5">
                        {formatEventDate(event.date, event.time)}
                      </div>
                    </div>
            </div>

                  {/* Location (Optional) */}
                  {event.location && (
                    <div className="flex flex-row items-start">
                      <FiMapPin size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-gray-900 text-sm font-semibold mb-1">Location</div>
                        <div className="text-gray-700 text-sm mb-0.5">{event.location}</div>
                      </div>
                </div>
                  )}

                  {/* Gender (Optional) */}
                  {(event as any).gender && (
                    <div className="flex flex-row items-start">
                      <FiUser size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-gray-900 text-sm font-semibold mb-1">Gender</div>
                        <div className="text-gray-700 text-sm mb-0.5 capitalize">{(event as any).gender}</div>
                </div>
              </div>
                  )}

                  {/* Ticket Price */}
                  <div className="flex flex-row items-start">
                    <FiDollarSign size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-gray-900 text-sm font-semibold mb-1">Ticket Price</div>
                      <div className="text-gray-700 text-sm mb-0.5">{getTicketPrice()}</div>
                </div>
              </div>

                  {/* Total Tickets Sold */}
                  <div className="flex flex-row items-start">
                    <FiDollarSign size={20} className="text-[#6B7280] mr-3 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-gray-900 text-sm font-semibold mb-1">Total Tickets</div>
                      <div className="text-gray-700 text-sm mb-0.5">
                        {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} sold
                </div>
              </div>
            </div>
          </div>

                {/* Description (Optional) */}
                {event.description && (
                  <div className="mt-4">
                    <div className="text-gray-900 text-sm font-semibold mb-1">Description</div>
                    <div className="text-gray-700 text-sm leading-6">{event.description}</div>
                  </div>
                )}

              </>
            )}

            {/* Event Ticket Theme Button */}
            <button
              type="button"
              onClick={() => {
                if (eventId) {
                  router.push(`/event-ticket-theme/${eventId}`);
                }
              }}
              className="mt-4 flex w-full flex-row items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-row items-center gap-2">
                <MdPalette size={16} className="text-primary" />
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold text-gray-900">Event Ticket</span>
                  <span className="text-[10px] text-gray-600">Customize colors &amp; look</span>
                </div>
              </div>
              <FiChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Tabs Section */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const count = getStatusCount(tab.key);
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-2.5 px-4 rounded-xl flex flex-row items-center gap-2 whitespace-nowrap ${
                      isActive ? "bg-primary" : "bg-gray-100"
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        isActive ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {tab.label}
                    </span>
                    <div
                      className={`px-2 py-0.5 rounded-full ${
                        isActive ? "bg-white/20" : "bg-[#374151]"
                      }`}
                    >
                    <span
                        className={`text-[10px] font-bold ${
                          isActive ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Update Ticket Status Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setUpdateModalOpen(true)}
              className="bg-primary py-2.5 px-3 rounded-lg flex flex-row items-center justify-center w-full"
            >
              <FiEdit size={14} className="text-white mr-1.5" />
              <span className="text-white text-xs font-semibold">Update Ticket Status by Ticket #</span>
            </button>
          </div>

          {/* Tickets List */}
          <div className="space-y-3">
            {loadingTickets ? (
              <div className="py-10 flex items-center justify-center flex-col">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-gray-700 text-sm mt-4">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-10 flex items-center justify-center flex-col">
                <FiDollarSign size={48} className="text-[#6B7280]" />
                <p className="text-[#6B7280] text-sm mt-4">
                {activeTab === "all"
                    ? "No tickets found"
                    : `No ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()} tickets`}
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const statusInfo = getStatusInfo(ticket.status);
                const StatusIcon = getStatusIcon(statusInfo.icon);
                const displayName =
                  ticket.user?.fullName ?? ticket.username ?? "Unknown User";
                const displayEmail = ticket.user?.email ?? ticket.email ?? "No email";
                const displayPhone = ticket.phone || "No phone";

                return (
                  <div
                    key={ticket.id || ticket._id}
                    className={`rounded-xl border-2 p-4 ${statusInfo.bgClass} ${statusInfo.borderClass}`}
                  >
                    {/* Ticket Header */}
                    <div className="flex flex-row items-start justify-between mb-3">
                      <div className="flex flex-row items-center flex-1">
                        <StatusIcon size={20} className="mr-2" style={{ color: statusInfo.iconColor }} />
                        <span className="text-gray-900 text-sm font-bold flex-1">{displayName}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full ${statusInfo.badgeClass}`}>
                        <span className="text-white text-[10px] font-bold uppercase">
                          {statusInfo.label}
                        </span>
                      </div>
                      </div>

                    {/* Ticket Details */}
                    <div className="flex flex-col">
                      {/* Access Key */}
                      {ticket.accessKey && (
                        <div className="flex flex-row items-center mb-2">
                          <FiDollarSign size={14} className="text-[#9CA3AF] mr-2" />
                          <span className="text-gray-700 text-[10px] font-mono flex-1 truncate">
                            {ticket.accessKey}
                      </span>
                    </div>
                      )}

                      {/* Email */}
                      <div className="flex flex-row items-center mb-2">
                        <FiMail size={14} className="text-[#6B7280] mr-2" />
                        <span className="text-gray-700 text-xs flex-1 truncate">{displayEmail}</span>
                      </div>

                      {/* Phone */}
                      <div className="flex flex-row items-center mb-2">
                        <FiPhone size={14} className="text-[#6B7280] mr-2" />
                        <span className="text-gray-700 text-xs">{displayPhone}</span>
                      </div>

                      {/* Date */}
                    {ticket.createdAt && (
                        <div className="flex flex-row items-center mb-2">
                          <FiCalendar size={14} className="text-[#9CA3AF] mr-2" />
                          <span className="text-gray-600 text-[10px]">{formatDate(ticket.createdAt)}</span>
                        </div>
                      )}

                      {/* Username */}
                      {ticket.user?.username && (
                        <div className="flex flex-row items-center mt-2">
                          <FiUser size={14} className="text-[#9CA3AF] mr-2" />
                          <span className="text-gray-600 text-[10px]">@{ticket.user.username}</span>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Update Ticket Status Modal */}
      {updateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5"
          onClick={() => {
            if (!updatingStatus) {
              setUpdateModalOpen(false);
              setTicketNumber("");
              setSelectedStatus(null);
              setUpdateError(null);
            }
          }}
        >
          <div
            className="bg-[#1F1F1F] rounded-2xl p-6 w-full max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title */}
            <h2 className="text-white text-base font-bold mb-2 text-center">Update Ticket Status</h2>
            <p className="text-[#D1D5DB] text-xs mb-3">
              Enter ticket # to update status. Only "Submitted" tickets can be updated.
            </p>

            {/* Error Message */}
            {updateError && (
              <div className="bg-[#EF4444]/20 border border-[#EF4444]/50 rounded-lg p-2 mb-3 flex flex-row items-center">
                <FiAlertCircle size={16} className="text-[#EF4444] mr-2" />
                <span className="text-[#EF4444] text-xs flex-1">{updateError}</span>
              </div>
            )}

            {/* Ticket Number Input */}
            <div className="mb-3">
              <div className="flex flex-row items-center justify-between mb-1">
                <label className="text-white text-xs font-semibold">Ticket Number</label>
                <button
                  type="button"
                  onClick={handleScanQrClick}
                  className="bg-primary py-1 px-2 rounded flex flex-row items-center"
                >
                  <FiCamera size={12} className="text-white mr-1" />
                  <span className="text-white text-[10px] font-semibold">Scan QR</span>
                </button>
              </div>
              <input
                type="text"
                value={ticketNumber}
                onChange={(e) => {
                  setTicketNumber(e.target.value);
                  if (updateError) setUpdateError(null);
                }}
                placeholder="Enter ticket # (e.g., TK-1234567890-ABC123-4567)"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs placeholder:text-[#6B7280] outline-none"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            {/* Status Selection */}
            <div className="mb-3">
              <label className="text-white text-xs font-semibold mb-1 block">New Status</label>
              <div className="flex flex-row gap-2">
                {/* Used Button */}
                <button
                  type="button"
                  onClick={() => setSelectedStatus("used")}
                  className={`flex-1 py-2 px-3 rounded-lg border flex flex-row items-center justify-center ${
                    selectedStatus === "used"
                      ? "bg-[#10B981]/20 border-[#10B981]"
                      : "bg-[#0F0F0F] border-[#374151]"
                  }`}
                >
                  <div className="flex flex-row items-center">
                    <FiCheck
                      size={14}
                      className="mr-1"
                      style={{
                        color: selectedStatus === "used" ? "#10B981" : "#9CA3AF"
                      }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: selectedStatus === "used" ? "#10B981" : "#9CA3AF"
                      }}
                    >
                      Used
                    </span>
                  </div>
                </button>

                {/* Cancelled Button */}
                <button
                  type="button"
                  onClick={() => setSelectedStatus("cancelled")}
                  className={`flex-1 py-2 px-3 rounded-lg border flex flex-row items-center justify-center ${
                    selectedStatus === "cancelled"
                      ? "bg-[#EF4444]/20 border-[#EF4444]"
                      : "bg-[#0F0F0F] border-[#374151]"
                  }`}
                >
                  <div className="flex flex-row items-center">
                    <FiX
                      size={14}
                      className="mr-1"
                      style={{
                        color: selectedStatus === "cancelled" ? "#EF4444" : "#9CA3AF"
                      }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: selectedStatus === "cancelled" ? "#EF4444" : "#9CA3AF"
                      }}
                    >
                      Cancelled
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  if (updatingStatus) return;
                  setUpdateModalOpen(false);
                  setTicketNumber("");
                  setSelectedStatus(null);
                  setUpdateError(null);
                }}
                disabled={updatingStatus}
                className="flex-1 bg-[#374151] py-2 px-3 rounded-lg"
              >
                <span className="text-white text-xs text-center font-semibold">Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleUpdateTicketStatus}
                disabled={updatingStatus || !ticketNumber.trim() || !selectedStatus}
                className="flex-1 bg-primary py-2 px-3 rounded-lg flex flex-row items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updatingStatus ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <FiSave size={14} className="text-white mr-1" />
                    <span className="text-white text-xs text-center font-semibold">Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner */}
      <QRScanner
        visible={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScan={(data) => {
          setTicketNumber(data);
          setQrScannerOpen(false);
          if (updateError) setUpdateError(null);
          success("QR code scanned. Ticket number filled automatically.");
        }}
      />

      {/* Image Fullscreen Modal */}
      {imageViewerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setImageViewerOpen(false)}
        >
          <div
            className="relative flex items-center justify-center w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setImageViewerOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            >
              <span className="text-sm font-semibold">✕</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={eventImageUrl || FALLBACK_IMAGE}
              alt={event.title}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = FALLBACK_IMAGE;
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
