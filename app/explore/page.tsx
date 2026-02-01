"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EventCard } from "../../components/EventCard";
import { EventCardSkeletonList } from "../../components/EventCardSkeleton";
import { eventsAPI } from "../../lib/api/events";
import { useAppStore } from "../../store/useAppStore";

export default function ExplorePage() {
  const events = useAppStore((state) => state.events);
  const setEvents = useAppStore((state) => state.setEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle scroll to show/hide header (mobile only)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 640) return; // Desktop - no collapsible header
    const y = e.currentTarget.scrollTop;
    const diff = y - lastScrollY.current;
    
    if (y <= 30) {
      setHeaderVisible(true);
    } else if (diff > 15) {
      setHeaderVisible(false); // Scrolling down
    } else if (diff < -15) {
      setHeaderVisible(true); // Scrolling up
    }
    
    lastScrollY.current = y;
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Desktop Layout - Unchanged */}
      <div className="hidden sm:block mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <header className="mb-6">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            Explore events
          </h1>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event…"
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </header>

        {loading ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            <EventCardSkeletonList count={6} />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-600">
            No events found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Layout - Collapsible Header (as per Mobile App Design Guide) */}
      <header 
        className={`sm:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 transition-transform duration-200 ease-in-out ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))', paddingBottom: '16px', paddingLeft: '12px', paddingRight: '12px' }}
      >
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by event…"
          className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
        />
      </header>

      {/* Mobile Content Area */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="sm:hidden overflow-y-auto"
        style={{ 
          paddingTop: 'calc(68px + env(safe-area-inset-top))', 
          paddingBottom: 'calc(76px + env(safe-area-inset-bottom))',
          paddingLeft: '2px',
          paddingRight: '2px',
          height: '100vh'
        }}
      >
        {loading ? (
          <div className="grid grid-cols-2 gap-0.5 px-0.5">
            <EventCardSkeletonList count={6} />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-3 text-center">
            <div className="text-5xl text-gray-400 mb-3">🔍</div>
            <p className="text-base font-medium text-gray-500 mb-1">No data found</p>
            <p className="text-sm text-gray-600 px-3">No events found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5 px-0.5">
            {filteredEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


