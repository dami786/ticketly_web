"use client";

import { useEffect, useMemo, useState } from "react";
import { EventCard } from "../../components/EventCard";
import { eventsAPI } from "../../lib/api/events";
import { useAppStore } from "../../store/useAppStore";

export default function ExplorePage() {
  const events = useAppStore((state) => state.events);
  const setEvents = useAppStore((state) => state.setEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (events.length > 0) return;
      try {
        setLoading(true);
        const response = await eventsAPI.getApprovedEvents();
        if (response.success && response.events) {
          // Process events and ensure images are properly set
          const processedEvents = response.events.map((event: any) => {
            // Check multiple possible field names for image
            const image = event.image || 
                         event.imageUrl || 
                         event.image_url ||
                         null;
            return {
              ...event,
              image: image // Set to image field for consistency
            };
          });
          setEvents(processedEvents);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [events.length, setEvents]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter((event) => {
      const location = event.location ?? "";
      return (
        event.title.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        location.toLowerCase().includes(q)
      );
    });
  }, [events, searchQuery]);

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <header className="mb-6">
          <h1 className="mb-3 text-3xl font-bold text-white">
            Explore events
          </h1>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event…"
            className="w-full rounded-xl bg-surface px-4 py-3 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </header>

        {loading ? (
          <div className="py-10 text-center text-sm text-mutedLight">
            Loading events…
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-10 text-center text-sm text-mutedLight">
            No events found.
          </div>
        ) : (
          <div className="flex flex-wrap justify-between gap-y-4">
            {filteredEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


