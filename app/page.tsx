"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiMapPin } from "react-icons/fi";
import { EventCard } from "../components/EventCard";
import { EventCardSkeletonList } from "../components/EventCardSkeleton";
import { eventsAPI, type Event } from "../lib/api/events";
import { getEventImageUrl, FALLBACK_IMAGE } from "../lib/utils/images";
import { useAppStore } from "../store/useAppStore";
import { authAPI } from "../lib/api/auth";

type HomeFilter = "explore" | "following" | "today" | "upcoming";

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isSameWeek = (date1: Date, date2: Date): boolean => {
  const weekStart1 = new Date(date1);
  weekStart1.setDate(date1.getDate() - date1.getDay());
  weekStart1.setHours(0, 0, 0, 0);

  const weekStart2 = new Date(date2);
  weekStart2.setDate(date2.getDate() - date2.getDay());
  weekStart2.setHours(0, 0, 0, 0);

  return weekStart1.getTime() === weekStart2.getTime();
};

const isSameMonth = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday (0) or Saturday (6)
};

const getWeekStart = (date: Date): Date => {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const getWeekendDates = (weekStart: Date): { saturday: Date; sunday: Date } => {
  const saturday = new Date(weekStart);
  saturday.setDate(weekStart.getDate() + 6); // Saturday
  const sunday = new Date(weekStart);
  sunday.setDate(weekStart.getDate() + 7); // Sunday
  return { saturday, sunday };
};

const getJoinedEventIds = (user: any): string[] => {
  if (!user?.joinedEvents || !Array.isArray(user.joinedEvents)) return [];
  return user.joinedEvents
    .map((j: any) => (typeof j === 'string' ? j : j?.event?._id || j?.event?.id))
    .filter(Boolean);
};

function eventMatchesFilter(
  event: Event,
  filter: HomeFilter,
  userId?: string,
  joinedEventIds?: string[]
): boolean {
  // Explore: show all events
  if (filter === "explore") return true;
  
  // Following: only joined events
  if (filter === "following") {
    if (!joinedEventIds?.length) return false;
    const eventId = event._id || (event as any).id;
    return joinedEventIds.includes(eventId);
  }
  
  // Today: same day as today
  if (filter === "today") {
    const parts = event.date.split("-").map(Number);
    const eventDate = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    eventDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isSameDay(eventDate, today);
  }
  
  // Upcoming: handled on separate page
  return true;
}

const FILTER_OPTIONS: { key: HomeFilter; label: string }[] = [
  { key: 'explore', label: 'Explore' },
  { key: 'following', label: 'Following' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
];

export default function HomePage() {
  const router = useRouter();
  const setEvents = useAppStore((state) => state.setEvents);
  const user = useAppStore((state) => state.user);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [featured, setFeatured] = useState<Event[]>([]);
  const [upcoming, setUpcoming] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [imageKey, setImageKey] = useState(0); // Force image reload
  const [activeFilter, setActiveFilter] = useState<HomeFilter>("explore");
  const [backgroundFetching, setBackgroundFetching] = useState(false);
  const [joinedEventIds, setJoinedEventIds] = useState<string[]>([]);
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  // Load joined events from existing user data (don't call API again)
  useEffect(() => {
    if (!user?._id) {
      setJoinedEventIds([]);
      return;
    }
    // Use existing user data instead of calling API again
    const joinedIds = getJoinedEventIds(user);
    setJoinedEventIds(joinedIds);
  }, [user?._id]);

  useEffect(() => {
    const load = async (isBackground = false) => {
      try {
        if (!isBackground) {
          setLoading(true);
        } else {
          setBackgroundFetching(true);
        }
        setError(null);
        const response = await eventsAPI.getApprovedEvents();
        if (response.success && response.events) {
          // Process events and ensure images are properly set (image/imageUrl)
          const processedEvents = response.events.map((event: any) => ({
            ...event,
            image: event.image ?? event.imageUrl ?? null
          }));

          const sorted = [...processedEvents].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          setEvents(sorted);
          setAllEvents(sorted);
          setUpcoming(sorted);
          setFeatured(sorted.slice(0, Math.min(5, sorted.length)));
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to load events."
        );
      } finally {
        if (!isBackground) {
          setLoading(false);
        } else {
          setBackgroundFetching(false);
        }
      }
    };
    void load();
  }, [setEvents]);

  // Auto-slide featured event every 2 seconds
  useEffect(() => {
    if (featured.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveFeaturedIndex((prev) => {
        const next = prev + 1 >= featured.length ? 0 : prev + 1;
        // Force image reload by updating key
        setImageKey((k) => k + 1);
        return next;
      });
    }, 2000);

    return () => window.clearInterval(id);
  }, [featured.length]);

  // Update image key when manually changing featured index
  useEffect(() => {
    setImageKey((k) => k + 1);
  }, [activeFeaturedIndex]);

  // Auto-scroll to active tab
  useEffect(() => {
    const scrollToActive = () => {
      if (!filterScrollRef.current) return;
      const layout = tabLayoutsRef.current[activeFilter];
      const idx = FILTER_OPTIONS.findIndex((f) => f.key === activeFilter);
      const padding = 12;
      let scrollX = 0;
      
      if (layout && typeof layout.x === 'number') {
        scrollX = Math.max(0, layout.x - padding);
      } else if (idx >= 0) {
        scrollX = Math.max(0, idx * 80 - padding);
      }
      
      filterScrollRef.current.scrollTo({ left: scrollX, behavior: 'smooth' });
    };
    
    // Multiple retries for layout timing
    setTimeout(scrollToActive, 0);
    setTimeout(scrollToActive, 80);
    setTimeout(scrollToActive, 200);
  }, [activeFilter]);

  // Filter events based on active filter
  const filteredEvents = useMemo(() => {
    if (activeFilter === "upcoming") return allEvents;
    return allEvents.filter((event) =>
      eventMatchesFilter(event, activeFilter, user?._id, joinedEventIds)
    );
  }, [allEvents, activeFilter, user?._id, joinedEventIds]);

  const handleFilterClick = (key: HomeFilter) => {
    if (key === 'upcoming') {
      router.push('/event-filter');
    } else {
      setActiveFilter(key);
    }
  };

  const hasEvents = useMemo(() => filteredEvents.length > 0, [filteredEvents.length]);

  if (loading) {
    return (
      <div className="bg-white">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
          <section className="mb-10">
            <div className="mb-4 h-80 w-full animate-pulse rounded-2xl bg-[#1F2937]" />
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-2 w-2 rounded-full bg-[#4B5563]" />
              ))}
            </div>
          </section>
          <section>
            <div className="mb-4">
              <div className="mb-2 h-6 w-48 animate-pulse rounded bg-[#1F2937]" />
              <div className="h-4 w-64 animate-pulse rounded bg-[#1F2937]" />
            </div>
            <div className="rounded-2xl bg-gradient-to-b from-surface/70 via-[#050509] to-black/60 p-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <EventCardSkeletonList count={6} />
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-4">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-base font-semibold text-error">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Fixed Filter Bar - Mobile Only (as per Mobile App Design Guide) */}
      <header 
        className="fixed top-0 left-0 right-0 z-10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.1)] sm:hidden overflow-hidden"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}
      >
        {/* Filter Tabs */}
        <div 
          ref={filterScrollRef}
          className="flex overflow-x-auto px-3 pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-1.5">
            {FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => handleFilterClick(filter.key)}
                  ref={(el) => {
                    if (el && filterScrollRef.current) {
                      const rect = el.getBoundingClientRect();
                      const containerRect = filterScrollRef.current.getBoundingClientRect();
                      tabLayoutsRef.current[filter.key] = {
                        x: rect.left - containerRect.left,
                        width: rect.width
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
        
        {/* Loading Line (Background Fetch Indicator) */}
        {backgroundFetching && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 overflow-hidden">
            <div className="h-full bg-primary animate-loading-line" style={{ width: '40%' }} />
          </div>
        )}
      </header>

      {/* Desktop Layout - Unchanged */}
      <div className="hidden sm:block mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <section className="mb-4">
          <div className="flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Discover events
            </h1>
            <Link
              href="/explore"
              className="w-full rounded-xl bg-gray-50 px-4 py-2 text-sm text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 hover:text-gray-900 sm:w-auto"
            >
              Search by event
            </Link>
          </div>
        </section>

        {/* Desktop Featured Section */}
        {featured.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
              Featured
            </h2>
            <div className="relative flex flex-col items-center gap-4">
              {/* Hero featured event - full width with glass overlay */}
              <div className="w-full">
                {featured[activeFeaturedIndex] && (
                  <div 
                    key={`hero-${featured[activeFeaturedIndex]._id}-${activeFeaturedIndex}-${imageKey}`} 
                    className="relative w-full overflow-hidden rounded-2xl bg-black/40 shadow-lg backdrop-blur-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={`img-${featured[activeFeaturedIndex]._id}-${activeFeaturedIndex}-${imageKey}-${Date.now()}`}
                      src={
                        featured[activeFeaturedIndex]
                          ? getEventImageUrl(featured[activeFeaturedIndex] as any).replace(
                              /w=800$/,
                              "w=1200"
                            )
                          : FALLBACK_IMAGE.replace("w=800", "w=1200")
                      }
                      alt={featured[activeFeaturedIndex]?.title || "Event"}
                      className="h-72 w-full object-cover sm:h-80 transition-opacity duration-500"
                      loading="eager"
                      onError={(e) => {
                        // Fallback to default image if error
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes("unsplash.com")) {
                          target.src =
                            "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200";
                        }
                      }}
                    />

                    {/* Date badge */}
                    <div className="absolute right-4 top-4 min-w-[56px] rounded-xl bg-danger px-3 py-2 text-center shadow-md">
                      <p className="text-[11px] font-semibold uppercase text-white">
                        {new Date(
                          featured[activeFeaturedIndex].date
                        ).toLocaleString("default", { month: "short" })}
                      </p>
                      <p className="text-lg font-bold text-white leading-tight">
                        {new Date(
                          featured[activeFeaturedIndex].date
                        ).getDate()}
                      </p>
                    </div>

                    {/* Bottom black glass overlay with event info */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 px-6 py-4 backdrop-blur-md">
                      <h3 className="line-clamp-1 text-lg font-semibold text-white sm:text-xl">
                        {featured[activeFeaturedIndex].title}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-300 sm:text-sm">
                        <span className="text-primary">
                          <FiMapPin size={14} />
                        </span>
                        <span className="line-clamp-1">
                          {featured[activeFeaturedIndex].location}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Slider dots */}
              <div className="flex items-center justify-center gap-2">
                {featured.map((event, index) => (
                  <button
                    key={event._id}
                    type="button"
                    onClick={() => {
                      setActiveFeaturedIndex(index);
                      setImageKey((k) => k + 1); // Force image reload
                    }}
                    className={`h-2 rounded-full transition-all ${
                      index === activeFeaturedIndex
                        ? "w-5 bg-white"
                        : "w-2 bg-[#4B5563]"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Desktop Filter and Events Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeFilter === "explore" ? "Explore Events" : 
                 activeFilter === "following" ? "Following" :
                 activeFilter === "today" ? "Today's Events" :
                 "Upcoming events"}
              </h2>
              <p className="text-xs text-gray-600">
                {activeFilter === "explore" ? "All events happening in your network" :
                 activeFilter === "following" ? "Events you've joined" :
                 activeFilter === "today" ? "Events happening today" :
                 "Handpicked events happening in your network"}
              </p>
            </div>
          </div>

          {/* Desktop Filter Bar - All filters in one row */}
          <div className="mb-4 relative">
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              {FILTER_OPTIONS.map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => handleFilterClick(filter.key)}
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
            
            {/* Loading Line (Background Fetch Indicator) */}
            {backgroundFetching && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 overflow-hidden">
                <div className="h-full bg-primary animate-loading-line" style={{ width: '40%' }} />
              </div>
            )}
          </div>
          {!hasEvents ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-600">
              {activeFilter === "following" 
                ? "You haven't joined any events yet."
                : activeFilter === "today"
                ? "No events today."
                : "No events available yet."}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile Content Area - with padding for fixed header and tab bar */}
      <main 
        className="sm:hidden"
        style={{ 
          paddingTop: 'calc(60px + env(safe-area-inset-top))', 
          paddingBottom: 'calc(76px + env(safe-area-inset-bottom))',
          paddingLeft: '2px',
          paddingRight: '2px'
        }}
      >
        {/* Page Heading */}
        <h1 className="px-3 mb-4 text-xl font-bold text-gray-900">
          {activeFilter === "explore" ? "Explore Events" : 
           activeFilter === "following" ? "Following" :
           activeFilter === "today" ? "Today's Events" :
           "All Events"}
        </h1>

        {/* Mobile Event Grid - 2 columns as per Mobile App Design Guide */}
        {!hasEvents ? (
          <div className="flex flex-col items-center justify-center py-14 px-3 text-center">
            {activeFilter === "following" ? (
              <>
                <div className="text-5xl text-gray-400 mb-3">📅</div>
                <p className="text-base font-medium text-gray-500 mb-1">You haven't joined any events yet.</p>
                <p className="text-sm text-gray-600 mb-6 px-3">
                  Start exploring events and join the ones you're interested in.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter("explore")}
                  className="bg-primary text-white px-8 py-4 rounded-xl text-base font-semibold"
                >
                  Explore events
                </button>
              </>
            ) : activeFilter === "today" ? (
              <>
                <div className="text-5xl text-gray-400 mb-3">📅</div>
                <p className="text-base font-medium text-gray-500 mb-1">No events today</p>
                <p className="text-sm text-gray-600 mb-6 px-3">
                  There are no events scheduled for today. Check out upcoming events!
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl text-gray-400 mb-3">📅</div>
                <p className="text-base font-medium text-gray-500 mb-1">No data found</p>
                <p className="text-sm text-gray-600 mb-6 px-3">
                  No events available yet.
                </p>
              </>
            )}
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



