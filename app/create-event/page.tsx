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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      warning("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      warning("Image size should be less than 5MB.");
      return;
    }

    // Create preview and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      update("imageUrl", result); // Store base64 data URL
    };
    reader.readAsDataURL(file);
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
      const response = await eventsAPI.createEvent({
        title: form.eventName,
        description: form.description,
        date: form.eventDate,
        time: "18:00",
        location: `${form.eventLocation}, ${form.eventCity}`,
        image: form.imageUrl,
        email: form.email,
        phone: form.phone,
        ticketPrice: 0,
        totalTickets: 100
      });

      if (response.success) {
        const eventId = response.event?.id;
        try {
          const profile = await authAPI.getProfile();
          if (profile.success && profile.user) {
            setUser(profile.user);
          }
        } catch {
          // ignore
        }
        if (eventId) {
          success("Event created successfully!");
          setTimeout(() => {
            router.push(`/created-events/${eventId}`);
          }, 500);
        } else {
          success("Event created successfully, but ID is missing.");
          setTimeout(() => {
            router.push("/");
          }, 500);
        }
      } else {
        showError(response.message || "Failed to create event.");
      }
    } catch (error: any) {
      showError(
        error?.response?.data?.message ??
          error?.message ??
          "Failed to create event. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Create event</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-mutedLight hover:text-white"
          >
            Back
          </button>
        </div>

        <div className="space-y-4 rounded-2xl bg-surface p-5 shadow-xl">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Fatima Ali"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="e.g. fatimaali@gmail.com"
                type="email"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Phone number
              </label>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+92…"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Company name
              </label>
              <input
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="e.g. Paymo events"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Event name
              </label>
              <input
                value={form.eventName}
                onChange={(e) => update("eventName", e.target.value)}
                placeholder="e.g. Catcha cat"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Event location
              </label>
              <input
                value={form.eventLocation}
                onChange={(e) => update("eventLocation", e.target.value)}
                placeholder="e.g. LUMS"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Event date
              </label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => update("eventDate", e.target.value)}
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Event city
              </label>
              <input
                value={form.eventCity}
                onChange={(e) => update("eventCity", e.target.value)}
                placeholder="Enter city name"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-white">
              Event category
            </label>
            <select
              value={form.eventCategory}
              onChange={(e) => update("eventCategory", e.target.value)}
              className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
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
            <label className="mb-1 block text-xs font-semibold text-white">
              Event image (optional)
            </label>
            {imagePreview ? (
              <div className="relative">
                <div className="relative overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Event preview"
                    className="h-48 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full rounded-xl border border-border bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-accent hover:bg-accent/10"
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-[#111827] px-4 py-8 text-sm font-semibold text-white transition-all hover:border-accent hover:bg-accent/5"
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
                <p className="mt-1 text-xs text-mutedLight">
                  Supported formats: JPG, PNG, WebP (Max 5MB)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-white">
              What is your event about
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={5}
              placeholder="Enter a description…"
              className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {loading ? "Creating event…" : "Create event"}
          </button>
        </div>
      </div>
    </div>
  );
}


