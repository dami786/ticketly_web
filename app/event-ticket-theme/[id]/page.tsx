"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiCheck, FiDroplet } from "react-icons/fi";
import { eventsAPI, type Event } from "../../../lib/api/events";
import { useToast } from "../../../lib/hooks/useToast";
import { TicketPreview } from "../../../components/TicketPreview";
import { ColorPickerModal } from "../../../components/ColorPickerModal";

type PatternType =
  | "none"
  | "organic"
  | "fluid"
  | "grid"
  | "geometric"
  | "mesh"
  | "gradient_mesh"
  | "vector"
  | "dynamic";

interface TicketTheme {
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
  accentColor: string;
  brandColor: string;
  backgroundPattern: PatternType;
  patternWeight: number;
}

const DEFAULT_THEME: TicketTheme = {
  gradientStart: "#111827",
  gradientEnd: "#1F2937",
  textColor: "#FFFFFF",
  accentColor: "#F59E0B",
  brandColor: "#DC2626",
  backgroundPattern: "none",
  patternWeight: 3
};

const THEME_PRESETS: {
  id: string;
  name: string;
  description: string;
  theme: Partial<TicketTheme>;
}[] = [
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm & vibrant",
    theme: {
      gradientStart: "#FB923C",
      gradientEnd: "#DB2777",
      textColor: "#FFFFFF",
      accentColor: "#FBBF24",
      brandColor: "#DC2626"
    }
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool & calm",
    theme: {
      gradientStart: "#0EA5E9",
      gradientEnd: "#1D4ED8",
      textColor: "#FFFFFF",
      accentColor: "#A5B4FC",
      brandColor: "#2563EB"
    }
  },
  {
    id: "forest",
    name: "Forest",
    description: "Fresh & natural",
    theme: {
      gradientStart: "#16A34A",
      gradientEnd: "#166534",
      textColor: "#ECFDF3",
      accentColor: "#BBF7D0",
      brandColor: "#22C55E"
    }
  },
  {
    id: "royal",
    name: "Royal",
    description: "Dark & premium",
    theme: {
      gradientStart: "#0F172A",
      gradientEnd: "#312E81",
      textColor: "#E5E7EB",
      accentColor: "#FBBF24",
      brandColor: "#6366F1"
    }
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "High contrast",
    theme: {
      gradientStart: "#020617",
      gradientEnd: "#111827",
      textColor: "#F9FAFB",
      accentColor: "#4B5563",
      brandColor: "#EF4444"
    }
  }
];

type ColorKey = keyof Pick<
  TicketTheme,
  "gradientStart" | "gradientEnd" | "textColor" | "accentColor" | "brandColor"
>;

