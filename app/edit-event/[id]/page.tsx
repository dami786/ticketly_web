"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { 
  FiArrowLeft, 
  FiCalendar, 
  FiCheck, 
  FiChevronDown, 
  FiClock, 
  FiImage, 
  FiMapPin, 
  FiUser, 
  FiX,
  FiDollarSign
} from "react-icons/fi";
import { authAPI } from "../../../lib/api/auth";
import { eventsAPI, type Event } from "../../../lib/api/events";
import { useToast } from "../../../lib/hooks/useToast";
import { useAppStore } from "../../../store/useAppStore";
import { getEventImageUrl, FALLBACK_IMAGE } from "../../../lib/utils/images";
import { EventDetailsSkeleton } from "../../../components/EventDetailsSkeleton";

interface EventFormData {
  eventName: string;
  eventDate: string;
  eventTime: string;
  address: string;
  genderSelection: string;
  description: string;
  imageUrl: string;
  imageUri: string | null;
  imagePath: string | null;
  eventType: 'free' | 'paid';
  ticketPrice: string;
  currency: string;
  totalTickets: string;
}

const GENDER_OPTIONS = ['All', 'Male', 'Female'];
const CURRENCIES = [
  { code: 'PKR', label: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'USD', label: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro', flag: '🇪🇺' },
];

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const { success, error: showError, warning } = useToast();

  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventFormData>({
    eventName: "",
    eventDate: "",
    eventTime: "18:00",
    address: "",
    genderSelection: "All",
    description: "",
    imageUrl: "",
    imageUri: null,
    imagePath: null,
    eventType: "free",
    ticketPrice: "",
    currency: "PKR",
    totalTickets: "100",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load event data
  useEffect(() => {
    if (!eventId) {
      setErrorMessage("Event ID is missing");
      setShowErrorModal(true);
      setLoading(false);
      return;
    }
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      const response = await eventsAPI.getEventById(String(eventId));
      
      if (response.success && response.event) {
        const e = response.event;
        setEvent(e);
        
        // Pre-fill form with event data
        const eventDate = e.date ? new Date(e.date).toISOString().split('T')[0] : "";
        const gender = (e as any).gender || "all";
        const genderCapitalized = gender.charAt(0).toUpperCase() + gender.slice(1);
        
        const isPaid = e.ticketPrice && e.ticketPrice > 0;
        const imageUrl = getEventImageUrl(e) || "";
        
        setForm({
          eventName: e.title || "",
          eventDate: eventDate,
          eventTime: e.time || "18:00",
          address: e.location || "",
          genderSelection: GENDER_OPTIONS.includes(genderCapitalized) ? genderCapitalized : "All",
          description: e.description || "",
          imageUrl: imageUrl,
          imageUri: imageUrl || null,
          imagePath: e.image ?? e.imageUrl ?? null,
          eventType: isPaid ? "paid" : "free",
          ticketPrice: isPaid ? String(e.ticketPrice || 0) : "",
          currency: "PKR", // Default, can be extended
          totalTickets: e.totalTickets ? String(e.totalTickets) : "100",
        });
      } else {
        setErrorMessage("Event not found");
        setShowErrorModal(true);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? "Failed to load event";
      setErrorMessage(message);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: keyof EventFormData, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      warning("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      warning("Image size should be less than 5MB.");
      return;
    }

    setUploadingImage(true);
    try {
      let fileToUpload: File = file;
      const compressedDataUrl = await compressImage(file, 1920, 0.75);
      if (compressedDataUrl.length < file.size * 1.2) {
        const res = await fetch(compressedDataUrl);
        const blob = await res.blob();
        fileToUpload = new File([blob], file.name, { type: "image/jpeg" });
      }
      const { imageUrl } = await eventsAPI.uploadEventImage(fileToUpload);
      if (!imageUrl?.trim()) {
        warning("Upload did not return image path.");
        return;
      }
      const fullUrl = getEventImageUrl({ imageUrl });
      update("imageUrl", imageUrl);
      update("imageUri", fullUrl);
      update("imagePath", imageUrl);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Upload failed.";
      warning(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    update("imageUrl", "");
    update("imageUri", null);
    update("imagePath", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.eventName.trim()) {
      newErrors.eventName = "Event name is required";
    }
    if (!form.eventDate) {
      newErrors.eventDate = "Start date is required";
    }
    if (!form.eventTime?.trim()) {
      newErrors.eventTime = "Start time is required";
    }
    if (!form.genderSelection?.trim()) {
      newErrors.genderSelection = "Gender is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (form.eventType === "paid") {
      if (!form.ticketPrice || parseFloat(form.ticketPrice) <= 0) {
        newErrors.ticketPrice = "Cost per ticket is required for paid events.";
      }
      if (!form.totalTickets || parseInt(form.totalTickets) <= 0) {
        newErrors.totalTickets = "Total tickets must be greater than 0.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else {
      setStep(1);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const toImagePath = (urlOrPath: string | null | undefined): string | null => {
    if (!urlOrPath) return null;
    if (urlOrPath.startsWith("/")) return urlOrPath;
    try {
      const url = new URL(urlOrPath);
      return url.pathname;
    } catch {
      const uploadsIndex = urlOrPath.indexOf("/uploads");
      if (uploadsIndex !== -1) {
        return urlOrPath.substring(uploadsIndex);
      }
      return urlOrPath;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) {
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage("Please login to update an event.");
      setShowErrorModal(true);
      return;
    }

    if (!eventId) {
      setErrorMessage("Event ID is missing");
      setShowErrorModal(true);
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      // Image: path from upload (imageUrl) or existing (imagePath); empty string if removed
      const imageToSend = form.imageUrl?.trim() || form.imagePath?.trim() || "";

      // Prepare update data
      const updateData: any = {
        title: form.eventName.trim(),
        date: form.eventDate,
        time: form.eventTime,
        location: form.address.trim() || undefined,
        description: form.description.trim() || undefined,
        gender: form.genderSelection.toLowerCase(),
        ticketPrice: form.eventType === "paid" ? parseFloat(form.ticketPrice) : 0,
        totalTickets: form.eventType === "paid" ? parseInt(form.totalTickets) : undefined,
        email: user?.email || "",
        phone: user?.phone || undefined,
        image: imageToSend,
        ...(imageToSend ? { imageUrl: imageToSend } : {}),
      };

      const response = await eventsAPI.updateEvent(String(eventId), updateData);

      if (response.success) {
        // Refresh user profile
        try {
          const profile = await authAPI.getProfile();
          if (profile.success && profile.user) {
            setUser(profile.user);
          }
        } catch (profileError) {
          console.warn("Failed to update profile:", profileError);
        }

        success("Event updated successfully!");
        setTimeout(() => {
          router.back();
        }, 500);
      } else {
        const errorMsg = response.message || "Failed to update event. Please try again.";
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error: any) {
      const errorMsg = 
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.message ??
        "Failed to update event. Please try again.";
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const step1Valid = form.eventName.trim() && form.eventDate && form.eventTime && form.genderSelection;
  const step2Valid = form.eventType === "free" || (form.ticketPrice && parseFloat(form.ticketPrice) > 0 && form.totalTickets && parseInt(form.totalTickets) > 0);

  const selectedCurrency = CURRENCIES.find(c => c.code === form.currency) || CURRENCIES[0];
  const imagePreview = form.imageUri || form.imageUrl || null;

  if (loading) {
    return <EventDetailsSkeleton />;
  }

  if (errorMessage && !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <p className="mb-4 text-lg font-semibold text-[#EF4444]">{errorMessage}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Header */}
        <header 
          className="border-b border-gray-200"
          style={{ paddingTop: '52px' }}
        >
          <div className="px-4 pb-4">
            {/* Top Row: Back Button + Progress + Step Counter */}
            <div className="flex flex-row items-center justify-between mb-4">
              <button
                type="button"
                onClick={handleBack}
                className="-ml-2 p-2"
              >
                <FiArrowLeft size={24} className="text-gray-900" />
              </button>
              
              <div className="flex-1 flex flex-row items-center justify-center gap-2 mx-4">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                  <div 
                    className={`h-full bg-primary rounded-full transition-all duration-300 ${
                      step === 1 ? 'w-1/2' : 'w-full'
                    }`}
                  />
                </div>
              </div>
              
              <span className="text-sm font-medium text-gray-900 w-10 text-right">
                {step} of 2
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? "Event Details" : "Payment and Ticket Details"}
            </h1>
          </div>
        </header>

        {/* Step Content */}
        <div className="px-4 pb-20 pt-6" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
          {step === 1 ? (
            <>
              {/* Image Upload */}
              <div className="mb-6">
                <div
                  className={`w-full aspect-[16/9] rounded-2xl border-2 border-primary overflow-hidden bg-gray-50 cursor-pointer relative ${
                    uploadingImage ? 'opacity-60 pointer-events-none' : ''
                  }`}
                  onClick={() => !imagePreview && fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={imagePreview}
                        alt="Event preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = FALLBACK_IMAGE;
                        }}
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 right-3 flex justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"
                        >
                          <FiImage size={20} className="text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage();
                          }}
                          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"
                        >
                          <FiX size={20} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <FiImage size={48} className="text-primary mb-2" />
                      <span className="text-[#9CA3AF] text-sm mt-2">Tap to add Thumbnail</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Event Name */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Event Name
                </label>
                <div className={`flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border ${
                  errors.eventName ? 'border-[#EF4444]' : 'border-gray-200'
                }`}>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiCalendar size={18} className="text-[#9CA3AF]" />
                  </div>
                  <input
                    type="text"
                    value={form.eventName}
                    onChange={(e) => update("eventName", e.target.value)}
                    placeholder="name"
                    className="flex-1 text-sm text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-500"
                  />
                </div>
                {errors.eventName && (
                  <span className="text-xs text-[#EF4444] mt-1 block mb-3">{errors.eventName}</span>
                )}
              </div>

              {/* Date & Time - Side by Side */}
              <div className="flex gap-2 mb-3">
                {/* Start Date */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Start Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`w-full flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border ${
                      errors.eventDate ? 'border-[#EF4444]' : 'border-gray-200'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiCalendar size={18} className="text-[#9CA3AF]" />
                    </div>
                    <span className={`flex-1 text-sm text-left ${
                      form.eventDate ? 'text-gray-900' : 'text-[#6B7280]'
                    }`}>
                      {form.eventDate ? formatDate(form.eventDate) : 'Select date'}
                    </span>
                  </button>
                  {showDatePicker && (
                    <div className="mt-2">
                      <input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => {
                          update("eventDate", e.target.value);
                          setShowDatePicker(false);
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {errors.eventDate && (
                    <span className="text-xs text-[#EF4444] mt-1 block">{errors.eventDate}</span>
                  )}
                </div>

                {/* Time */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className={`w-full flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border ${
                      errors.eventTime ? 'border-[#EF4444]' : 'border-gray-200'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiClock size={18} className="text-[#9CA3AF]" />
                    </div>
                    <span className="flex-1 text-sm text-gray-900 text-left">
                      {form.eventTime}
                    </span>
                  </button>
                  {showTimePicker && (
                    <div className="mt-2">
                      <input
                        type="time"
                        value={form.eventTime}
                        onChange={(e) => {
                          update("eventTime", e.target.value);
                          setShowTimePicker(false);
                        }}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {errors.eventTime && (
                    <span className="text-xs text-[#EF4444] mt-1 block">{errors.eventTime}</span>
                  )}
                </div>
              </div>

              {/* Address (Optional) */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Address <span className="text-[#6B7280]">(optional)</span>
                </label>
                <div className="flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border border-gray-200">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiMapPin size={18} className="text-[#9CA3AF]" />
                  </div>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="e.g. Islamabad, Pakistan"
                    className="flex-1 text-sm text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Gender Selection */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Gender
                </label>
                <button
                  type="button"
                  onClick={() => setShowGenderModal(true)}
                  className={`w-full flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border ${
                    errors.genderSelection ? 'border-[#EF4444]' : 'border-gray-200'
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiUser size={18} className="text-[#9CA3AF]" />
                  </div>
                  <span className="flex-1 text-sm text-gray-900 text-left">
                    {form.genderSelection}
                  </span>
                  <FiChevronDown size={20} className="text-[#9CA3AF]" />
                </button>
                {errors.genderSelection && (
                  <span className="text-xs text-[#EF4444] mt-1 block mb-3">{errors.genderSelection}</span>
                )}
              </div>

              {/* Description (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Description <span className="text-[#6B7280]">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="description"
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 px-3 text-sm text-gray-900 placeholder:text-gray-500 min-h-[72px] resize-y outline-none focus:border-primary focus:bg-white"
                />
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNext}
                disabled={!step1Valid}
                className="w-full py-2.5 rounded-md bg-primary text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_4px_rgba(220,38,38,0.3)]"
              >
                Next
              </button>
            </>
          ) : (
            <>
              {/* Step 2 - Payment and Ticket Details */}
              {/* Event Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-4">
                  Event Type
                </label>
                <div className="flex gap-2">
                  {/* Paid Event Button */}
                  <button
                    type="button"
                    onClick={() => update("eventType", "paid")}
                    className={`flex-1 py-2.5 px-3 rounded-md border-2 flex flex-row items-center justify-center gap-2 ${
                      form.eventType === "paid"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      form.eventType === "paid"
                        ? "bg-primary"
                        : "border-2 border-[#6B7280] bg-transparent"
                    }`}>
                      {form.eventType === "paid" && (
                        <FiCheck size={14} className="text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">Paid Event</span>
                  </button>

                  {/* Free Event Button */}
                  <button
                    type="button"
                    onClick={() => update("eventType", "free")}
                    className={`flex-1 py-2.5 px-3 rounded-md border-2 flex flex-row items-center justify-center gap-2 ${
                      form.eventType === "free"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      form.eventType === "free"
                        ? "bg-primary"
                        : "border-2 border-[#6B7280] bg-transparent"
                    }`}>
                      {form.eventType === "free" && (
                        <FiCheck size={14} className="text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">Free Event</span>
                  </button>
                </div>
              </div>

              {/* Paid Event Fields */}
              {form.eventType === "paid" && (
                <>
                  {/* Cost Per Ticket */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Cost Per Ticket
                    </label>
                    <div className="flex flex-row items-center gap-2">
                      <div className="w-8 h-8 bg-[#374151] rounded-full flex items-center justify-center flex-shrink-0">
                        <FiDollarSign size={18} className="text-[#9CA3AF]" />
                      </div>
                      <input
                        type="number"
                        value={form.ticketPrice}
                        onChange={(e) => update("ticketPrice", e.target.value)}
                        placeholder="e.g. 600"
                        className="flex-1 bg-gray-50 rounded-md py-2 px-3 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-500 outline-none focus:border-primary focus:bg-white"
                      />
                    </div>
                    {errors.ticketPrice && (
                      <span className="text-xs text-[#EF4444] mt-1 block">{errors.ticketPrice}</span>
                    )}
                  </div>

                  {/* Select Currency */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Select Currency
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCurrencyModal(true)}
                      className="w-full flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border border-gray-200"
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">{selectedCurrency.flag}</span>
                      </div>
                      <span className="flex-1 text-sm text-gray-900 text-left">
                        {selectedCurrency.code} - {selectedCurrency.label}
                      </span>
                      <FiChevronDown size={20} className="text-[#9CA3AF]" />
                    </button>
                  </div>

                  {/* Total Tickets */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Total Tickets
                    </label>
                    <input
                      type="number"
                      value={form.totalTickets}
                      onChange={(e) => update("totalTickets", e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full bg-gray-50 rounded-md py-2 px-3 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-500 outline-none focus:border-primary focus:bg-white"
                    />
                    {errors.totalTickets && (
                      <span className="text-xs text-[#EF4444] mt-1 block">{errors.totalTickets}</span>
                    )}
                  </div>
                </>
              )}

              {/* Update Event Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !step2Valid}
                className="w-full py-2.5 rounded-md bg-primary text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_4px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2 mt-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Event</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:block">
        {/* Header */}
        <header 
          className="border-b border-gray-200"
          style={{ paddingTop: '52px' }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-4">
            {/* Top Row: Back Button + Progress + Step Counter */}
            <div className="flex flex-row items-center justify-between mb-4">
              <button
                type="button"
                onClick={handleBack}
                className="-ml-2 p-2"
              >
                <FiArrowLeft size={24} className="text-gray-900" />
              </button>
              
              <div className="flex-1 flex flex-row items-center justify-center gap-2 mx-4">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                  <div 
                    className={`h-full bg-primary rounded-full transition-all duration-300 ${
                      step === 1 ? 'w-1/2' : 'w-full'
                    }`}
                  />
                </div>
              </div>
              
              <span className="text-sm font-medium text-gray-900 w-10 text-right">
                {step} of 2
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? "Event Details" : "Payment and Ticket Details"}
            </h1>
          </div>
        </header>

        {/* Step Content */}
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          {/* Same content as mobile, just wrapped in desktop container */}
          {step === 1 ? (
            <>
              {/* Image Upload */}
              <div className="mb-6 max-w-xs mx-auto">
                <div
                  className={`w-full aspect-[16/9] rounded-2xl border-2 border-primary overflow-hidden bg-gray-50 cursor-pointer relative ${
                    uploadingImage ? 'opacity-60 pointer-events-none' : ''
                  }`}
                  onClick={() => !imagePreview && fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={imagePreview}
                        alt="Event preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = FALLBACK_IMAGE;
                        }}
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 right-3 flex justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"
                        >
                          <FiImage size={20} className="text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage();
                          }}
                          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"
                        >
                          <FiX size={20} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <FiImage size={48} className="text-primary mb-2" />
                      <span className="text-[#9CA3AF] text-sm mt-2">Tap to add Thumbnail</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Event Name */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Event Name
                </label>
                <div className={`flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border ${
                  errors.eventName ? 'border-[#EF4444]' : 'border-gray-200'
                }`}>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiCalendar size={18} className="text-[#9CA3AF]" />
                  </div>
                  <input
                    type="text"
                    value={form.eventName}
                    onChange={(e) => update("eventName", e.target.value)}
                    placeholder="name"
                    className="flex-1 text-sm text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-500"
                  />
                </div>
                {errors.eventName && (
                  <span className="text-xs text-[#EF4444] mt-1 block mb-3">{errors.eventName}</span>
                )}
              </div>

              {/* Date & Time - Side by Side */}
              <div className="flex gap-2 mb-3">
                {/* Start Date */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Start Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`w-full flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border ${
                      errors.eventDate ? 'border-[#EF4444]' : 'border-gray-200'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiCalendar size={18} className="text-[#9CA3AF]" />
                    </div>
                    <span className={`flex-1 text-sm text-left ${
                      form.eventDate ? 'text-gray-900' : 'text-[#6B7280]'
                    }`}>
                      {form.eventDate ? formatDate(form.eventDate) : 'Select date'}
                    </span>
                  </button>
                  {showDatePicker && (
                    <div className="mt-2">
                      <input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => {
                          update("eventDate", e.target.value);
                          setShowDatePicker(false);
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {errors.eventDate && (
                    <span className="text-xs text-[#EF4444] mt-1 block">{errors.eventDate}</span>
                  )}
                </div>

                {/* Time */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className={`w-full flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border ${
                      errors.eventTime ? 'border-[#EF4444]' : 'border-gray-200'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiClock size={18} className="text-[#9CA3AF]" />
                    </div>
                    <span className="flex-1 text-sm text-gray-900 text-left">
                      {form.eventTime}
                    </span>
                  </button>
                  {showTimePicker && (
                    <div className="mt-2">
                      <input
                        type="time"
                        value={form.eventTime}
                        onChange={(e) => {
                          update("eventTime", e.target.value);
                          setShowTimePicker(false);
                        }}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {errors.eventTime && (
                    <span className="text-xs text-[#EF4444] mt-1 block">{errors.eventTime}</span>
                  )}
                </div>
              </div>

              {/* Address (Optional) */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Address <span className="text-[#6B7280]">(optional)</span>
                </label>
                <div className="flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border border-gray-200">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiMapPin size={18} className="text-[#9CA3AF]" />
                  </div>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="e.g. Islamabad, Pakistan"
                    className="flex-1 text-sm text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Gender Selection */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Gender
                </label>
                <button
                  type="button"
                  onClick={() => setShowGenderModal(true)}
                  className={`w-full flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border ${
                    errors.genderSelection ? 'border-[#EF4444]' : 'border-gray-200'
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiUser size={18} className="text-[#9CA3AF]" />
                  </div>
                  <span className="flex-1 text-sm text-gray-900 text-left">
                    {form.genderSelection}
                  </span>
                  <FiChevronDown size={20} className="text-[#9CA3AF]" />
                </button>
                {errors.genderSelection && (
                  <span className="text-xs text-[#EF4444] mt-1 block mb-3">{errors.genderSelection}</span>
                )}
              </div>

              {/* Description (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Description <span className="text-[#6B7280]">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="description"
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 px-3 text-sm text-gray-900 placeholder:text-gray-500 min-h-[72px] resize-y outline-none focus:border-primary focus:bg-white"
                />
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNext}
                disabled={!step1Valid}
                className="w-full py-2.5 rounded-md bg-primary text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_4px_rgba(220,38,38,0.3)]"
              >
                Next
              </button>
            </>
          ) : (
            <>
              {/* Step 2 - Same as mobile */}
              {/* Event Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-4">
                  Event Type
                </label>
                <div className="flex gap-2">
                  {/* Paid Event Button */}
                  <button
                    type="button"
                    onClick={() => update("eventType", "paid")}
                    className={`flex-1 py-2.5 px-3 rounded-md border-2 flex flex-row items-center justify-center gap-2 ${
                      form.eventType === "paid"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      form.eventType === "paid"
                        ? "bg-primary"
                        : "border-2 border-[#6B7280] bg-transparent"
                    }`}>
                      {form.eventType === "paid" && (
                        <FiCheck size={14} className="text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">Paid Event</span>
                  </button>

                  {/* Free Event Button */}
                  <button
                    type="button"
                    onClick={() => update("eventType", "free")}
                    className={`flex-1 py-2.5 px-3 rounded-md border-2 flex flex-row items-center justify-center gap-2 ${
                      form.eventType === "free"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      form.eventType === "free"
                        ? "bg-primary"
                        : "border-2 border-[#6B7280] bg-transparent"
                    }`}>
                      {form.eventType === "free" && (
                        <FiCheck size={14} className="text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">Free Event</span>
                  </button>
                </div>
              </div>

              {/* Paid Event Fields */}
              {form.eventType === "paid" && (
                <>
                  {/* Cost Per Ticket */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Cost Per Ticket
                    </label>
                    <div className="flex flex-row items-center gap-2">
                      <div className="w-8 h-8 bg-[#374151] rounded-full flex items-center justify-center flex-shrink-0">
                        <FiDollarSign size={18} className="text-[#9CA3AF]" />
                      </div>
                      <input
                        type="number"
                        value={form.ticketPrice}
                        onChange={(e) => update("ticketPrice", e.target.value)}
                        placeholder="e.g. 600"
                        className="flex-1 bg-gray-50 rounded-md py-2 px-3 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-500 outline-none focus:border-primary focus:bg-white"
                      />
                    </div>
                    {errors.ticketPrice && (
                      <span className="text-xs text-[#EF4444] mt-1 block">{errors.ticketPrice}</span>
                    )}
                  </div>

                  {/* Select Currency */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Select Currency
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCurrencyModal(true)}
                      className="w-full flex flex-row items-center gap-2 bg-gray-50 rounded-md py-2 px-3 border border-gray-200"
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">{selectedCurrency.flag}</span>
                      </div>
                      <span className="flex-1 text-sm text-gray-900 text-left">
                        {selectedCurrency.code} - {selectedCurrency.label}
                      </span>
                      <FiChevronDown size={20} className="text-[#9CA3AF]" />
                    </button>
                  </div>

                  {/* Total Tickets */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Total Tickets
                    </label>
                    <input
                      type="number"
                      value={form.totalTickets}
                      onChange={(e) => update("totalTickets", e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full bg-gray-50 rounded-md py-2 px-3 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-500 outline-none focus:border-primary focus:bg-white"
                    />
                    {errors.totalTickets && (
                      <span className="text-xs text-[#EF4444] mt-1 block">{errors.totalTickets}</span>
                    )}
                  </div>
                </>
              )}

              {/* Update Event Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !step2Valid}
                className="w-full py-2.5 rounded-md bg-primary text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_4px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2 mt-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Event</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gender Selection Modal */}
      {showGenderModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setShowGenderModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Select Gender</h3>
            </div>
            <div className="p-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    update("genderSelection", option);
                    setShowGenderModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    form.genderSelection === option
                      ? "bg-primary"
                      : "border-2 border-gray-300"
                  }`}>
                    {form.genderSelection === option && (
                      <FiCheck size={14} className="text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{option}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Currency Selection Modal */}
      {showCurrencyModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCurrencyModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Select Currency</h3>
            </div>
            <div className="p-2">
              {CURRENCIES.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => {
                    update("currency", currency.code);
                    setShowCurrencyModal(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    form.currency === currency.code
                      ? "bg-primary"
                      : "border-2 border-gray-300"
                  }`}>
                    {form.currency === currency.code && (
                      <FiCheck size={14} className="text-white" />
                    )}
                  </div>
                  <span className="text-lg mr-2">{currency.flag}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {currency.code} - {currency.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowErrorModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">Error</h3>
            <p className="text-sm text-gray-700 mb-4">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="w-full py-2.5 rounded-md bg-primary text-white text-base font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

