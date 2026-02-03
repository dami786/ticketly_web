"use client";

import React from "react";
import type { TicketTheme } from "../lib/ticketTheme";
import {
  mergeTicketTheme,
  formatDateShort,
  getStatusColor,
  getStatusBgColor,
  getStatusText,
} from "../lib/ticketTheme";
import { getEventImageUrl } from "../lib/utils/images";
import { BackgroundPattern } from "./BackgroundPattern";

/** Default sample data when preview=true and event is minimal */
const PREVIEW_USERNAME = "hamzaaliabbasi3237";
const PREVIEW_EMAIL = "hamzaaliabbasi3237@gmail.com";
const PREVIEW_STATUS = "payment_in_review";
const PREVIEW_EVENT = {
  title: "MUSIC FESTIVAL 2026",
  description: "Join us for an unforgettable night at F-9 Park fea...",
  location: "F-9 Park, Islamabad, Islamabd",
  date: "2026-02-28",
  time: "18:00",
  price: 3000,
};

interface TicketPreviewProps {
  eventName?: string;
  backgroundColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  textColor?: string;
  accentColor?: string;
  brandColor?: string;
  theme?: Partial<TicketTheme>;
  event?: {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    image?: string;
    imageUrl?: string;
    ticketPrice?: number;
    [key: string]: unknown;
  };
  preview?: boolean;
  /** Real ticket mode: user, email, status, accessKey, createdAt */
  username?: string;
  email?: string;
  status?: string;
  accessKey?: string;
  createdAt?: string;
}

