"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ticketsAPI, type Ticket } from "../../../lib/api/tickets";
import { API_BASE_URL } from "../../../lib/config";
import { useToast } from "../../../lib/hooks/useToast";
import { useAppStore } from "../../../store/useAppStore";

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);

  type PaymentMethod = "bank" | "easypaisa" | "jazzcash" | "other";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError, warning, info } = useToast();

  const ticketId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const resolveQrCodeUrl = (raw?: string | null): string | null => {
    if (!raw) return null;

    // Full URL
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      // Rewrite localhost/127 to deployed API origin
      if (raw.includes("localhost") || raw.includes("127.0.0.1")) {
        try {
          const url = new URL(raw);
          const path = url.pathname || "";
          const origin = API_BASE_URL.replace(/\/api\/?$/, "");
          return `${origin}${path}`;
        } catch {
          const uploadsIndex = raw.indexOf("/uploads");
          if (uploadsIndex !== -1) {
            const path = raw.substring(uploadsIndex);
            const origin = API_BASE_URL.replace(/\/api\/?$/, "");
            return `${origin}${path}`;
          }
        }
      }
      return raw;
    }

    // Relative path from backend
    const origin = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${origin}${raw}`;
  };

  const getQrCodeSrc = (t: Ticket): string | null => {
    // 1) Try backend-provided qrCodeUrl (resolved to deployed origin)
    const resolved = resolveQrCodeUrl(t.qrCodeUrl);
    if (resolved) return resolved;

    // 2) Fallback: generate QR via external API using accessKey
    if (t.accessKey) {
      const data = encodeURIComponent(t.accessKey);
      // Using a public QR image API as a lightweight fallback
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}`;
    }

    return null;
  };

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
    if (!file) {
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview(null);
      return;
    }

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

    setPaymentScreenshot(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPaymentScreenshotPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    if (!ticket || !ticketId) {
      showError("Ticket information is missing.");
      return;
    }

    if (!paymentScreenshot) {
      warning("Please select a payment screenshot.");
      return;
    }

    setIsSubmittingProof(true);

    try {
      // Convert payment method to API format
      const methodMap: Record<PaymentMethod, string> = {
        bank: "bank_transfer",
        easypaisa: "easypaisa",
        jazzcash: "jazzcash",
        other: "manual"
      };
      const apiMethod = methodMap[paymentMethod];

      // Convert file to data URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const screenshotUri = event.target?.result as string;
          
          const response = await ticketsAPI.submitPayment(
            String(ticketId),
            apiMethod,
            screenshotUri
          );

          if (response.success) {
            success("Payment screenshot submitted successfully! Your payment is under review.");
            
            // Refresh ticket data
            try {
              const ticketResponse = await ticketsAPI.getTicketById(String(ticketId));
              if (ticketResponse.success && ticketResponse.ticket) {
                setTicket(ticketResponse.ticket);
              }
            } catch {
              // ignore
            }

            // Reset form
            setPaymentScreenshot(null);
            setPaymentScreenshotPreview(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          } else {
            showError(response.message || "Failed to submit payment screenshot.");
          }
        } catch (error: any) {
          console.error("Payment submission error:", error);
          const errorMessage = 
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "Failed to submit payment. Please try again.";
          showError(errorMessage);
        } finally {
          setIsSubmittingProof(false);
        }
      };

      reader.onerror = () => {
        showError("Failed to read screenshot file.");
        setIsSubmittingProof(false);
      };

      reader.readAsDataURL(paymentScreenshot);
    } catch (error: any) {
      console.error("Payment submission error:", error);
      showError("Failed to submit payment. Please try again.");
      setIsSubmittingProof(false);
    }
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
      case "payment_in_review":
        return "#3B82F6";
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
      case "payment_in_review":
        return "Payment in review";
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
      <div className="mx-auto max-w-xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 text-sm text-mutedLight hover:text-white"
        >
          ← Back
        </button>

        <div className="overflow-hidden rounded-2xl bg-surface shadow-xl">
          <div className="flex items-center border-b border-[#374151] px-5 py-4">
            <div className="text-xl font-bold text-white">ticketly</div>
          </div>

          <div className="px-5 pt-4 flex items-center justify-between gap-3">
            <span
              className="inline-flex rounded-lg bg-[#111827] px-3 py-1.5 text-xs font-semibold"
              style={{ color: getStatusColor(ticket.status) }}
            >
              {getStatusText(ticket.status)}
            </span>
            {ticket.accessKey && (
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase text-muted">
                  Ticket number
                </div>
                <div className="font-mono text-xs text-white">
                  {ticket.accessKey}
                </div>
              </div>
            )}
          </div>

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

          {ticket.accessKey &&
            ticket.status !== "confirmed" &&
            ticket.status !== "cancelled" && (
              <div className="border-t border-[#374151] px-5 py-8 flex flex-col items-center">
                <div className="mb-3 text-center">
                  <div className="text-base font-semibold text-white">
                    Your ticket QR code
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    This code will be used to verify your entry at the event.
                  </p>
                </div>

                {getQrCodeSrc(ticket) ? (
                  <div className="mb-3 inline-block rounded-xl bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getQrCodeSrc(ticket) as string}
                      alt="Ticket QR code"
                      className="h-44 w-44 object-contain"
                    />
                  </div>
                ) : (
                  <div className="mb-3 inline-block rounded-xl bg-white p-4">
                    <div className="flex h-44 w-44 flex-col items-center justify-center gap-2 rounded-lg bg-[#F3F4F6] px-2 text-center">
                      <div className="text-xs font-bold text-[#6B7280]">
                        Ticket number
                      </div>
                      <div className="break-all text-[10px] font-mono text-[#4B5563]">
                        {ticket.accessKey}
                      </div>
                    </div>
                  </div>
                )}

                {ticket.status === "pending_payment" && (
                  <div className="mt-1 rounded-lg bg-[#F59E0B]/15 px-4 py-2">
                    <p className="text-center text-[11px] font-semibold text-[#FBBF24]">
                      Complete payment to activate this ticket.
                    </p>
                  </div>
                )}
              </div>
            )}

          {ticket.status === "confirmed" && (
            <div className="border-t border-[#374151] px-5 py-5 text-center">
              <div className="mb-3 text-base font-semibold text-white">
                Scan at entry
              </div>
              {getQrCodeSrc(ticket) ? (
                <div className="mx-auto mb-3 inline-block rounded-xl bg-white p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getQrCodeSrc(ticket) as string}
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
                  {(() => {
                    const phoneNumber =
                      (ticket.event as any)?.createdBy?.phone ||
                      (ticket.event as any)?.phone ||
                      (ticket.organizer as any)?.phone;
                    if (!phoneNumber) return null;
                    return (
                      <p className="mt-2 text-xs text-muted">
                        Send payment to:{" "}
                        <span className="font-mono text-[#F9FAFB]">
                          {phoneNumber}
                        </span>
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Payment screenshot
                  </div>
                  {paymentScreenshotPreview ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl border border-[#4B5563] bg-[#020617] p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={paymentScreenshotPreview}
                          alt="Payment screenshot preview"
                          className="mx-auto max-h-64 rounded-lg object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentScreenshot(null);
                            setPaymentScreenshotPreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                          aria-label="Remove screenshot"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-xs text-muted">
                        Selected: {paymentScreenshot?.name}
                      </div>
                    </div>
                  ) : (
                    <label className="block cursor-pointer rounded-2xl border border-dashed border-[#4B5563] bg-[#020617] px-4 py-6 text-center text-xs text-muted hover:border-accent/80 hover:bg-[#020617]/80 transition-colors">
                      <div className="mb-2 text-3xl">🖼️</div>
                      <div className="font-semibold text-[#E5E7EB]">
                        Tap to select payment screenshot
                      </div>
                      <div className="mt-1 text-[11px] text-muted">
                        JPEG, PNG, GIF, or WebP (Max 5MB)
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotChange}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSubmittingProof || !paymentScreenshot}
                  onClick={handleSubmitPayment}
                  className={`mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isSubmittingProof || !paymentScreenshot
                      ? "bg-[#1F2937] text-[#6B7280] cursor-not-allowed"
                      : "bg-accent text-white hover:bg-accent/90"
                  }`}
                >
                  {isSubmittingProof ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit payment"
                  )}
                </button>
              </div>
            </div>
          )}

          {ticket.status === "payment_in_review" && (
            <div className="border-t border-[#374151] bg-black/40 px-5 py-5">
              <div className="mb-3 text-center">
                <div className="text-base font-semibold text-[#3B82F6]">
                  Payment in review
                </div>
                <p className="mt-1 text-sm text-[#E5E7EB]">
                  Your payment screenshot has been submitted. Our team is
                  reviewing it. You will receive a confirmation soon.
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
                  {(() => {
                    const phoneNumber =
                      (ticket.event as any)?.createdBy?.phone ||
                      (ticket.event as any)?.phone ||
                      (ticket.organizer as any)?.phone;
                    if (!phoneNumber) {
                      return (
                        <p className="mt-2 text-xs text-muted">
                          If you paid with the wrong method, you can update your
                          screenshot below.
                        </p>
                      );
                    }
                    return (
                      <p className="mt-2 text-xs text-muted">
                        Send payment to:{" "}
                        <span className="font-mono text-[#F9FAFB]">
                          {phoneNumber}
                        </span>
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Current screenshot
                  </div>
                  {((ticket as any).paymentScreenshotUrl ||
                    (ticket as any).payment?.screenshotUrl ||
                    (ticket as any).payment?.screenshotUrlFull) && (
                    <div className="mb-3 rounded-2xl border border-[#4B5563] bg-[#020617] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          (ticket as any).paymentScreenshotUrl ||
                          (ticket as any).payment?.screenshotUrlFull ||
                          (ticket as any).payment?.screenshotUrl
                        }
                        alt="Current payment screenshot"
                        className="mx-auto max-h-64 rounded-lg object-contain"
                      />
                      <p className="mt-2 text-[11px] text-muted">
                        This is the screenshot currently attached to your
                        payment. You can upload a new one below if needed.
                      </p>
                    </div>
                  )}

                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Upload new screenshot (optional)
                  </div>
                  {paymentScreenshotPreview ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl border border-[#4B5563] bg-[#020617] p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={paymentScreenshotPreview}
                          alt="Payment screenshot preview"
                          className="mx-auto max-h-64 rounded-lg object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentScreenshot(null);
                            setPaymentScreenshotPreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                          aria-label="Remove screenshot"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-xs text-muted">
                        Selected: {paymentScreenshot?.name}
                      </div>
                    </div>
                  ) : (
                    <label className="block cursor-pointer rounded-2xl border border-dashed border-[#4B5563] bg-[#020617] px-4 py-6 text-center text-xs text-muted hover:border-accent/80 hover:bg-[#020617]/80 transition-colors">
                      <div className="mb-2 text-3xl">🖼️</div>
                      <div className="font-semibold text-[#E5E7EB]">
                        Tap to select a new payment screenshot
                      </div>
                      <div className="mt-1 text-[11px] text-muted">
                        JPEG, PNG, GIF, or WebP (Max 5MB)
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotChange}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSubmittingProof || !paymentScreenshot}
                  onClick={handleSubmitPayment}
                  className={`mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isSubmittingProof || !paymentScreenshot
                      ? "bg-[#1F2937] text-[#6B7280] cursor-not-allowed"
                      : "bg-accent text-white hover:bg-accent/90"
                  }`}
                >
                  {isSubmittingProof ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Updating...
                    </span>
                  ) : (
                    "Update payment screenshot"
                  )}
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
                info("Ticket download feature will be available soon.")
              }
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
            >
              Download ticket
            </button>
            <button
              type="button"
              onClick={() =>
                info("Ticket sharing feature will be available soon.")
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


