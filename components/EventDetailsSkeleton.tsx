"use client";

import { useEffect, useState } from "react";

export function EventDetailsSkeleton() {
  const [opacity, setOpacity] = useState(0.35);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity((prev) => {
        if (prev === 0.35) return 0.65;
        return 0.35;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 bg-white">
      {/* Header Image */}
      <div
        className="w-full h-[300px] bg-[#F3F4F6]"
        style={{ opacity }}
      />

      {/* Event Info Card */}
      <div className="bg-white rounded-t-3xl px-3 py-3 -mt-5 border-t border-l border-r border-gray-200">
        {/* Title + Like Row */}
        <div className="flex flex-row justify-between items-center mb-6">
          {/* Title Line */}
          <div
            className="h-7 w-3/4 rounded-md bg-[#F3F4F6]"
            style={{ opacity }}
          />
          {/* Like Button */}
          <div
            className="w-14 h-9 rounded-xl bg-[#F3F4F6]"
            style={{ opacity }}
          />
        </div>

        {/* Date & Time Row */}
        <div className="flex flex-row items-start mb-5">
          {/* Icon Box */}
          <div
            className="w-5 h-5 rounded bg-[#F3F4F6] mr-3 mt-0.5"
            style={{ opacity }}
          />
          {/* Info Content */}
          <div className="flex-1">
            {/* Label Line */}
            <div
              className="h-3 w-[40%] rounded bg-[#F3F4F6] mb-2"
              style={{ opacity }}
            />
            {/* Value Line */}
            <div
              className="h-3.5 w-[70%] rounded bg-[#E5E7EB]"
              style={{ opacity }}
            />
          </div>
        </div>

        {/* Location Row */}
        <div className="flex flex-row items-start mb-5">
          {/* Icon Box */}
          <div
            className="w-5 h-5 rounded bg-[#F3F4F6] mr-3 mt-0.5"
            style={{ opacity }}
          />
          {/* Info Content */}
          <div className="flex-1">
            {/* Label Line */}
            <div
              className="h-3 w-[40%] rounded bg-[#F3F4F6] mb-2"
              style={{ opacity }}
            />
            {/* Value Line */}
            <div
              className="h-3.5 w-[70%] rounded bg-[#E5E7EB]"
              style={{ opacity }}
            />
          </div>
        </div>

        {/* Price Row */}
        <div className="flex flex-row items-start mb-5">
          {/* Icon Box */}
          <div
            className="w-5 h-5 rounded bg-[#F3F4F6] mr-3 mt-0.5"
            style={{ opacity }}
          />
          {/* Info Content */}
          <div className="flex-1">
            {/* Label Line */}
            <div
              className="h-3 w-[40%] rounded bg-[#F3F4F6] mb-2"
              style={{ opacity }}
            />
            {/* Value Line */}
            <div
              className="h-3.5 w-[70%] rounded bg-[#E5E7EB]"
              style={{ opacity }}
            />
          </div>
        </div>

        {/* Register Button */}
        <div
          className="h-[52px] rounded-xl bg-[#F3F4F6] mt-2"
          style={{ opacity }}
        />
      </div>

      {/* Description Section */}
      <div className="p-5 border-t border-gray-200">
        {/* Section Title */}
        <div
          className="h-6 w-1/2 rounded-md bg-[#F3F4F6] mb-3"
          style={{ opacity }}
        />

        {/* Description Line 1 */}
        <div
          className="h-3.5 w-full rounded bg-[#E5E7EB] mb-2"
          style={{ opacity }}
        />

        {/* Description Line 2 */}
        <div
          className="h-3.5 w-[90%] rounded bg-[#E5E7EB] mb-2"
          style={{ opacity }}
        />

        {/* Description Line 3 */}
        <div
          className="h-3.5 w-[65%] rounded bg-[#E5E7EB]"
          style={{ opacity }}
        />
      </div>
    </div>
  );
}