export const TicketPreview: React.FC<TicketPreviewProps> = ({
  eventName,
  backgroundColor,
  gradientStart: gs,
  gradientEnd: ge,
  textColor: tc,
  accentColor: ac,
  brandColor: bc,
  theme: themePartial,
  event: eventObj,
  preview = false,
  username: propUsername,
  email: propEmail,
  status: propStatus,
  accessKey,
  createdAt,
}) => {
  const t = themePartial ? mergeTicketTheme(themePartial) : null;
  const gradientStart = t?.gradientStart ?? gs ?? "#111827";
  const gradientEnd = t?.gradientEnd ?? ge ?? "#1F2937";
  const primaryTextColor = t?.primaryTextColor ?? tc ?? "#ffffff";
  const accentColorVal = t?.accentColor ?? ac ?? "#DC2626";
  const brandColorVal = t?.brandColor ?? bc ?? "#DC2626";
  const gradientDirection = t?.gradientDirection ?? "to right bottom";
  const backgroundElement = t?.backgroundElement ?? "none";
  const patternWeight = t?.patternWeight ?? "medium";

  const ev = eventObj ?? {};
  const title = (ev.title ?? eventName ?? PREVIEW_EVENT.title) as string;
  const description = (ev.description ?? PREVIEW_EVENT.description) as string;
  const location = (ev.location ?? PREVIEW_EVENT.location) as string;
  const date = (ev.date ?? PREVIEW_EVENT.date) as string;
  const time = (ev.time ?? PREVIEW_EVENT.time) as string;
  const price = typeof ev.ticketPrice === "number" ? ev.ticketPrice : (ev.ticketPrice ?? PREVIEW_EVENT.price) as number;

  const username = preview ? PREVIEW_USERNAME : (propUsername ?? PREVIEW_USERNAME);
  const email = preview ? PREVIEW_EMAIL : (propEmail ?? PREVIEW_EMAIL);
  const status = preview ? PREVIEW_STATUS : (propStatus ?? "payment_in_review");

  const eventImageUrl = eventObj ? getEventImageUrl(eventObj as any) : null;
  const isGradientWhite =
    gradientStart?.toLowerCase().replace("#", "") === "ffffff" ||
    gradientStart?.toLowerCase().replace("#", "") === "fff";
  const overlayColor = isGradientWhite
    ? `${accentColorVal}1F`
    : "rgba(255,255,255,0.08)";

  const hasGradient = gradientStart && gradientEnd;
  const statusColor = getStatusColor(status);
  const statusBg = getStatusBgColor(status);
  const statusText = getStatusText(status);
  const showRealQR = !preview && status === "confirmed" && !!accessKey;

  return (
    <div
      className="rounded-xl overflow-hidden border border-[#E5E7EB] transition-all duration-300 relative"
      style={{
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
      }}
    >
      <div
        className="relative rounded-[12px] p-4 min-h-[320px]"
        style={{
          backgroundColor: hasGradient ? undefined : backgroundColor || "#111827",
          backgroundImage: hasGradient
            ? `linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd})`
            : undefined,
          color: primaryTextColor,
        }}
      >
        <BackgroundPattern
          element={backgroundElement}
          patternWeight={patternWeight}
          overlayColor={overlayColor}
        />

        {/* Header row: event image 56×56 + right: ticketly, title, description */}
        <div className="flex items-start gap-3 mb-3 relative z-10">
          {eventImageUrl ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={eventImageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center border text-xs font-medium"
              style={{
                backgroundColor: `${accentColorVal}15`,
                borderColor: `${accentColorVal}40`,
                color: primaryTextColor,
              }}
            >
              IMG
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="text-lg font-bold tracking-wide mb-0.5"
              style={{ color: brandColorVal }}
            >
              ticketly
            </p>
            <p className="text-lg font-bold truncate leading-tight" style={{ color: primaryTextColor }}>
              {title}
            </p>
            <p
              className="text-[11px] mt-0.5 line-clamp-2 opacity-90"
              style={{ color: primaryTextColor }}
            >
              {description}
            </p>
          </div>
        </div>

        {/* Divider: dashed, accentColor */}
        <div
          className="my-2.5 border-t-2 border-dashed relative z-10"
          style={{ borderColor: accentColorVal }}
        />

        {/* Event details: USER, EMAIL, LOCATION */}
        <div className="text-xs space-y-1 relative z-10" style={{ color: primaryTextColor }}>
          <p className="truncate">USER: {username}</p>
          <p className="truncate">EMAIL: {email}</p>
          <p className="truncate mt-1">LOCATION: {location}</p>
        </div>

        {/* Row: Date, Time, Price (left) | Status badge + QR (right) */}
        <div className="flex justify-between items-start gap-4 mt-3 relative z-10">
          <div className="text-xs leading-5" style={{ color: primaryTextColor }}>
            <p>• Date: {formatDateShort(date)}</p>
            <p>• Time: {time}</p>
            <p>• Price: {Number(price).toLocaleString()} PKR</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span
              className="px-2 py-1.5 rounded text-[10px] font-semibold border border-dashed"
              style={{
                backgroundColor: statusBg,
                borderColor: statusColor,
                color: statusColor,
                transform: "rotate(-8deg)",
              }}
            >
              {statusText}
            </span>
            {showRealQR ? (
              <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center text-black text-[8px]">
                QR
              </div>
            ) : (
              <div
                className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-lg border flex items-center justify-center text-[9px] text-center"
                style={{
                  backgroundColor: `${accentColorVal}15`,
                  borderColor: `${accentColorVal}40`,
                  color: primaryTextColor,
                }}
              >
                QR after payment confirm
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          className="my-2.5 border-t-2 border-dashed relative z-10"
          style={{ borderColor: accentColorVal }}
        />

        {/* Footer */}
        <div className="text-[10px] relative z-10" style={{ color: primaryTextColor, opacity: 0.8 }}>
          {createdAt && !preview ? (
            <p>{new Date(createdAt).toLocaleString()}</p>
          ) : showRealQR && accessKey ? (
            <p className="font-semibold" style={{ color: accentColorVal }}>
              ACCESS KEY: {accessKey}
            </p>
          ) : (
            <p className="italic">Access key is given after payment confirmed</p>
          )}
        </div>
      </div>
    </div>
  );
};
