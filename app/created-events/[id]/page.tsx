"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiCamera } from "react-icons/fi";
import { eventsAPI, type Event } from "../../../lib/api/events";
import { ticketsAPI } from "../../../lib/api/tickets";
import { useToast } from "../../../lib/hooks/useToast";

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
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"used" | "cancelled" | null>(
    null
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const { success, error: showError } = useToast();
  const qrFileInputRef = useRef<HTMLInputElement>(null);

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
        // Close modal + reset form
        setUpdateModalOpen(false);
        setTicketNumber("");
        setSelectedStatus(null);
        setUpdateError(null);

        // Refresh tickets to reflect changes
        await loadTickets();

        success(response.message || "Ticket status updated successfully.");
      } else {
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
    qrFileInputRef.current?.click();
  };

  const handleScanQrFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Check browser support
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AnyWindow: any = window as any;
      if (!("BarcodeDetector" in AnyWindow)) {
        showError("QR scanning is not supported in this browser. Please enter ticket number manually.");
        return;
      }

      const detector = new AnyWindow.BarcodeDetector({
        formats: ["qr_code"]
      });

      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);

      if (codes && codes.length > 0 && codes[0].rawValue) {
        setTicketNumber(String(codes[0].rawValue));
        success("QR code scanned. Ticket number filled automatically.");
      } else {
        showError("Could not read QR code. Please try again or enter ticket number manually.");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("QR scan error:", err);
      showError("Failed to scan QR code. Please enter ticket number manually.");
    } finally {
      // Reset input so same file can be selected again
      if (qrFileInputRef.current) {
        qrFileInputRef.current.value = "";
      }
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
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
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
            {event.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.image}
                alt={event.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Hide image on error, show background
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-sm text-mutedLight">No image</span>
              </div>
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

        {/* Update Ticket Status by Ticket # */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setUpdateModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90"
          >
            <span>Update ticket status by Ticket #</span>
          </button>
        </div>

        {updateModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
              <h2 className="mb-2 text-lg font-bold text-white">
                Update Ticket Status
              </h2>
              <p className="mb-4 text-sm text-mutedLight">
                Enter the ticket number (Ticket # / access key) and choose a new
                status. Typically used to mark tickets as{" "}
                <span className="font-semibold text-white">used</span> or{" "}
                <span className="font-semibold text-white">cancelled</span> at
                the venue.
              </p>

              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <label className="font-semibold text-white">
                    Ticket number
                  </label>
                  <button
                    type="button"
                    onClick={handleScanQrClick}
                    className="inline-flex items-center gap-1 rounded-full border border-accent/60 bg-[#111827] px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent hover:text-white hover:border-accent transition-colors"
                  >
                    <FiCamera className="h-3 w-3" />
                    <span>Scan QR</span>
                  </button>
                </div>
                <input
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="Enter ticket number / access key"
                  className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <input
                  ref={qrFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleScanQrFileChange}
                />
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-white">
                  New status
                </label>
                <div className="flex gap-2 text-xs">
                  {["used", "cancelled"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setSelectedStatus(status as "used" | "cancelled")
                      }
                      className={`flex-1 rounded-xl px-3 py-2 font-semibold transition ${
                        selectedStatus === status
                          ? "bg-accent text-white"
                          : "bg-[#111827] text-mutedLight hover:bg-[#1F2937]"
                      }`}
                    >
                      {status === "used" ? "Used" : "Cancelled"}
                    </button>
                  ))}
                </div>
              </div>

              {updateError && (
                <p className="mb-3 text-xs font-semibold text-danger">
                  {updateError}
                </p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (updatingStatus) return;
                    setUpdateModalOpen(false);
                    setTicketNumber("");
                    setSelectedStatus(null);
                    setUpdateError(null);
                  }}
                  className="flex-1 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1F2937]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={handleUpdateTicketStatus}
                  className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
                >
                  {updatingStatus ? "Updating…" : "Update status"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


