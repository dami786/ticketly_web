"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { EventCard } from "../../components/EventCard";
import { EventCardSkeletonList } from "../../components/EventCardSkeleton";
import { eventsAPI, type Event } from "../../lib/api/events";
import { useAppStore } from "../../store/useAppStore";
import { getCached, setCached, CACHE_KEYS } from "../../lib/cache";

type DateFilter =
  | "today"
  | "tomorrow"
  | "thisweek"
  | "thisweekend"
  | "nextweek"
  | "nextweekend"
  | "thismonth";

const DATE_FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "thisweek", label: "This Week" },
  { key: "thisweekend", label: "This Weekend" },
  { key: "nextweek", label: "Next Week" },
  { key: "nextweekend", label: "Next Weekend" },
  { key: "thismonth", label: "This Month" },
];

const DATE_FILTER_HEADINGS: Record<DateFilter, string> = {
  today: "Today's Events",
  tomorrow: "Tomorrow's Events",
  thisweek: "This Week's Events",
  thisweekend: "This Weekend's Events",
  nextweek: "Next Week's Events",
  nextweekend: "Next Weekend's Events",
  thismonth: "This Month's Events",
};

// Helper functions
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isWeekend = (d: Date): boolean => {
  return d.getDay() === 0 || d.getDay() === 6; // Sunday (0) or Saturday (6)
};

