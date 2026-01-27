"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authAPI } from "../../lib/api/auth";
import { eventsAPI } from "../../lib/api/events";
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

  const update = (field: keyof EventFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.eventName || !form.eventLocation || !form.eventDate || !form.eventCity) {
      alert("Please fill in all required fields (Event name, location, date, city).");
      return;
    }
    if (!form.description || form.description.length < 10) {
      alert("Please provide an event description (at least 10 characters).");
      return;
    }
    if (!form.email || !form.phone) {
      alert("Please fill in your email and phone number.");
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
          alert("Event created successfully.");
          router.push(`/created-events/${eventId}`);
        } else {
          alert("Event created successfully, but ID is missing.");
          router.push("/");
        }
      } else {
        alert(response.message || "Failed to create event.");
      }
    } catch (error: any) {
      alert(
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
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
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

          <div className="grid gap-4 md:grid-cols-2">
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
                Event image URL (optional)
              </label>
              <input
                value={form.imageUrl}
                onChange={(e) => update("imageUrl", e.target.value)}
                placeholder="https://…"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
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


