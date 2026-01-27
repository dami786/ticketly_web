"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";
import { ticketsAPI, type Ticket } from "../../../lib/api/tickets";
import { useAppStore } from "../../../store/useAppStore";

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((state) => state.user);

  type PaymentMethod = "bank" | "easypaisa" | "jazzcash" | "other";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [paymentScreenshotName, setPaymentScreenshotName] = useState<string>("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const ticketId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    const load = async () => {
      if (!ticketId) {
        setError("Ticket ID is required.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await ticketsAPI.getTicketById(String(ticketId));
        if (response.success && response.ticket) {
          setTicket(response.ticket);
        } else {
          setError("Ticket not found.");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to load ticket."
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [ticketId]);

  const handleScreenshotChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPaymentScreenshotName(file ? file.name : "");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto" />
          <p className="text-sm text-mutedLight">Loading ticket…</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4">
        <p className="mb-4 text-base font-semibold text-danger">
          {error ?? "Ticket not found."}
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

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4">
        <p className="mb-4 text-base font-semibold text-danger">
          Please login to view your ticket.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          Login
        </button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#10B981";
      case "pending_payment":
        return "#F59E0B";
      case "used":
        return "#6B7280";
      case "cancelled":
        return "#EF4444";
      default:
        return "#9CA3AF";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "pending_payment":
        return "Pending payment";
      case "used":
        return "Used";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-xl px-4 pb-20 pt-8 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 text-sm text-mutedLight hover:text-white"
        >
          ← Back
        </button>

        <div className="overflow-hidden rounded-2xl bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-[#374151] px-5 py-4">
            <div className="text-xl font-bold text-white">ticketly</div>
            <div className="text-right text-xs text-mutedLight">
              <div>Ticket #</div>
              <div className="font-mono text-white">
                {ticket.id.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="px-5 pt-4">
            <span
              className="inline-flex rounded-lg bg-[#111827] px-3 py-1.5 text-xs font-semibold"
              style={{ color: getStatusColor(ticket.status) }}
            >
              {getStatusText(ticket.status)}
            </span>
          </div>

          {ticket.event?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ticket.event.image}
              alt={ticket.event.title}
              className="mt-3 h-52 w-full object-cover"
            />
          )}

          <div className="space-y-4 px-5 pb-5 pt-4 text-sm text-[#D1D5DB]">
            <div>
              <h1 className="mb-1 text-2xl font-bold text-white">
                {ticket.event?.title ?? "Event"}
              </h1>
              {ticket.organizer && (
                <div className="text-sm font-semibold text-accent">
                  by {ticket.organizer.fullName}
                </div>
              )}
            </div>

            {ticket.event?.date && (
              <div>
                <div className="text-xs font-semibold text-muted">
                  Date
                </div>
                <div className="text-white">
                  {formatDate(ticket.event.date)}{" "}
                  {ticket.event.time && `at ${ticket.event.time}`}
                </div>
              </div>
            )}

            {ticket.event?.location && (
              <div>
                <div className="text-xs font-semibold text-muted">
                  Venue
                </div>
                <div className="text-white">{ticket.event.location}</div>
              </div>
            )}

            {typeof ticket.event?.ticketPrice === "number" && (
              <div>
                <div className="text-xs font-semibold text-muted">
                  Ticket price
                </div>
                <div className="text-white">
                  PKR {ticket.event.ticketPrice.toLocaleString()}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-muted">
                Attendee
              </div>
              <div className="text-white">{ticket.username}</div>
              <div className="text-white">{ticket.email}</div>
              {ticket.phone && <div className="text-white">{ticket.phone}</div>}
            </div>
          </div>

          {ticket.status === "confirmed" && (
            <div className="border-t border-[#374151] px-5 py-5 text-center">
              <div className="mb-3 text-base font-semibold text-white">
                Scan at entry
              </div>
              {ticket.qrCodeUrl ? (
                <div className="mx-auto mb-3 inline-block rounded-xl bg-white p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ticket.qrCodeUrl}
                    alt="QR code"
                    className="h-48 w-48"
                  />
                </div>
              ) : ticket.accessKey ? (
                <div className="mx-auto mb-3 inline-block rounded-xl bg-white p-5">
                  <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-lg bg-[#F3F4F6] px-2 text-center">
                    <div className="text-sm font-bold text-[#6B7280]">
                      Access key
                    </div>
                    <div className="break-all text-[10px] font-mono text-[#4B5563]">
                      {ticket.accessKey}
                    </div>
                  </div>
                </div>
              ) : null}
              <p className="text-xs text-muted">
                Please arrive 15 minutes before the event starts.
              </p>
            </div>
          )}

          {ticket.status === "pending_payment" && (
            <div className="border-t border-[#374151] bg-black/40 px-5 py-5">
              <div className="mb-3 text-center">
                <div className="text-base font-semibold text-[#FBBF24]">
                  Payment Pending
                </div>
                <p className="mt-1 text-sm text-[#E5E7EB]">
                  Please upload a screenshot of your payment to confirm your
                  ticket.
                </p>
              </div>

              <div className="space-y-4 text-left text-sm text-[#D1D5DB]">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Payment method
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:gap-3">
                    {[
                      { key: "bank", label: "Bank" },
                      { key: "easypaisa", label: "EasyPaisa" },
                      { key: "jazzcash", label: "JazzCash" },
                      { key: "other", label: "Other" }
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() =>
                          setPaymentMethod(option.key as PaymentMethod)
                        }
                        className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                          paymentMethod === option.key
                            ? "bg-accent text-black"
                            : "bg-[#111827] text-mutedLight hover:bg-[#1F2937]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Send payment to:{" "}
                    <span className="font-mono text-[#F9FAFB]">
                      52863147982
                    </span>
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Payment screenshot
                  </div>
                  <label className="block cursor-pointer rounded-2xl border border-dashed border-[#4B5563] bg-[#020617] px-4 py-6 text-center text-xs text-muted hover:border-accent/80 hover:bg-[#020617]/80">
                    <div className="mb-2 text-3xl">🖼️</div>
                    <div className="font-semibold text-[#E5E7EB]">
                      Tap to select payment screenshot
                    </div>
                    <div className="mt-1 text-[11px] text-muted">
                      JPEG, PNG, GIF, or WebP (Max 5MB)
                    </div>
                    {paymentScreenshotName && (
                      <div className="mt-2 truncate text-[11px] text-[#9CA3AF]">
                        Selected: {paymentScreenshotName}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={isSubmittingProof || !paymentScreenshotName}
                  onClick={() => {
                    setIsSubmittingProof(true);
                    // TODO: Wire up to backend endpoint when available
                    // For now just show a friendly message.
                    alert(
                      "Your payment screenshot will be submitted once this feature is connected to the server."
                    );
                    setTimeout(() => setIsSubmittingProof(false), 400);
                  }}
                  className={`mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    isSubmittingProof || !paymentScreenshotName
                      ? "bg-[#1F2937] text-[#6B7280]"
                      : "bg-accent text-white hover:bg-accent/90"
                  }`}
                >
                  Submit payment
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-[#374151] bg-[#050505] px-5 py-4 text-center text-[11px] text-muted">
            <p>This ticket is valid for one person only.</p>
            <p>For support, contact: support@ticketly.com</p>
          </div>
        </div>

        {ticket.status === "confirmed" && (
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() =>
                alert("Ticket download feature will be available soon.")
              }
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
            >
              Download ticket
            </button>
            <button
              type="button"
              onClick={() =>
                alert("Ticket sharing feature will be available soon.")
              }
              className="flex-1 rounded-xl border border-border bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white hover:border-accent"
            >
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


