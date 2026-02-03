"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FiArrowLeft, FiEdit, FiX, FiImage } from "react-icons/fi";
import { ticketsAPI, type Ticket } from "../../../lib/api/tickets";
import { API_BASE_URL } from "../../../lib/config";
import { useToast } from "../../../lib/hooks/useToast";
import { useAppStore } from "../../../store/useAppStore";

type PaymentMethod = "bank_transfer" | "easypaisa" | "jazzcash" | "other";

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((state) => state.user);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError, warning, info } = useToast();

  const ticketId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const resolveQrCodeUrl = (raw?: string | null): string | null => {
    if (!raw) return null;

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
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

    const origin = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${origin}${raw}`;
  };

  const getQrCodeSrc = (t: Ticket): string | null => {
    const resolved = resolveQrCodeUrl(t.qrCodeUrl);
    if (resolved) return resolved;

    if (t.accessKey) {
      const data = encodeURIComponent(t.accessKey);
      return `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${data}`;
    }

    return null;
  };

  const getQrCodeUrl = (): string | null => {
    if (!ticket) return null;
    return getQrCodeSrc(ticket);
  };

  const getPaymentScreenshotUrl = (): string | null => {
    if (paymentScreenshotPreview) return paymentScreenshotPreview;
    
    const ticketAny = ticket as any;
    const screenshotUrl = 
      ticketAny?.paymentScreenshotUrl ||
      ticketAny?.payment?.screenshotUrl ||
      ticketAny?.payment?.screenshotUrlFull;
    
    if (!screenshotUrl) return null;
    
    if (screenshotUrl.startsWith("http://") || screenshotUrl.startsWith("https://")) {
      if (screenshotUrl.includes("localhost") || screenshotUrl.includes("127.0.0.1")) {
        try {
          const url = new URL(screenshotUrl);
          const path = url.pathname || "";
          const origin = API_BASE_URL.replace(/\/api\/?$/, "");
          return `${origin}${path}`;
        } catch {
          const uploadsIndex = screenshotUrl.indexOf("/uploads");
          if (uploadsIndex !== -1) {
            const path = screenshotUrl.substring(uploadsIndex);
            const origin = API_BASE_URL.replace(/\/api\/?$/, "");
            return `${origin}${path}`;
          }
        }
      }
      return screenshotUrl;
    }

    const origin = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${origin}${screenshotUrl}`;
  };

  const loadTicket = async () => {
      if (!ticketId) {
        setError("Ticket ID is required.");
        setLoading(false);
        return;
      }
      try {
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
      setRefreshing(false);
      }
    };

  useEffect(() => {
    setLoading(true);
    void loadTicket();
  }, [ticketId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTicket();
  };

  const handleScreenshotChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      showError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("Image size should be less than 5MB.");
      return;
    }

    setPaymentScreenshot(file);

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
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const screenshotUri = event.target?.result as string;
          
          const response = await ticketsAPI.submitPayment(
            String(ticketId),
            paymentMethod,
            screenshotUri
          );

          if (response.success) {
            success("Payment screenshot submitted successfully! Your payment is under review.");
            
            try {
              const ticketResponse = await ticketsAPI.getTicketById(String(ticketId));
              if (ticketResponse.success && ticketResponse.ticket) {
                setTicket(ticketResponse.ticket);
              }
            } catch {
              // ignore
            }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#10B981";
      case "pending_payment":
        return "#DC2626";
      case "payment_in_review":
        return "#3B82F6";
      case "used":
        return "#6B7280";
      case "cancelled":
        return "#DC2626";
      default:
        return "#9CA3AF";
    }
  };

  const getStatusBgColor = (status: string) => {
    const color = getStatusColor(status);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "CONFIRMED";
      case "pending_payment":
        return "PENDING PAYMENT";
      case "payment_in_review":
        return "IN REVIEW";
      case "used":
        return "USED";
      case "cancelled":
        return "CANCELLED";
      default:
        return status.toUpperCase().replace(/_/g, " ");
    }
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPhoneNumber = () => {
    const ticketAny = ticket as any;
    return (
      ticketAny?.event?.createdBy?.phone ||
      ticketAny?.event?.phone ||
      ticketAny?.organizer?.phone ||
      null
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-gray-600">Loading ticket…</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4">
        <p className="mb-4 text-base font-semibold text-[#EF4444]">
          {error ?? "Ticket not found."}
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

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4">
        <p className="mb-4 text-base font-semibold text-[#EF4444]">
          Please login to view your ticket.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
        >
          Login
        </button>
      </div>
    );
  }

  const screenshotUrl = getPaymentScreenshotUrl();
  const phoneNumber = getPhoneNumber();
  const event = ticket.event as any;
  const ticketPrice = event?.ticketPrice;
  const showPaymentSection = ticket.status === "payment_in_review" || ticket.status === "pending_payment";

  return (
    <div className="bg-white min-h-screen">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-10 flex flex-row items-center justify-between px-3 py-4 bg-white border-b border-gray-200" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top))' }}>
        <button
          type="button"
          onClick={() => router.back()}
            className="p-2"
        >
            <FiArrowLeft size={24} className="text-gray-900" />
        </button>
          <h1 className="text-gray-900 text-xl font-bold">Your Ticket</h1>
          <div className="w-[40px]" />
        </div>

        {/* ScrollView Content */}
        <div 
          className="overflow-y-auto"
          style={{ 
            paddingTop: 'calc(60px + env(safe-area-inset-top))',
            paddingBottom: 'calc(40px + env(safe-area-inset-bottom))'
          }}
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollTop === 0 && !refreshing && !loading) {
              // Could trigger refresh here if needed
            }
          }}
        >

          {/* Ticket Card */}
          <div className="mx-[20px] mb-3">
          <div className="bg-white rounded-xl relative border border-gray-200 shadow-lg">
            {/* Perforated Left Edge */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-white" style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 4px, #E5E7EB 4px, #E5E7EB 8px)'
            }} />

            {/* Card Content */}
            <div className="px-3 py-5" style={{ paddingLeft: 'calc(12px + 12px)' }}>
              {/* Logo, Title, Description */}
              <div className="flex flex-col items-center mb-3">
                <span className="text-lg font-bold text-primary tracking-wide mb-2">ticketly</span>
                <h2 className="text-[22px] font-bold text-gray-900 text-center uppercase tracking-wide mb-1">
                  {event?.title || "Event"}
                </h2>
                <p className="text-[13px] text-gray-600 text-center">
                  {event?.description
                    ? (event.description.length > 50
                        ? `${event.description.slice(0, 50)}...`
                        : event.description)
                    : "Join us for an unforgettable experience"}
                </p>
              </div>

              {/* Dashed Divider */}
              <div className="h-px border-t-2 border-primary border-dashed my-3.5 w-full" />

              {/* User Information */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] text-gray-800 mb-0.5">USER: {ticket.username}</p>
                <p className="text-[13px] text-gray-800 mb-0.5">EMAIL: {ticket.email}</p>
                {event?.location && (
                  <p className="text-sm text-gray-900 leading-[22px]">
                    LOCATION: {event.location}
                  </p>
                )}
            </div>

              {/* Status, Date/Time/Price, QR Code Row */}
              <div className="flex flex-row justify-between items-start mt-2 h-[90px]">
                {/* Left: Date, Time, Price */}
                <div className="h-full flex flex-col justify-center">
                  {event?.date && (
                    <p className="text-sm text-gray-900 leading-[22px]">
                      • Date: {formatDateShort(event.date)}
                    </p>
                  )}
                  {event?.time && (
                    <p className="text-sm text-gray-900 leading-[22px]">
                      • Time: {event.time}
                    </p>
                  )}
                  {ticketPrice !== undefined && (
                    <p className="text-sm text-gray-900 leading-[22px]">
                      • Price: {ticketPrice.toLocaleString()} PKR
                    </p>
                  )}
          </div>

                {/* Center: Status Stamp */}
                <div className="flex-1 relative">
                  <div
                    className="absolute -top-3 right-2 border-[1px] border-dashed py-2 px-3 rotate-[-8deg] whitespace-nowrap"
                    style={{
                      borderColor: getStatusColor(ticket.status),
                      backgroundColor: getStatusBgColor(ticket.status)
                    }}
                  >
            <span
                      className="text-xs font-bold tracking-wide whitespace-nowrap w-full max-h-[18px] block"
              style={{ color: getStatusColor(ticket.status) }}
            >
              {getStatusText(ticket.status)}
            </span>
                  </div>
          </div>

                {/* Right: QR Code */}
                {ticket.status === "confirmed" && ticket.accessKey ? (
                  <div className="ml-4">
                    <div className="bg-white p-2 rounded-lg border border-primary">
                      {getQrCodeSrc(ticket) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                          src={getQrCodeSrc(ticket) as string}
                          alt="QR Code"
                          className="w-[70px] h-[70px]"
                        />
                      ) : (
                        <div className="w-[70px] h-[70px] bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-[10px] text-gray-500 text-center max-w-[70px]">
                            QR code is given after payment confirmed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="ml-4 bg-gray-100 p-3 rounded-lg border border-gray-200 min-w-[70px] min-h-[70px] flex items-center justify-center">
                    <span className="text-[10px] text-gray-500 text-center max-w-[70px]">
                      QR code is given after payment confirmed
                    </span>
                </div>
              )}
            </div>

              {/* Dashed Divider */}
              <div className="h-px border-t-2 border-primary border-dashed my-3.5 w-full" />

              {/* Timestamp & Access Key */}
              {ticket.createdAt && (
                <p className="text-[11px] text-gray-500 mt-3.5 mb-1">
                  {formatTimestamp(ticket.createdAt)}
                </p>
              )}
              {ticket.status === "confirmed" && ticket.accessKey ? (
                <p className="text-[11px] text-primary font-semibold">
                  ACCESS KEY: {ticket.accessKey}
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 italic">
                  Access key is given after payment confirmed
                </p>
              )}
                </div>
                </div>
        </div>

          {/* Download Ticket Button */}
          {ticket.status === "confirmed" && getQrCodeUrl() && (
            <div className="mx-[20px] mb-6">
              <button
                type="button"
                onClick={() => {
                  const qrUrl = getQrCodeUrl();
                  if (qrUrl) {
                    window.open(qrUrl, '_blank');
                  }
                }}
                className="w-full py-2.5 rounded-lg bg-primary flex items-center justify-center"
              >
                <span className="text-white text-xs font-semibold">Download Ticket</span>
              </button>
              </div>
            )}

            {/* Payment Section */}
          {showPaymentSection && (
            <div className="mx-3 mt-4 mb-6 bg-white rounded-2xl p-5 border border-gray-200">
              {ticket.status === "payment_in_review" && (
              <div>
                  {/* Status Message */}
                  <div className="flex flex-col items-center mb-4">
                    <h3 className="text-gray-900 text-base font-semibold mb-2 text-center">In Review</h3>
                    <p className="text-gray-900 text-sm text-start mb-1">
                      Your payment screenshot has been submitted successfully.
                    </p>
                    <p className="text-gray-900 text-sm text-start mb-1">
                      Our team will verify your payment within 24-48 hours.
                    </p>
                    <p className="text-gray-900 text-sm text-start mb-1">
                      You can update the screenshot until verification is complete.
                    </p>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="mb-4">
                    <label className="text-gray-900 text-xs mb-2 block">Payment Method</label>
                  <div className="flex flex-row gap-2">
                    {[
                      { key: "bank_transfer", label: "Bank" },
                      { key: "easypaisa", label: "EasyPaisa" },
                      { key: "jazzcash", label: "JazzCash" },
                      { key: "other", label: "Other" }
                    ].map((method) => (
                      <button
                        key={method.key}
                        type="button"
                        onClick={() => setPaymentMethod(method.key as PaymentMethod)}
                        className={`px-3 py-2 rounded-lg border ${
                          paymentMethod === method.key
                            ? "bg-primary border-primary"
                            : "bg-gray-100 border-gray-200"
                        }`}
                      >
                        <span
                          className={`text-xs font-semibold ${
                            paymentMethod === method.key ? "text-white" : "text-[#9CA3AF]"
                          }`}
                        >
                          {method.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                  {/* Phone Number */}
                  {phoneNumber && (
                    <div className="mt-3 mb-1">
                      <p className="text-gray-900 text-xs">
                        Send payment to: {phoneNumber}
                      </p>
              </div>
            )}

                  {/* Screenshot Display/Update */}
                  <div className="mb-4">
                    <label className="text-gray-900 text-xs mb-2 block">Payment Screenshot</label>
                  {screenshotUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotUrl}
                        alt="Payment screenshot"
                        className="w-full h-[200px] rounded-xl object-cover"
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
                        className="absolute top-2 right-2 bg-[#EF4444] p-2 rounded-full"
                      >
                        <FiX size={20} className="text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-primary px-3 py-1.5 rounded-lg flex flex-row items-center"
                      >
                        <FiEdit size={16} className="text-white mr-1" />
                        <span className="text-white text-xs font-semibold">Update</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#374151] rounded-xl p-8 flex flex-col items-center justify-center bg-[#0F0F0F] w-full"
                    >
                      <FiImage size={48} className="text-[#9CA3AF] mb-2" />
                      <span className="text-[#9CA3AF] text-sm mt-2 text-center">
                        Tap to select payment screenshot
                      </span>
                      <span className="text-[#6B7280] text-xs mt-1 text-center">
                        JPEG, PNG, GIF, or WebP (Max 5MB)
                      </span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotChange}
                  />
                </div>

                {/* Update Button */}
                <button
                  type="button"
                  onClick={handleSubmitPayment}
                  disabled={isSubmittingProof || !paymentScreenshot}
                  className={`py-4 rounded-xl flex items-center justify-center w-full ${
                    isSubmittingProof || !paymentScreenshot
                      ? "bg-[#374151] opacity-50"
                      : "bg-primary"
                  }`}
                >
                  {isSubmittingProof ? (
                    <div className="flex flex-row items-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span className="text-white text-base font-semibold ml-2">Updating...</span>
                </div>
                  ) : (
                    <span className="text-white text-base font-semibold">Update Screenshot</span>
                  )}
                </button>
              </div>
            )}

            {ticket.status === "pending_payment" && (
            <div>
                {/* Status Message */}
                <h3 className="text-[#F59E0B] text-base font-semibold mb-2 text-center">
                  Payment Pending
                </h3>
                <p className="text-[#9CA3AF] text-sm text-center mb-4">
                  Please upload a screenshot of your payment to confirm your ticket.
                </p>

                {/* Payment Method Selection */}
                <div className="mb-4">
                  <label className="text-[#9CA3AF] text-xs mb-2 block">Payment Method</label>
                  <div className="flex flex-row gap-2">
                    {[
                      { key: "bank_transfer", label: "Bank" },
                      { key: "easypaisa", label: "EasyPaisa" },
                      { key: "jazzcash", label: "JazzCash" },
                      { key: "other", label: "Other" }
                    ].map((method) => (
                      <button
                        key={method.key}
                        type="button"
                        onClick={() => setPaymentMethod(method.key as PaymentMethod)}
                        className={`px-3 py-2 rounded-lg border ${
                          paymentMethod === method.key
                            ? "bg-primary border-primary"
                            : "bg-gray-100 border-gray-200"
                        }`}
                      >
                        <span
                          className={`text-xs font-semibold ${
                            paymentMethod === method.key ? "text-white" : "text-[#9CA3AF]"
                          }`}
                        >
                          {method.label}
                        </span>
                      </button>
                    ))}
            </div>
          </div>

                  {/* Phone Number */}
                  {phoneNumber && (
                    <div className="mt-3 mb-1">
                      <p className="text-gray-900 text-xs">
                        Send payment to: {phoneNumber}
                      </p>
              </div>
                  )}

                  {/* Screenshot Selection */}
                  <div className="mb-4">
                    <label className="text-gray-900 text-xs mb-2 block">Payment Screenshot</label>
                  {paymentScreenshotPreview ? (
                    <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                        src={paymentScreenshotPreview}
                        alt="Payment screenshot preview"
                        className="w-full h-[200px] rounded-xl object-cover"
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
                        className="absolute top-2 right-2 bg-[#EF4444] p-2 rounded-full"
                      >
                        <FiX size={20} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#374151] rounded-xl p-8 flex flex-col items-center justify-center bg-[#0F0F0F] w-full"
                    >
                      <FiImage size={48} className="text-gray-200 mb-2" />
                      <span className="text-gray-200 text-sm mt-2 text-center">
                        Tap to select payment screenshot
                      </span>
                      <div className="mt-2 w-full items-start px-4">
                        <p className="text-gray-300 text-xs">• JPEG, PNG, GIF, or WebP</p>
                        <p className="text-gray-300 text-xs">• Max 5MB</p>
                      </div>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotChange}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmitPayment}
                  disabled={isSubmittingProof || !paymentScreenshot}
                  className={`py-4 rounded-xl flex items-center justify-center w-full ${
                    isSubmittingProof || !paymentScreenshot
                      ? "bg-[#374151] opacity-50"
                      : "bg-primary"
                  }`}
                >
                  {isSubmittingProof ? (
                    <div className="flex flex-row items-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span className="text-white text-base font-semibold ml-2">Submitting...</span>
                    </div>
                  ) : (
                    <span className="text-white text-base font-semibold">Submit Payment</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

          {/* Ticket Footer */}
          <div className="mx-3 mb-6 p-5 rounded-2xl bg-gray-100 border border-gray-200">
            <p className="text-gray-700 text-xs text-center mb-1">
              This ticket is valid for one person only
            </p>
            <p className="text-gray-700 text-xs text-center mb-1">
              For support, contact: support@ticketly.com
            </p>
          </div>

          {/* Action Buttons */}
          {ticket.status === "confirmed" && (
            <div className="flex flex-row gap-3 px-3 mb-6">
              <button
                type="button"
                onClick={() => info("Ticket download feature coming soon!")}
                className="flex-1 bg-primary py-4 rounded-xl flex items-center justify-center"
              >
                <span className="text-white text-base font-semibold">Download Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => info("Ticket sharing feature coming soon!")}
                className="flex-1 bg-gray-100 border border-gray-200 py-4 rounded-xl flex items-center justify-center"
              >
                <span className="text-gray-900 text-base font-semibold">Share</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-2xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          {/* Header */}
          <div className="flex flex-row items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2"
            >
              <FiArrowLeft size={24} className="text-gray-900" />
            </button>
            <h1 className="text-gray-900 text-xl font-bold">Your Ticket</h1>
            <div className="w-[40px]" />
          </div>

          {/* Ticket Card */}
          <div className="mb-6">
            <div className="bg-white rounded-xl relative border border-gray-200 shadow-lg">
              {/* Perforated Left Edge */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-white" style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 4px, #E5E7EB 4px, #E5E7EB 8px)'
              }} />

              {/* Card Content */}
              <div className="px-3 py-5" style={{ paddingLeft: 'calc(12px + 12px)' }}>
                {/* Logo, Title, Description */}
                <div className="flex flex-col items-center mb-3">
                  <span className="text-lg font-bold text-primary tracking-wide mb-2">ticketly</span>
                  <h2 className="text-[22px] font-bold text-gray-900 text-center uppercase tracking-wide mb-1">
                    {event?.title || "Event"}
                  </h2>
                  <p className="text-[13px] text-gray-600 text-center">
                    {event?.description
                      ? (event.description.length > 50
                          ? `${event.description.slice(0, 50)}...`
                          : event.description)
                      : "Join us for an unforgettable experience"}
                  </p>
                </div>

                {/* Dashed Divider */}
                <div className="h-px border-t-2 border-primary border-dashed my-3.5 w-full" />

                {/* User Information */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-[13px] text-gray-800 mb-0.5">USER: {ticket.username}</p>
                  <p className="text-[13px] text-gray-800 mb-0.5">EMAIL: {ticket.email}</p>
                  {event?.location && (
                    <p className="text-sm text-gray-900 leading-[22px]">
                      LOCATION: {event.location}
                    </p>
                  )}
                </div>

                {/* Status, Date/Time/Price, QR Code Row */}
                <div className="flex flex-row justify-between items-start mt-2 h-[90px]">
                  {/* Left: Date, Time, Price */}
                  <div className="h-full flex flex-col justify-center">
                    {event?.date && (
                      <p className="text-sm text-gray-900 leading-[22px]">
                        • Date: {formatDateShort(event.date)}
                      </p>
                    )}
                    {event?.time && (
                      <p className="text-sm text-gray-900 leading-[22px]">
                        • Time: {event.time}
                      </p>
                    )}
                    {ticketPrice !== undefined && (
                      <p className="text-sm text-gray-900 leading-[22px]">
                        • Price: {ticketPrice.toLocaleString()} PKR
                      </p>
                    )}
                  </div>

                  {/* Center: Status Stamp */}
                  <div className="flex-1 relative">
                    <div
                      className="absolute -top-3 right-2 border-[1px] border-dashed py-2 px-3 rotate-[-8deg] whitespace-nowrap"
                      style={{
                        borderColor: getStatusColor(ticket.status),
                        backgroundColor: getStatusBgColor(ticket.status)
                      }}
                    >
                      <span
                        className="text-xs font-bold tracking-wide whitespace-nowrap w-full max-h-[18px] block"
                        style={{ color: getStatusColor(ticket.status) }}
                      >
                        {getStatusText(ticket.status)}
                      </span>
                    </div>
                  </div>

                  {/* Right: QR Code */}
                  {ticket.status === "confirmed" && ticket.accessKey ? (
                    <div className="ml-4">
                      <div className="bg-white p-2 rounded-lg border border-primary">
                        {getQrCodeSrc(ticket) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getQrCodeSrc(ticket) as string}
                            alt="QR Code"
                            className="w-[70px] h-[70px]"
                          />
                        ) : (
                          <div className="w-[70px] h-[70px] bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-[10px] text-gray-500 text-center max-w-[70px]">
                              QR code is given after payment confirmed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="ml-4 bg-gray-100 p-3 rounded-lg border border-gray-200 min-w-[70px] min-h-[70px] flex items-center justify-center">
                      <span className="text-[10px] text-gray-500 text-center max-w-[70px]">
                        QR code is given after payment confirmed
                      </span>
                    </div>
                  )}
                    </div>

                {/* Dashed Divider */}
                <div className="h-px border-t-2 border-primary border-dashed my-3.5 w-full" />

                {/* Timestamp & Access Key */}
                {ticket.createdAt && (
                  <p className="text-[11px] text-gray-500 mt-3.5 mb-1">
                    {formatTimestamp(ticket.createdAt)}
                  </p>
                )}
                {ticket.status === "confirmed" && ticket.accessKey ? (
                  <p className="text-[11px] text-primary font-semibold">
                    ACCESS KEY: {ticket.accessKey}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 italic">
                    Access key is given after payment confirmed
                  </p>
                )}
                    </div>
                  </div>
                </div>

          {/* Download Ticket Button */}
          {ticket.status === "confirmed" && getQrCodeUrl() && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  const qrUrl = getQrCodeUrl();
                  if (qrUrl) {
                    window.open(qrUrl, '_blank');
                  }
                }}
                className="w-full py-2.5 rounded-lg bg-primary flex items-center justify-center"
              >
                <span className="text-white text-xs font-semibold">Download Ticket</span>
              </button>
            </div>
          )}

          {/* Payment Section */}
          {showPaymentSection && (
            <div className="mb-6 bg-white rounded-2xl p-5 border border-gray-200">
              {ticket.status === "payment_in_review" && (
                <div>
                  <div className="flex flex-col items-center mb-4">
                    <h3 className="text-gray-900 text-base font-semibold mb-2 text-center">In Review</h3>
                    <p className="text-gray-900 text-sm text-start mb-1">
                      Your payment screenshot has been submitted successfully.
                    </p>
                    <p className="text-gray-900 text-sm text-start mb-1">
                      Our team will verify your payment within 24-48 hours.
                    </p>
                    <p className="text-gray-900 text-sm text-start mb-1">
                      You can update the screenshot until verification is complete.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="text-gray-900 text-xs mb-2 block">Payment Method</label>
                    <div className="flex flex-row gap-2">
                      {[
                        { key: "bank_transfer", label: "Bank" },
                        { key: "easypaisa", label: "EasyPaisa" },
                        { key: "jazzcash", label: "JazzCash" },
                        { key: "other", label: "Other" }
                      ].map((method) => (
                        <button
                          key={method.key}
                          type="button"
                          onClick={() => setPaymentMethod(method.key as PaymentMethod)}
                          className={`px-3 py-2 rounded-lg border ${
                            paymentMethod === method.key
                              ? "bg-primary border-primary"
                              : "bg-gray-100 border-gray-200"
                          }`}
                        >
                          <span
                            className={`text-xs font-semibold ${
                              paymentMethod === method.key ? "text-white" : "text-[#9CA3AF]"
                            }`}
                          >
                            {method.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {phoneNumber && (
                    <div className="mt-3 mb-1">
                      <p className="text-gray-900 text-xs">
                        Send payment to: {phoneNumber}
              </p>
            </div>
          )}

                  <div className="mb-4">
                    <label className="text-gray-900 text-xs mb-2 block">Payment Screenshot</label>
                    {screenshotUrl ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshotUrl}
                          alt="Payment screenshot"
                          className="w-full h-[200px] rounded-xl object-cover"
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
                          className="absolute top-2 right-2 bg-[#EF4444] p-2 rounded-full"
                        >
                          <FiX size={20} className="text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-2 right-2 bg-primary px-3 py-1.5 rounded-lg flex flex-row items-center"
                        >
                          <FiEdit size={16} className="text-white mr-1" />
                          <span className="text-white text-xs font-semibold">Update</span>
                        </button>
                </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#374151] rounded-xl p-8 flex flex-col items-center justify-center bg-[#0F0F0F] w-full"
                      >
                        <FiImage size={48} className="text-[#9CA3AF] mb-2" />
                        <span className="text-[#9CA3AF] text-sm mt-2 text-center">
                          Tap to select payment screenshot
                        </span>
                        <span className="text-[#6B7280] text-xs mt-1 text-center">
                          JPEG, PNG, GIF, or WebP (Max 5MB)
                        </span>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />
              </div>

                  <button
                    type="button"
                    onClick={handleSubmitPayment}
                    disabled={isSubmittingProof || !paymentScreenshot}
                    className={`py-4 rounded-xl flex items-center justify-center w-full ${
                      isSubmittingProof || !paymentScreenshot
                        ? "bg-[#374151] opacity-50"
                        : "bg-primary"
                    }`}
                  >
                    {isSubmittingProof ? (
                      <div className="flex flex-row items-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span className="text-white text-base font-semibold ml-2">Updating...</span>
                      </div>
                    ) : (
                      <span className="text-white text-base font-semibold">Update Screenshot</span>
                    )}
                  </button>
                </div>
              )}

              {ticket.status === "pending_payment" && (
                <div>
                  <h3 className="text-[#F59E0B] text-base font-semibold mb-2 text-center">
                    Payment Pending
                  </h3>
                  <p className="text-gray-900 text-sm text-center mb-4">
                    Please upload a screenshot of your payment to confirm your ticket.
                  </p>

                  <div className="mb-4">
                    <label className="text-gray-900 text-xs mb-2 block">Payment Method</label>
                    <div className="flex flex-row gap-2">
                      {[
                        { key: "bank_transfer", label: "Bank" },
                      { key: "easypaisa", label: "EasyPaisa" },
                      { key: "jazzcash", label: "JazzCash" },
                      { key: "other", label: "Other" }
                      ].map((method) => (
                      <button
                          key={method.key}
                        type="button"
                          onClick={() => setPaymentMethod(method.key as PaymentMethod)}
                          className={`px-3 py-2 rounded-lg border ${
                            paymentMethod === method.key
                              ? "bg-primary border-primary"
                              : "bg-gray-100 border-gray-200"
                          }`}
                        >
                          <span
                            className={`text-xs font-semibold ${
                              paymentMethod === method.key ? "text-white" : "text-[#9CA3AF]"
                            }`}
                          >
                            {method.label}
                          </span>
                      </button>
                    ))}
                  </div>
                  </div>

                  {phoneNumber && (
                    <div className="mt-3 mb-1">
                      <p className="text-gray-900 text-xs">
                        Send payment to: {phoneNumber}
                  </p>
                </div>
                  )}

                  <div className="mb-4">
                    <label className="text-gray-900 text-xs mb-2 block">Payment Screenshot</label>
                    {paymentScreenshotPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={paymentScreenshotPreview}
                          alt="Payment screenshot preview"
                          className="w-full h-[200px] rounded-xl object-cover"
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
                          className="absolute top-2 right-2 bg-[#EF4444] p-2 rounded-full"
                        >
                          <FiX size={20} className="text-white" />
                        </button>
                  </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#374151] rounded-xl p-8 flex flex-col items-center justify-center bg-[#0F0F0F] w-full"
                      >
                        <FiImage size={48} className="text-gray-200 mb-2" />
                        <span className="text-gray-200 text-sm mt-2 text-center">
                      Tap to select payment screenshot
                        </span>
                        <div className="mt-2 w-full items-start px-4">
                          <p className="text-gray-300 text-xs">• JPEG, PNG, GIF, or WebP</p>
                          <p className="text-gray-300 text-xs">• Max 5MB</p>
                    </div>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />
                </div>

                <button
                  type="button"
                    onClick={handleSubmitPayment}
                    disabled={isSubmittingProof || !paymentScreenshot}
                    className={`py-4 rounded-xl flex items-center justify-center w-full ${
                      isSubmittingProof || !paymentScreenshot
                        ? "bg-[#374151] opacity-50"
                        : "bg-primary"
                    }`}
                  >
                    {isSubmittingProof ? (
                      <div className="flex flex-row items-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span className="text-white text-base font-semibold ml-2">Submitting...</span>
                      </div>
                    ) : (
                      <span className="text-white text-base font-semibold">Submit Payment</span>
                    )}
                </button>
              </div>
              )}
            </div>
          )}

          {/* Ticket Footer */}
          <div className="mb-6 p-5 rounded-2xl bg-gray-100 border border-gray-200">
            <p className="text-gray-700 text-xs text-center mb-1">
              This ticket is valid for one person only
            </p>
            <p className="text-gray-700 text-xs text-center mb-1">
              For support, contact: support@ticketly.com
            </p>
        </div>

          {/* Action Buttons */}
        {ticket.status === "confirmed" && (
            <div className="flex flex-row gap-3">
            <button
              type="button"
                onClick={() => info("Ticket download feature coming soon!")}
                className="flex-1 bg-primary py-4 rounded-xl flex items-center justify-center"
              >
                <span className="text-white text-base font-semibold">Download Ticket</span>
            </button>
            <button
              type="button"
                onClick={() => info("Ticket sharing feature coming soon!")}
                className="flex-1 bg-gray-100 border border-gray-200 py-4 rounded-xl flex items-center justify-center"
              >
                <span className="text-gray-900 text-base font-semibold">Share</span>
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
