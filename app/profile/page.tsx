"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FiCamera, FiMenu } from "react-icons/fi";
import { EventCard } from "../../components/EventCard";
import { authAPI } from "../../lib/api/auth";
import { eventsAPI } from "../../lib/api/events";
import { useAppStore } from "../../store/useAppStore";

type TabKey = "created" | "joined" | "liked";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);

  const [createdEvents, setCreatedEvents] = useState<any[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
  const [likedEvents, setLikedEvents] = useState<any[]>([]);
  const [joinedEventsData, setJoinedEventsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("created");

  const loadProfile = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await authAPI.getProfile();
      if (response.success && response.user) {
        // Normalize created events
        if (
          Array.isArray(response.user.createdEvents) &&
          response.user.createdEvents.length > 0 &&
          typeof response.user.createdEvents[0] === "object"
        ) {
          setCreatedEvents(response.user.createdEvents);
        } else {
          // fallback to API
          const myEvents = await eventsAPI.getMyEvents();
          if (myEvents.success && myEvents.events) {
            setCreatedEvents(myEvents.events);
          }
        }

        // Normalize joined events
        if (
          Array.isArray(response.user.joinedEvents) &&
          response.user.joinedEvents.length > 0 &&
          typeof response.user.joinedEvents[0] === "object" &&
          (response.user.joinedEvents[0] as any).event
        ) {
          const joinedFull = response.user.joinedEvents as any[];
          setJoinedEventsData(joinedFull);
          setJoinedEvents(
            joinedFull
              .map((item) => item.event)
              .filter((e) => Boolean(e))
          );
        } else {
          setJoinedEventsData([]);
          setJoinedEvents([]);
        }

        // Normalize liked events
        if (
          Array.isArray(response.user.likedEvents) &&
          response.user.likedEvents.length > 0 &&
          typeof response.user.likedEvents[0] === "object"
        ) {
          setLikedEvents(response.user.likedEvents as any[]);
        } else {
          setLikedEvents([]);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadProfile();
  }, [user?._id]);

  const createdCount = createdEvents.length;
  const joinedCount = joinedEventsData.length;
  const likedCount = likedEvents.length;

  const eventsToRender = useMemo(() => {
    switch (activeTab) {
      case "created":
        return createdEvents;
      case "joined":
        return joinedEvents;
      case "liked":
        return likedEvents;
      default:
        return [];
    }
  }, [activeTab, createdEvents, joinedEvents, likedEvents]);

  if (!user) {
    return (
      <div className="bg-background">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <h1 className="mb-3 text-2xl font-bold text-white">
            Welcome to Ticketly
          </h1>
          <p className="mb-6 text-sm text-mutedLight">
            Login to create events, register for events, and manage your profile.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/profile")}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Login / Sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-white shadow-lg"
            aria-label="Open settings"
          >
            <FiMenu size={20} />
          </button>
        </div>

        <section className="mb-6 text-center">
          <div className="relative mx-auto mb-4 h-24 w-24">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-accent text-4xl font-bold text-white">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-background text-accent shadow-lg ring-2 ring-background"
              aria-label="Change profile photo"
            >
              <FiCamera size={16} />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
          {user.companyName && (
            <p className="mt-1 text-sm font-semibold text-accent">
              {user.companyName}
            </p>
          )}
        </section>

        <section className="mb-6 flex justify-around text-center text-sm">
          <div>
            <div className="text-2xl font-bold text-white">
              {createdCount}
            </div>
            <div className="text-xs text-mutedLight">Created</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {joinedCount}
            </div>
            <div className="text-xs text-mutedLight">Joined</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {likedCount}
            </div>
            <div className="text-xs text-mutedLight">Liked</div>
          </div>
        </section>

        <section className="mb-5 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("created")}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
              activeTab === "created"
                ? "bg-accent text-white"
                : "bg-surface text-mutedLight"
            }`}
          >
            Created events
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("joined")}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
              activeTab === "joined"
                ? "bg-accent text-white"
                : "bg-surface text-mutedLight"
            }`}
          >
            Joined events
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("liked")}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
              activeTab === "liked"
                ? "bg-accent text-white"
                : "bg-surface text-mutedLight"
            }`}
          >
            Liked events
          </button>
        </section>

        <section className="mb-8 min-h-[120px]">
          {loading ? (
            <div className="py-10 text-center text-sm text-mutedLight">
              Loading…
            </div>
          ) : eventsToRender.length === 0 ? (
            <div className="py-10 text-center text-sm text-mutedLight">
              {activeTab === "created" && "No events created yet."}
              {activeTab === "joined" && "No events joined yet."}
              {activeTab === "liked" && "No events liked yet."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:flex md:flex-wrap md:justify-between md:gap-y-4">
              {eventsToRender.map((event: any) => {
                const id = event._id ?? event.id;
                const href =
                  activeTab === "created"
                    ? `/created-events/${id}`
                    : `/events/${id}`;
                return (
                  <EventCard key={id} event={event} href={href} />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


