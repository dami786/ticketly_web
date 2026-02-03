"use client";

/**
 * EventDetailsSkeleton – full-page placeholder for event detail / edit event.
 * Used on: Event Detail (/events/[id]), Edit Event (/edit-event/[id]) – mobile + desktop same layout.
 * Gray theme: #F3F4F6 (gray-100), #E5E7EB (gray-200). Pulse: 0.35 → 0.65, 1.6s ease-in-out infinite.
 */
export function EventDetailsSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-white">
      {/* Header image: 300px */}
      <div className="w-full h-[300px] bg-[#F3F4F6] skeleton-pulse" />

      {/* Card: rounded top 24px, margin-top -20px, border */}
      <div className="w-full bg-white rounded-t-3xl -mt-5 px-3 pt-3 pb-4 border border-[#E5E7EB] border-b-0">
        {/* Title + Like row */}
        <div className="flex justify-between items-center mb-5">
          <div className="h-7 w-3/4 max-w-[75%] rounded-md bg-[#F3F4F6] skeleton-pulse" />
          <div className="w-14 h-9 rounded-xl bg-[#F3F4F6] skeleton-pulse flex-shrink-0" />
        </div>

        {/* Info row 1 (date) */}
        <div className="flex items-start mb-5">
          <div className="w-5 h-5 rounded bg-[#F3F4F6] skeleton-pulse mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 w-[40%] rounded bg-[#F3F4F6] skeleton-pulse mb-2" />
            <div className="h-3.5 w-[70%] rounded bg-[#E5E7EB] skeleton-pulse" />
          </div>
        </div>

        {/* Info row 2 (location) */}
        <div className="flex items-start mb-5">
          <div className="w-5 h-5 rounded bg-[#F3F4F6] skeleton-pulse mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 w-[40%] rounded bg-[#F3F4F6] skeleton-pulse mb-2" />
            <div className="h-3.5 w-[70%] rounded bg-[#E5E7EB] skeleton-pulse" />
          </div>
        </div>

        {/* Info row 3 (price) */}
        <div className="flex items-start mb-5">
          <div className="w-5 h-5 rounded bg-[#F3F4F6] skeleton-pulse mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 w-[40%] rounded bg-[#F3F4F6] skeleton-pulse mb-2" />
            <div className="h-3.5 w-[70%] rounded bg-[#E5E7EB] skeleton-pulse" />
          </div>
        </div>

        {/* Register button */}
        <div className="h-[52px] w-full rounded-xl bg-[#F3F4F6] skeleton-pulse mt-2" />
      </div>

      {/* Description section */}
      <div className="p-5 border-t border-[#E5E7EB]">
        <div className="h-6 w-1/2 max-w-[50%] rounded-md bg-[#F3F4F6] skeleton-pulse mb-3" />
        <div className="h-3.5 w-full rounded bg-[#E5E7EB] skeleton-pulse mb-2" />
        <div className="h-3.5 w-[90%] rounded bg-[#E5E7EB] skeleton-pulse mb-2" />
        <div className="h-3.5 w-[65%] rounded bg-[#E5E7EB] skeleton-pulse" />
      </div>
    </div>
  );
}
