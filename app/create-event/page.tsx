"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import { authAPI } from "../../lib/api/auth";
import { eventsAPI } from "../../lib/api/events";
import { useToast } from "../../lib/hooks/useToast";
import { getEventImageUrl } from "../../lib/utils/images";
import { useAppStore } from "../../store/useAppStore";

interface EventFormData {
  eventName: string;
  eventDate: string;
  eventTime: string;
  address: string;
  genderSelection: string;
  description: string;
  imageUrl: string;
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

export default function CreateEventPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const { success, error: showError, warning, info } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EventFormData>({
    eventName: "",
    eventDate: "",
    eventTime: "18:00",
    address: "",
    genderSelection: "All",
    description: "",
    imageUrl: "",
    eventType: "free",
    ticketPrice: "",
    currency: "PKR",
    totalTickets: "100",
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof EventFormData, value: string) => {
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
      // Optional: compress before upload to reduce size
      let fileToUpload = file;
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
      update("imageUrl", imageUrl);
      setImagePreview(getEventImageUrl({ imageUrl }));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Upload failed.";
      warning(msg);
      console.error("Image upload error:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    update("imageUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.eventName.trim()) {
      newErrors.eventName = "Event name is required.";
    }
    if (!form.eventDate) {
      newErrors.eventDate = "Start date is required.";
    }
    if (!form.eventTime) {
      newErrors.eventTime = "Time is required.";
    }
    if (!form.genderSelection) {
      newErrors.genderSelection = "Gender selection is required.";
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

  const handleSubmit = async () => {
    if (!validateStep2()) {
      return;
    }

    const isAuthenticated = useAppStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      if (confirm("You need to be logged in to create an event. Go to login page?")) {
        router.push("/login");
      }
      return;
    }

    setLoading(true);
    try {
      // imageUrl is either path from upload (/uploads/events/...) or empty
      const finalImage = form.imageUrl?.trim() && !form.imageUrl.startsWith("data:")
        ? form.imageUrl
        : "";

      if (!form.eventName.trim()) {
        warning("Event name is required.");
        setLoading(false);
        return;
      }
      if (!form.eventDate) {
        warning("Event date is required.");
        setLoading(false);
        return;
      }

      const eventData: any = {
        title: form.eventName.trim(),
        description: form.description.trim() || "No description provided.",
        date: form.eventDate,
        time: form.eventTime,
        location: form.address.trim() || "Location TBD",
        email: user?.email || "",
        phone: user?.phone || "",
        gender: form.genderSelection.toLowerCase(),
        ticketPrice: form.eventType === "paid" ? parseFloat(form.ticketPrice) : 0,
        totalTickets: form.eventType === "paid" ? parseInt(form.totalTickets) : undefined,
        ...(finalImage ? { image: finalImage, imageUrl: finalImage } : {}),
      };

      const response = await eventsAPI.createEvent(eventData);

      if (response && (response.success === true || (response as any).success === true)) {
        const eventId = 
          response.event?.id || 
          (response as any).event?._id || 
          (response as any).eventId || 
          (response as any).id ||
          (response as any)._id;
        
        try {
          const profile = await authAPI.getProfile();
          if (profile.success && profile.user) {
            setUser(profile.user);
          }
        } catch (profileError) {
          console.warn("Failed to update profile:", profileError);
        }
        
        if (eventId) {
          success("Event created successfully!");
          setTimeout(() => {
          router.push(`/created-events/${eventId}`);
          }, 500);
        } else {
          success("Event created successfully! Redirecting to home...");
          setTimeout(() => {
          router.push("/");
          }, 1000);
        }
      } else {
        const errorMsg = 
          response?.message || 
          (response as any)?.message ||
          (response as any)?.error || 
          (response as any)?.error?.message ||
          "Failed to create event. Please check all fields and try again.";
        showError(errorMsg);
      }
    } catch (error: any) {
      let errorMessage = 
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.response?.data?.msg ??
          error?.message ??
        "Failed to create event. Please try again.";
      
      if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
        errorMessage = "Request timed out. Please check your internet connection and try again.";
      } else if (error?.code === "ERR_NETWORK" || !error?.response) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      showError(errorMessage);
      
      if (
        errorMessage.toLowerCase().includes("too large") ||
        errorMessage.toLowerCase().includes("entity too large") ||
        error?.response?.status === 413 ||
        (error?.response?.status === 500 && form.imageUrl)) {
        warning("Image might be too large. Try creating event without image first.");
      }
    } finally {
      setLoading(false);
    }
  };

  const step1Valid = form.eventName.trim() && form.eventDate && form.eventTime && form.genderSelection;
  const step2Valid = form.eventType === "free" || (form.ticketPrice && parseFloat(form.ticketPrice) > 0 && form.totalTickets && parseInt(form.totalTickets) > 0);

  const selectedCurrency = CURRENCIES.find(c => c.code === form.currency) || CURRENCIES[0];

  return (
    <div className="bg-white min-h-screen">
      {/* Desktop Layout - Same 2-step form as mobile */}
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
                        className={`flex-1 bg-[#1F1F1F] border rounded-md py-2 px-3 text-sm text-white placeholder:text-gray-500 outline-none ${
                          errors.ticketPrice ? 'border-[#EF4444]' : 'border-[#374151]'
                        }`}
              />
            </div>
                    {errors.ticketPrice && (
                      <span className="text-xs text-[#EF4444] mt-1 block mb-3">{errors.ticketPrice}</span>
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
                      className="w-full flex flex-row items-center gap-2 bg-[#1F1F1F] border border-[#374151] rounded-md py-2 px-3 active:opacity-80"
                    >
                      <div className="w-8 h-8 bg-[#374151] rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                        {selectedCurrency.flag}
                      </div>
                      <span className="flex-1 text-base text-white text-left">
                        {form.currency}
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
                      className={`w-full bg-gray-50 border rounded-md py-2 px-3 text-sm text-gray-900 placeholder:text-gray-500 outline-none ${
                        errors.totalTickets ? 'border-[#EF4444]' : 'border-gray-200'
                      }`}
                    />
                    {errors.totalTickets && (
                      <span className="text-xs text-[#EF4444] mt-1 block mb-4">{errors.totalTickets}</span>
                    )}
                  </div>
                </>
              )}

              {/* Post Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !step2Valid}
                className="w-full py-2.5 rounded-md bg-primary text-white text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_2px_4px_rgba(220,38,38,0.3)] mt-2"
              >
                {loading ? "Posting…" : "Post"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Layout - 2-Step Form (as per Mobile App Design Guide) */}
      <div className="sm:hidden">
        {/* Header */}
        <header 
          className="px-4 pb-4 border-b border-gray-200"
          style={{ paddingTop: 'calc(52px + env(safe-area-inset-top))' }}
        >
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
        </header>

        {/* Step Content */}
        <div 
          className="pt-6 px-4"
          style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}
        >
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
                        className={`flex-1 bg-[#1F1F1F] border rounded-md py-2 px-3 text-sm text-white placeholder:text-gray-500 outline-none ${
                          errors.ticketPrice ? 'border-[#EF4444]' : 'border-[#374151]'
                        }`}
                      />
                    </div>
                    {errors.ticketPrice && (
                      <span className="text-xs text-[#EF4444] mt-1 block mb-3">{errors.ticketPrice}</span>
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
                      className="w-full flex flex-row items-center gap-2 bg-[#1F1F1F] border border-[#374151] rounded-md py-2 px-3 active:opacity-80"
                    >
                      <div className="w-8 h-8 bg-[#374151] rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                        {selectedCurrency.flag}
                      </div>
                      <span className="flex-1 text-base text-white text-left">
                        {form.currency}
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
                      className={`w-full bg-gray-50 border rounded-md py-2 px-3 text-sm text-gray-900 placeholder:text-gray-500 outline-none ${
                        errors.totalTickets ? 'border-[#EF4444]' : 'border-gray-200'
                      }`}
                    />
                    {errors.totalTickets && (
                      <span className="text-xs text-[#EF4444] mt-1 block mb-4">{errors.totalTickets}</span>
                    )}
                  </div>
                </>
              )}

              {/* Post Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !step2Valid}
                className="w-full py-2.5 rounded-md bg-primary text-white text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_2px_4px_rgba(220,38,38,0.3)] mt-2"
              >
                {loading ? "Posting…" : "Post"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gender Selection Modal */}
      {showGenderModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowGenderModal(false)}
          />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 px-4 pb-8 pt-2 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gender Selection</h2>
            <div className="space-y-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    update("genderSelection", option);
                    setShowGenderModal(false);
                  }}
                  className={`w-full flex flex-row items-center py-3.5 px-4 rounded-xl mb-2 transition-all ${
                    form.genderSelection === option
                      ? "bg-primary/10 border border-primary"
                      : "bg-gray-100 border border-transparent"
                  } active:opacity-80`}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <FiUser size={18} className="text-[#9CA3AF]" />
                  </div>
                  <span className="flex-1 text-base font-medium text-gray-900 text-left">
                    {option}
                  </span>
                  {form.genderSelection === option && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <FiCheck size={14} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Currency Selection Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCurrencyModal(false)}
          />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 px-4 pb-8 pt-2 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Currency</h2>
            <div className="space-y-2">
              {CURRENCIES.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => {
                    update("currency", currency.code);
                    setShowCurrencyModal(false);
                  }}
                  className={`w-full flex flex-row items-center py-3.5 px-4 rounded-xl mb-2 transition-all ${
                    form.currency === currency.code
                      ? "bg-primary/10 border border-primary"
                      : "bg-gray-100 border border-transparent"
                  } active:opacity-80`}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3 text-lg">
                    {currency.flag}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-base font-medium text-gray-900">{currency.code}</div>
                    <div className="text-sm text-[#9CA3AF]">{currency.label}</div>
                  </div>
                  {form.currency === currency.code && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <FiCheck size={14} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