export default function EventTicketThemePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: showError } = useToast();

  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<TicketTheme>(DEFAULT_THEME);
  const [error, setError] = useState<string | null>(null);

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [activeColorKey, setActiveColorKey] = useState<ColorKey | null>(null);
  const [selectedColorForModal, setSelectedColorForModal] = useState("#DC2626");

  useEffect(() => {
    const load = async () => {
      if (!eventId) {
        setError("Event ID is required.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await eventsAPI.getEventById(String(eventId));
        if (response.success && response.event) {
          const e: any = response.event;
          setEvent(e);

          const existingTheme: Partial<TicketTheme> = e.ticketTheme || {};

          // If there was a simple ticket color before, map it into gradient
          const backgroundColor =
            e.ticket?.backgroundColor ||
            (existingTheme as any).backgroundColor ||
            undefined;

          const initial: TicketTheme = {
            ...DEFAULT_THEME,
            ...existingTheme
          };

          if (backgroundColor && !existingTheme.gradientStart && !existingTheme.gradientEnd) {
            initial.gradientStart = backgroundColor;
            initial.gradientEnd = backgroundColor;
          }

          setTheme(initial);
        } else {
          setError("Event not found.");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ??
            err?.response?.data?.error ??
            err?.message ??
            "Failed to load event."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [eventId]);

  const handleApplyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setTheme((prev) => ({
      ...prev,
      ...preset.theme,
      // keep pattern settings as-is
      backgroundPattern: prev.backgroundPattern,
      patternWeight: prev.patternWeight
    }));
  };

  const openColorPicker = (key: ColorKey) => {
    setActiveColorKey(key);
    setSelectedColorForModal(theme[key]);
    setColorPickerOpen(true);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColorForModal(color);
  };

  const handleSaveColor = () => {
    if (!activeColorKey) {
      setColorPickerOpen(false);
      return;
    }
    setTheme((prev) => ({
      ...prev,
      [activeColorKey]: selectedColorForModal
    }));
    setColorPickerOpen(false);
  };

  const handleCancelColorPicker = () => {
    setColorPickerOpen(false);
    setActiveColorKey(null);
  };

  const handleSaveTheme = async () => {
    if (!eventId) return;
    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        ticketTheme: theme
      };

      const response = await eventsAPI.updateEvent(String(eventId), payload);
      if (response.success) {
        success("Ticket theme updated successfully!");
        router.back();
      } else {
        const message = (response as any).message || "Failed to update ticket theme.";
        showError(message);
        setError(message);
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        "Failed to update ticket theme.";
      showError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-gray-600">Loading ticket theme…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4">
        <p className="mb-4 text-base font-semibold text-[#EF4444]">{error ?? "Event not found."}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C]"
        >
          Go back
        </button>
      </div>
    );
  }

  const patternOptions: { value: PatternType; label: string; description: string }[] = [
    { value: "none", label: "None", description: "Solid background only" },
    { value: "organic", label: "Organic", description: "Soft curves, music / social" },
    { value: "fluid", label: "Fluid", description: "Liquid shapes, lifestyle" },
    { value: "grid", label: "Grid", description: "Tech / structured" },
    { value: "geometric", label: "Geometric", description: "Bold shapes" },
    { value: "mesh", label: "Mesh", description: "Gradient mesh" },
    { value: "gradient_mesh", label: "Gradient Mesh", description: "Layered gradients" },
    { value: "vector", label: "Vector", description: "Clean vector lines" },
    { value: "dynamic", label: "Dynamic", description: "Animated / modern feel" }
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <header
        className="border-b border-gray-200"
        style={{ paddingTop: "52px" }}
      >
        <div className="mx-auto max-w-5xl px-4 pb-3 sm:px-6">
          <div className="flex flex-row items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="-ml-2 p-2"
            >
              <FiArrowLeft size={22} className="text-gray-900" />
            </button>
            <span className="text-xs font-medium text-gray-500">Ticket Theme</span>
            <div className="w-8" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            Event Ticket Theme
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Customize how tickets for{" "}
            <span className="font-semibold text-gray-800">{event.title}</span> look.
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-5 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Left: Preview + Presets */}
          <div>
            {/* Preview */}
            <section className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900">Preview</span>
                <span className="text-[11px] text-gray-500">Live ticket preview</span>
              </div>
              <TicketPreview
                eventName={event.title}
                gradientStart={theme.gradientStart}
                gradientEnd={theme.gradientEnd}
                textColor={theme.textColor}
              />
            </section>

            {/* Presets */}
            <section className="mb-5">
              <h2 className="mb-2 text-xs font-semibold text-gray-900">Presets</h2>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {THEME_PRESETS.map((preset) => {
                  const isActive =
                    theme.gradientStart === preset.theme.gradientStart &&
                    theme.gradientEnd === preset.theme.gradientEnd;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`min-w-[120px] rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                        isActive ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div
                        className="mb-2 h-7 w-full rounded-lg border border-white shadow-sm"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${
                            preset.theme.gradientStart || DEFAULT_THEME.gradientStart
                          }, ${preset.theme.gradientEnd || DEFAULT_THEME.gradientEnd})`
                        }}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-gray-900">
                          {preset.name}
                        </span>
                        {isActive && (
                          <FiCheck size={12} className="text-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Background pattern */}
            <section className="mb-5">
              <h2 className="mb-1 text-xs font-semibold text-gray-900">
                Background pattern
              </h2>
              <p className="mb-2 text-[11px] text-gray-500">
                Add subtle patterns to match the event style.
              </p>
              <div className="flex flex-wrap gap-2">
                {patternOptions.map((opt) => {
                  const isActive = theme.backgroundPattern === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setTheme((prev) => ({
                          ...prev,
                          backgroundPattern: opt.value
                        }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {theme.backgroundPattern !== "none" && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900">
                      Pattern weight
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {theme.patternWeight <= 1
                        ? "Very subtle"
                        : theme.patternWeight >= 4
                        ? "Bold"
                        : "Balanced"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    value={theme.patternWeight}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        patternWeight: Number(e.target.value)
                      }))
                    }
                    className="w-full accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                    <span>Softer</span>
                    <span>Thicker</span>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right: Customize colors */}
          <div>
            <section className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="mb-1 text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                <FiDroplet size={14} className="text-primary" />
                Customize colors
              </h2>
              <p className="mb-3 text-[11px] text-gray-500">
                Fine-tune gradient, text and accent colors used on the ticket.
              </p>

              <div className="space-y-2.5">
                {/* Gradient start */}
                <button
                  type="button"
                  onClick={() => openColorPicker("gradientStart")}
                  className="flex w-full flex-row items-center justify-between rounded-lg bg-white px-3 py-2 text-left shadow-sm border border-gray-200 hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-md border border-gray-200"
                      style={{ backgroundColor: theme.gradientStart }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-900">
                        Gradient start
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {theme.gradientStart}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">Tap to edit</span>
                </button>

                {/* Gradient end */}
                <button
                  type="button"
                  onClick={() => openColorPicker("gradientEnd")}
                  className="flex w-full flex-row items-center justify-between rounded-lg bg-white px-3 py-2 text-left shadow-sm border border-gray-200 hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-md border border-gray-200"
                      style={{ backgroundColor: theme.gradientEnd }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-900">
                        Gradient end
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {theme.gradientEnd}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">Tap to edit</span>
                </button>

                {/* Text color */}
                <button
                  type="button"
                  onClick={() => openColorPicker("textColor")}
                  className="flex w-full flex-row items-center justify-between rounded-lg bg-white px-3 py-2 text-left shadow-sm border border-gray-200 hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-md border border-gray-200"
                      style={{ backgroundColor: theme.textColor }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-900">
                        Text color
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {theme.textColor}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">Tap to edit</span>
                </button>

                {/* Accent color */}
                <button
                  type="button"
                  onClick={() => openColorPicker("accentColor")}
                  className="flex w-full flex-row items-center justify-between rounded-lg bg-white px-3 py-2 text-left shadow-sm border border-gray-200 hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-md border border-gray-200"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-900">
                        Accent color
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {theme.accentColor}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">Tap to edit</span>
                </button>

                {/* Brand color */}
                <button
                  type="button"
                  onClick={() => openColorPicker("brandColor")}
                  className="flex w-full flex-row items-center justify-between rounded-lg bg-white px-3 py-2 text-left shadow-sm border border-gray-200 hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-md border border-gray-200"
                      style={{ backgroundColor: theme.brandColor }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-gray-900">
                        Brand color
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {theme.brandColor}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">Tap to edit</span>
                </button>
              </div>
            </section>

            {/* Save button */}
            <section>
              {error && (
                <p className="mb-2 text-xs text-[#EF4444]">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleSaveTheme}
                disabled={saving}
                className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-white shadow-[0_2px_4px_rgba(220,38,38,0.3)] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Saving theme…</span>
                  </>
                ) : (
                  <span>Save theme</span>
                )}
              </button>
            </section>
          </div>
        </div>
      </div>

      {/* Color Picker Modal */}
      <ColorPickerModal
        isOpen={colorPickerOpen}
        eventName={event.title}
        currentColor={selectedColorForModal}
        onColorSelect={handleColorSelect}
        onSave={handleSaveColor}
        onCancel={handleCancelColorPicker}
        isSaving={false}
      />
    </div>
  );
}


