"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FiImage, FiX } from "react-icons/fi";
import { authAPI } from "../../lib/api/auth";
import { eventsAPI } from "../../lib/api/events";
import { useToast } from "../../lib/hooks/useToast";
import { useAppStore } from "../../store/useAppStore";

interface EventFormData {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  eventName: string;
  eventLocation: string;
  eventDate: string;
  eventCity: string;
  eventCategory: string;
  description: string;
  imageUrl: string;
}

const CATEGORIES = [
  "Music",
  "Technology",
  "Festival",
  "Sports",
  "Arts",
  "Business",
  "Other"
];

export default function CreateEventPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const { success, error: showError, warning } = useToast();

  const [form, setForm] = useState<EventFormData>({
    name: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    companyName: user?.companyName ?? "",
    eventName: "",
    eventLocation: "",
    eventDate: "",
    eventCity: "",
    eventCategory: "",
    description: "",
    imageUrl: ""
  });

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof EventFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

          // Calculate new dimensions
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      warning("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      warning("Image size should be less than 5MB.");
      return;
    }

    try {
      // Compress image to reduce size
      const compressedImage = await compressImage(file, 1920, 0.75);
      
      // Check compressed size (base64 string length is actual size)
      const base64Size = compressedImage.length;
      console.log("Compressed image size:", (base64Size / 1024).toFixed(2), "KB");
      
      if (base64Size > 1 * 1024 * 1024) {
        // If larger than 1MB, compress more aggressively
        const moreCompressed = await compressImage(file, 1280, 0.6);
        const moreCompressedSize = moreCompressed.length;
        console.log("More compressed size:", (moreCompressedSize / 1024).toFixed(2), "KB");
        
        if (moreCompressedSize > 1 * 1024 * 1024) {
          // Final compression - very aggressive (max 800KB target)
          const finalCompressed = await compressImage(file, 1024, 0.5);
          const finalSize = finalCompressed.length;
          console.log("Final compressed size:", (finalSize / 1024).toFixed(2), "KB");
          
          if (finalSize > 1.2 * 1024 * 1024) {
            warning("Image is still too large. Please select a smaller image or create event without image.");
            return;
          }
          
          setImagePreview(finalCompressed);
          update("imageUrl", finalCompressed);
        } else {
          setImagePreview(moreCompressed);
          update("imageUrl", moreCompressed);
        }
      } else {
        setImagePreview(compressedImage);
        update("imageUrl", compressedImage);
      }
    } catch (error) {
      warning("Failed to process image. Please try again.");
      console.error("Image compression error:", error);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    update("imageUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!form.eventName || !form.eventLocation || !form.eventDate || !form.eventCity) {
      warning("Please fill in all required fields (Event name, location, date, city).");
      return;
    }
    if (!form.description || form.description.length < 10) {
      warning("Please provide an event description (at least 10 characters).");
      return;
    }
    if (!form.email || !form.phone) {
      warning("Please fill in your email and phone number.");
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
      // Prepare image - if too large, skip it
      let finalImage = form.imageUrl;
      if (finalImage && finalImage.length > 1 * 1024 * 1024) {
        // If base64 string is larger than 1MB, skip it to avoid server errors
        warning("Image is too large. Creating event without image. You can add image later.");
        finalImage = "";
      }
      
      console.log("Event data size:", JSON.stringify({
        title: form.eventName,
        description: form.description,
        image: finalImage ? `${finalImage.substring(0, 50)}...` : "none"
      }).length, "bytes");

      // Validate required fields
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
      if (!form.eventLocation.trim() || !form.eventCity.trim()) {
        warning("Event location is required.");
        setLoading(false);
        return;
      }

      const eventData = {
        title: form.eventName.trim(),
        description: form.description.trim() || "No description provided.",
        date: form.eventDate,
        time: "18:00",
        location: `${form.eventLocation.trim()}, ${form.eventCity.trim()}`,
        email: form.email.trim(),
        phone: form.phone.trim(),
        ticketPrice: 0,
        totalTickets: 100,
        ...(finalImage && finalImage.trim() ? { image: finalImage } : {})
      };

      console.log("Sending event data to API:", {
        ...eventData,
        image: eventData.image ? `${eventData.image.substring(0, 50)}... (${(eventData.image.length / 1024).toFixed(2)} KB)` : "none"
      });

      const response = await eventsAPI.createEvent(eventData);

      console.log("=== API Response ===");
      console.log("Full response:", JSON.stringify(response, null, 2));
      console.log("Response type:", typeof response);
      console.log("Response.success:", response?.success);
      console.log("Response.event:", response?.event);

      // Handle different response formats
      if (response && (response.success === true || (response as any).success === true)) {
        // Try multiple ways to extract event ID
        const eventId = 
          response.event?.id || 
          (response as any).event?._id || 
          (response as any).event?.id ||
          (response as any).event?._id ||
          (response as any).eventId || 
          (response as any).id ||
          (response as any)._id;
        
        console.log("Extracted Event ID:", eventId);
        console.log("Response.event structure:", response.event);
        
        // Update user profile
        try {
          const profile = await authAPI.getProfile();
          if (profile.success && profile.user) {
            setUser(profile.user);
          }
        } catch (profileError) {
          console.warn("Failed to update profile:", profileError);
          // Continue even if profile update fails
        }
        
        if (eventId) {
          success("Event created successfully!");
          setTimeout(() => {
            router.push(`/created-events/${eventId}`);
          }, 500);
        } else {
          console.warn("⚠️ Event created but ID missing. Full response:", response);
          // Try to get ID from response data directly
          const fallbackId = (response as any).data?.event?._id || 
                            (response as any).data?.event?.id ||
                            (response as any).data?._id ||
                            (response as any).data?.id;
          
          if (fallbackId) {
            console.log("Found fallback ID:", fallbackId);
            success("Event created successfully!");
            setTimeout(() => {
              router.push(`/created-events/${fallbackId}`);
            }, 500);
          } else {
            success("Event created successfully! Redirecting to home...");
            setTimeout(() => {
              router.push("/");
            }, 1000);
          }
        }
      } else {
        // Response was not successful
        const errorMsg = 
          response?.message || 
          (response as any)?.message ||
          (response as any)?.error || 
          (response as any)?.error?.message ||
          "Failed to create event. Please check all fields and try again.";
        console.error("❌ Event creation failed:", errorMsg);
        console.error("Full response:", response);
        showError(errorMsg);
      }
    } catch (error: any) {
      console.error("=== Event Creation Error ===");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error status:", error?.response?.status);
      console.error("Error response data:", error?.response?.data);
      console.error("Request URL:", error?.config?.url);
      console.error("Request method:", error?.config?.method);
      
      const payloadSize = JSON.stringify({
        title: form.eventName,
        description: form.description,
        date: form.eventDate,
        image: form.imageUrl ? `${form.imageUrl.substring(0, 50)}...` : "none"
      }).length;
      console.error("Request payload size:", `${(payloadSize / 1024).toFixed(2)} KB`);
      
      // Extract error message from various possible locations
      let errorMessage = 
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.response?.data?.msg ??
        error?.message ??
        "Failed to create event. Please try again.";
      
      // Handle network errors
      if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
        errorMessage = "Request timed out. Please check your internet connection and try again.";
      } else if (error?.code === "ERR_NETWORK" || !error?.response) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      showError(errorMessage);
      
      // Special handling for size-related errors
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

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Create event</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500Light hover:text-gray-900"
          >
            Back
          </button>
        </div>

        <div className="space-y-4 rounded-2xl bg-white border border-gray-200 p-5 shadow-xl">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Fatima Ali"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="e.g. fatimaali@gmail.com"
                type="email"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Phone number
              </label>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+92…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Company name
              </label>
              <input
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="e.g. Paymo events"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Event name
              </label>
              <input
                value={form.eventName}
                onChange={(e) => update("eventName", e.target.value)}
                placeholder="e.g. Catcha cat"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Event location
              </label>
              <input
                value={form.eventLocation}
                onChange={(e) => update("eventLocation", e.target.value)}
                placeholder="e.g. LUMS"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Event date
              </label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => update("eventDate", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Event city
              </label>
              <input
                value={form.eventCity}
                onChange={(e) => update("eventCity", e.target.value)}
                placeholder="Enter city name"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-900">
              Event category
            </label>
            <select
              value={form.eventCategory}
              onChange={(e) => update("eventCategory", e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-900">
              Event image (optional)
            </label>
            {imagePreview ? (
              <div className="relative">
                <div className="relative overflow-hidden rounded-xl border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Event preview"
                    className="h-48 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-gray-900 backdrop-blur-sm transition-colors hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:border-accent hover:bg-primary/10"
                >
                  Change image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm font-semibold text-gray-900 transition-all hover:border-accent hover:bg-primary/5"
                >
                  <FiImage className="h-5 w-5" />
                  <span>Select image from gallery</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <p className="mt-1 text-xs text-gray-500Light">
                  Supported formats: JPG, PNG, WebP (Max 5MB)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-900">
              What is your event about
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={5}
              placeholder="Enter a description…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Creating event…" : "Create event"}
          </button>
        </div>
      </div>
    </div>
  );
}