const getStartOfWeek = (d: Date): Date => {
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = start
  const start = new Date(d.getFullYear(), d.getMonth(), diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getEndOfWeek = (d: Date): Date => {
  const start = getStartOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday (6 days after Monday)
  end.setHours(23, 59, 59, 999);
  return end;
};

const getStartOfNextWeek = (d: Date): Date => {
  const start = getStartOfWeek(d);
  const next = new Date(start);
  next.setDate(next.getDate() + 7); // Next Monday
  return next;
};

const getEndOfNextWeek = (d: Date): Date => {
  const start = getStartOfNextWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Next Sunday
  end.setHours(23, 59, 59, 999);
  return end;
};

function eventMatchesDateFilter(
  event: Event,
  filter: DateFilter
): boolean {
  const parts = event.date.split("-").map(Number);
  const eventDate = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  eventDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "today") {
    return isSameDay(eventDate, today);
  }

  if (filter === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(eventDate, tomorrow);
  }

  if (filter === "thisweek") {
    const start = getStartOfWeek(today);
    const end = getEndOfWeek(today);
    return eventDate >= start && eventDate <= end;
  }

  if (filter === "thisweekend") {
    const start = getStartOfWeek(today);
    const end = getEndOfWeek(today);
    if (eventDate < start || eventDate > end) return false;
    return isWeekend(eventDate);
  }

  if (filter === "nextweek") {
    const start = getStartOfNextWeek(today);
    const end = getEndOfNextWeek(today);
    return eventDate >= start && eventDate <= end;
  }

  if (filter === "nextweekend") {
    const start = getStartOfNextWeek(today);
    const end = getEndOfNextWeek(today);
    if (eventDate < start || eventDate > end) return false;
    return isWeekend(eventDate);
  }

  if (filter === "thismonth") {
    return (
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  }

  return true;
}

export default function EventFilterPage() {
  const router = useRouter();
  const setEvents = useAppStore((state) => state.setEvents);
  const [events, setLocalEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateFilter>("today");
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  useEffect(() => {
    void loadEvents();
  }, []);

  const loadEvents = async (showRefreshing = false) => {
    if (!showRefreshing) {
      const cached = getCached<Event[]>(CACHE_KEYS.EVENTS);
      if (cached && Array.isArray(cached) && cached.length >= 0) {
        setEvents(cached);
        setLocalEvents(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
    } else {
      setRefreshing(true);
    }

    try {
      const response = await eventsAPI.getApprovedEvents();
      if (response.success && response.events) {
        const processedEvents = response.events.map((event: any) => ({
          ...event,
          image: event.image ?? event.imageUrl ?? null,
        }));
        const sorted = [...processedEvents].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setEvents(sorted);
        setLocalEvents(sorted);
        setCached(CACHE_KEYS.EVENTS, sorted);
      }
    } catch (err: any) {
      if (!showRefreshing && !getCached<Event[]>(CACHE_KEYS.EVENTS)) {
        console.error("Failed to load events:", err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-scroll to active tab
  useEffect(() => {
    const scrollToActive = () => {
      if (!filterScrollRef.current) return;
      const layout = tabLayoutsRef.current[activeFilter];
      const idx = DATE_FILTER_OPTIONS.findIndex((f) => f.key === activeFilter);
      const padding = 12;
      let scrollX = 0;

      if (layout && typeof layout.x === "number") {
        scrollX = Math.max(0, layout.x - padding);
      } else if (idx >= 0) {
        scrollX = Math.max(0, idx * 80 - padding);
      }

      filterScrollRef.current.scrollTo({ left: scrollX, behavior: "smooth" });
    };

    setTimeout(scrollToActive, 0);
    setTimeout(scrollToActive, 80);
    setTimeout(scrollToActive, 200);
  }, [activeFilter]);

  // Filter events based on active filter
  const filteredEvents = useMemo(() => {
    return events.filter((e) => eventMatchesDateFilter(e, activeFilter));
  }, [events, activeFilter]);

  const handleRefresh = async () => {
    await loadEvents(true);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Mobile Layout */}
      <div className="sm:hidden flex flex-col flex-1">
        {/* Fixed Header */}
        <header
          className="border-b border-gray-200 bg-white sticky top-0 z-10"
          style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
        >
          <div className="flex flex-row items-center">
            {/* Date Filter Tabs Row */}
            <div className="flex-1 overflow-hidden">
              <div
                ref={filterScrollRef}
                className="flex gap-1.5 overflow-x-auto scrollbar-hide px-3 pb-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {/* Back Button - Inside tabs row, on the left */}
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="p-2.5 flex items-center justify-center flex-shrink-0 -ml-1"
                  style={{ paddingLeft: "6px", paddingRight: "6px" }}
                  aria-label="Back"
                >
                  <span className="text-gray-900 text-xl font-medium">&lt;</span>
                </button>

                {DATE_FILTER_OPTIONS.map((filter) => {
                  const isActive = activeFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setActiveFilter(filter.key)}
                      ref={(el) => {
                        if (el && filterScrollRef.current) {
                          const rect = el.getBoundingClientRect();
                          const containerRect = filterScrollRef.current.getBoundingClientRect();
                          tabLayoutsRef.current[filter.key] = {
                            x: rect.left - containerRect.left,
                            width: rect.width,
                          };
                        }
                      }}
                      className={`whitespace-nowrap rounded-sm px-2.5 py-1 text-sm font-semibold transition-all ${
                        isActive
                          ? "text-primary border-b-2 border-primary"
                          : "text-gray-500"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Events List */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: "calc(76px + env(safe-area-inset-bottom))",
          }}
        >
          {loading ? (
            <div className="px-3 pt-4">
              <div className="grid grid-cols-2 gap-0.5">
                <EventCardSkeletonList count={6} />
              </div>
            </div>
          ) : (
            <>
              {/* Header Title */}
              <div className="px-3 mb-4 mt-2">
                <h1 className="text-gray-900 text-xl font-bold">
                  {DATE_FILTER_HEADINGS[activeFilter]}
                </h1>
              </div>

              {/* Events Grid */}
              {filteredEvents.length === 0 ? (
                <div className="px-3 py-14 flex items-center justify-center">
                  <p className="text-[#6B7280] text-sm text-center">
                    No events match this date filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-0.5 px-0.5">
                  {filteredEvents.map((event) => (
                    <EventCard key={event._id} event={event} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          {/* Fixed Header */}
          <header className="border-b border-gray-200 bg-white mb-6">
            <div className="flex flex-row items-center">
              {/* Date Filter Tabs Row – same design as home page tabs */}
              <div className="flex-1 overflow-hidden">
                <div
                  ref={filterScrollRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-200 pb-2"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {/* Back Button - Inside tabs row, on the left */}
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="p-2.5 flex items-center justify-center flex-shrink-0"
                    style={{ paddingLeft: "10px", paddingRight: "10px" }}
                  >
                    <span className="text-gray-900 text-xl font-medium">&lt;</span>
                  </button>

                  {DATE_FILTER_OPTIONS.map((filter) => {
                    const isActive = activeFilter === filter.key;
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => setActiveFilter(filter.key)}
                        ref={(el) => {
                          if (el && filterScrollRef.current) {
                            const rect = el.getBoundingClientRect();
                            const containerRect = filterScrollRef.current.getBoundingClientRect();
                            tabLayoutsRef.current[filter.key] = {
                              x: rect.left - containerRect.left,
                              width: rect.width,
                            };
                          }
                        }}
                        className={`whitespace-nowrap rounded-sm px-2.5 py-1 text-sm font-semibold transition-all ${
                          isActive
                            ? "text-primary border-b-2 border-primary"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </header>

          {/* Header Title */}
          <div className="mb-6">
            <h1 className="text-gray-900 text-2xl font-bold">
              {DATE_FILTER_HEADINGS[activeFilter]}
            </h1>
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              <EventCardSkeletonList count={8} />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-14 flex items-center justify-center">
              <p className="text-[#6B7280] text-base text-center">
                No events match this date filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

