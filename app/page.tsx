"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FiMapPin } from "react-icons/fi";
import { EventCard } from "../components/EventCard";
import { eventsAPI, type Event } from "../lib/api/events";
import { getEventImageUrl, FALLBACK_IMAGE } from "../lib/utils/images";
import { useAppStore } from "../store/useAppStore";

export default function HomePage() {
  const setEvents = useAppStore((state) => state.setEvents);
  const [featured, setFeatured] = useState<Event[]>([]);
  const [upcoming, setUpcoming] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [imageKey, setImageKey] = useState(0); // Force image reload

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
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

  const hasEvents = useMemo(() => upcoming.length > 0, [upcoming.length]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto" />
          <p className="text-sm text-mutedLight">Loading events…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-base font-semibold text-danger">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <section className="mb-4">
          <div className="flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="hidden text-3xl font-bold text-white sm:block sm:text-4xl">
              Discover events
            </h1>
            <Link
              href="/explore"
              className="w-full rounded-xl bg-surface px-4 py-2 text-sm text-mutedLight ring-1 ring-border hover:text-white sm:w-auto"
            >
              Search by event
            </Link>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
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
                      <p className="mt-1 flex items-center gap-1 text-xs text-mutedLight sm:text-sm">
                        <span className="text-accent">
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

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Upcoming events
              </h2>
              <p className="text-xs text-mutedLight">
                Handpicked events happening in your network
              </p>
            </div>
          </div>
          {!hasEvents ? (
            <div className="rounded-2xl border border-dashed border-[#374151] bg-black/20 py-10 text-center text-sm text-mutedLight">
              No events available yet.
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-b from-surface/70 via-[#050509] to-black/60 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.55)] ring-1 ring-black/40">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {upcoming.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


