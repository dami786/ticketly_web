import React from "react";

interface TicketPreviewProps {
  eventName: string;
  // Simple solid background (legacy usage)
  backgroundColor?: string;
  // Advanced theme options (used by Event Ticket Theme page)
  gradientStart?: string;
  gradientEnd?: string;
  textColor?: string;
  accentColor?: string;
  brandColor?: string;
}

export const TicketPreview: React.FC<TicketPreviewProps> = ({
  eventName,
  backgroundColor,
  gradientStart,
  gradientEnd,
  textColor = "#ffffff"
}) => {
  const hasGradient = gradientStart && gradientEnd;

  return (
    <div
      className="rounded-xl p-6 shadow-lg border-2 border-gray-100 transition-colors duration-300"
      style={{
        backgroundColor: hasGradient ? undefined : backgroundColor || "#111827",
        backgroundImage: hasGradient
          ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
          : undefined,
        color: textColor
      }}
    >
      <div className="flex items-center justify-center mb-3">
        <span className="text-4xl">🎫</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold opacity-80">EVENT TICKET</p>
        <p className="text-lg font-bold truncate mt-1">{eventName}</p>
      </div>
    </div>
  );
};
