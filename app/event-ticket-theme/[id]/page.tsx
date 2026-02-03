"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiChevronRight } from "react-icons/fi";
import { eventsAPI, type Event } from "../../../lib/api/events";
import { useToast } from "../../../lib/hooks/useToast";
import {
  DEFAULT_TICKET_THEME,
  PRESET_THEMES,
  BACKGROUND_ELEMENTS,
  PATTERN_WEIGHTS,
  mergeTicketTheme,
  type TicketTheme,
  type BackgroundElement,
  type PatternWeight,
} from "../../../lib/ticketTheme";
import { TicketPreview } from "../../../components/TicketPreview";
import { ThemeColorPickerModal } from "../../../components/ThemeColorPickerModal";

const COLOR_KEYS: (keyof Pick<
  TicketTheme,
  "gradientStart" | "gradientEnd" | "primaryTextColor" | "accentColor" | "brandColor"
>)[] = [
  "gradientStart",
  "gradientEnd",
  "primaryTextColor",
  "accentColor",
  "brandColor",
];

const COLOR_LABELS: Record<string, string> = {
  gradientStart: "Gradient start",
  gradientEnd: "Gradient end",
  primaryTextColor: "Text color",
  accentColor: "Accent / divider / background",
  brandColor: "Brand / logo",
};

const PATTERN_WEIGHT_IDS: PatternWeight[] = [
  "sharper",
  "sharp",
  "thin",
  "medium",
  "thick",
  "thicker",
];

export default function EventTicketThemePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: showError } = useToast();

  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<Partial<TicketTheme>>({});
  const [error, setError] = useState<string | null>(null);

  const [editColorKey, setEditColorKey] = useState<keyof TicketTheme | null>(null);
  const [editHex, setEditHex] = useState("");

  const mergedTheme = mergeTicketTheme(theme);

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
          const e = response.event;
          setEvent(e);
          setTheme(e.ticketTheme ?? {});
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

  const handleApplyPreset = (preset: (typeof PRESET_THEMES)[number]) => {
    setTheme((prev) => ({
      ...prev,
      gradientStart: preset.gradientStart,
      gradientEnd: preset.gradientEnd,
      primaryTextColor: preset.primaryTextColor,
      accentColor: preset.accentColor,
      brandColor: preset.brandColor,
      gradientDirection: "to right bottom",
      backgroundElement: prev.backgroundElement ?? "none",
      patternWeight: prev.patternWeight ?? "medium",
    }));
  };

  const backgroundElementIndex = BACKGROUND_ELEMENTS.findIndex(
    (el) => el.id === (mergedTheme.backgroundElement ?? "none")
  );
  const patternIndex = PATTERN_WEIGHT_IDS.indexOf(mergedTheme.patternWeight ?? "medium");
  const currentPatternWeight = PATTERN_WEIGHTS.find((w) => w.id === (mergedTheme.patternWeight ?? "medium"));

  const openColorPicker = (key: keyof TicketTheme) => {
    setEditColorKey(key);
    const val = mergedTheme[key];
    setEditHex(typeof val === "string" ? val : "#FFFFFF");
  };

  const handleColorApply = (key: keyof TicketTheme, hex: string) => {
    setTheme((prev) => ({ ...prev, [key]: hex }));
    setEditColorKey(null);
    setEditHex("");
  };

  const handleSaveTheme = async () => {
    if (!eventId) return;
    try {
      setSaving(true);
      setError(null);
      const themeToSave = mergeTicketTheme(theme);
      const response = await eventsAPI.updateEvent(String(eventId), {
        ticketTheme: themeToSave,
      });
      if (response.success) {
        success("Ticket theme has been updated.");
        router.back();
      } else {
        const msg = (response as any).message || "Failed to save theme.";
        showError(msg);
        setError(msg);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        "Failed to save theme.";
      showError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="bg-white min-h-screen flex-1">
        {/* Ticket Theme page skeleton – §3: header + preview + presets placeholders */}
        <header className="border-b border-[#E5E7EB] px-3 pt-6 pb-2" style={{ paddingTop: "calc(0.375rem + 52px)" }}>
          <div className="flex flex-row items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-full bg-[#E5E7EB] skeleton-pulse" />
            <div className="w-32 h-4 rounded-full bg-[#E5E7EB] skeleton-pulse" />
            <div className="w-8 h-8 rounded-full bg-[#E5E7EB] skeleton-pulse" />
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="rounded-xl h-56 mb-4 bg-[#E5E7EB] skeleton-pulse" />
          <div className="h-3 w-24 rounded-full mb-2 bg-[#E5E7EB] skeleton-pulse" />
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-14 flex flex-col items-center flex-shrink-0">
                <div className="w-9 h-9 rounded-full mb-1 bg-[#E5E7EB] skeleton-pulse" />
                <div className="h-2 w-10 rounded-full bg-[#E5E7EB] skeleton-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <p className="mb-4 text-base font-semibold text-[#EF4444]">{error}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white"
        >
          Go back
        </button>
      </div>
    );
  }

  const currentBackgroundEl = BACKGROUND_ELEMENTS.find(
    (el) => el.id === (mergedTheme.backgroundElement ?? "none")
  );
  const patternSubtitle = currentBackgroundEl
    ? currentBackgroundEl.style
      ? `${currentBackgroundEl.name} (${currentBackgroundEl.style})`
      : currentBackgroundEl.name
    : "None";

  return (
    <div className="bg-white min-h-screen">
      {/* Header: Back | Title | Spacer */}
      <header
        className="border-b border-[#E5E7EB] px-3 pt-6 pb-2"
        style={{ paddingTop: "calc(0.375rem + 52px)", paddingBottom: "8px" }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2"
            aria-label="Back"
          >
            <FiArrowLeft size={22} className="text-gray-900" />
          </button>
          <h1 className="text-sm font-semibold text-[#111827]">Event Ticket Theme</h1>
          <div className="w-8" aria-hidden />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-24 pt-4">
        {/* Preview */}
        <section className="mb-4">
          <h2 className="text-xs font-semibold text-[#111827] mb-1">Preview</h2>
          <TicketPreview
            theme={mergedTheme}
            event={event as any}
            preview={true}
          />
        </section>

        {/* Presets */}
        <section className="mt-4 mb-1">
          <h2 className="text-xs font-semibold text-[#111827] mb-1">Presets</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {PRESET_THEMES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="min-w-[64px] flex-shrink-0 rounded-lg border border-[#E5E7EB] p-2 flex flex-col items-center gap-1"
              >
                <div
                  className="w-9 h-9 rounded border"
                  style={{
                    backgroundColor: preset.gradientStart,
                    borderColor: preset.gradientEnd,
                  }}
                />
                <span className="text-[10px] font-medium text-[#374151]">{preset.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Background pattern */}
        <section className="mt-4 mb-1">
          <h2 className="text-xs font-semibold text-[#111827] mb-0.5">Background pattern</h2>
          <p className="text-[10px] text-[#6B7280] mt-0.5">{patternSubtitle}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[#6B7280] w-10">None</span>
            <input
              type="range"
              min={0}
              max={BACKGROUND_ELEMENTS.length - 1}
              value={Math.max(0, backgroundElementIndex)}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setTheme((prev) => ({
                  ...prev,
                  backgroundElement: BACKGROUND_ELEMENTS[idx]?.id ?? "none",
                }));
              }}
              className="flex-1 h-8 accent-[#DC2626]"
              style={{
                // Track and thumb styling via Tailwind accent
              }}
            />
            <span className="text-[10px] text-[#6B7280] w-14 text-right">Dynamic</span>
          </div>
        </section>

        {/* Pattern weight – only when pattern !== none */}
        {(mergedTheme.backgroundElement ?? "none") !== "none" && (
          <section className="mt-4 mb-1">
            <h2 className="text-xs font-semibold text-[#111827] mb-0.5">Pattern weight</h2>
            <p className="text-[10px] text-[#6B7280] mt-0.5">
              {currentPatternWeight?.description ?? "Balanced"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-[#6B7280] w-14">Sharper</span>
              <input
                type="range"
                min={0}
                max={5}
                value={patternIndex < 0 ? 3 : patternIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setTheme((prev) => ({
                    ...prev,
                    patternWeight: PATTERN_WEIGHT_IDS[idx] ?? "medium",
                  }));
                }}
                className="flex-1 h-8 accent-[#DC2626]"
              />
              <span className="text-[10px] text-[#6B7280] w-14 text-right">Thicker</span>
            </div>
          </section>
        )}

        {/* Customize colors */}
        <section className="mt-4 mb-1">
          <h2 className="text-xs font-semibold text-[#111827] mb-1">Customize colors</h2>
          <div className="divide-y divide-[#F3F4F6]">
            {COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => openColorPicker(key)}
                className="w-full flex items-center gap-3 py-2 text-left"
              >
                <div
                  className="w-8 h-8 rounded border border-[#E5E7EB] flex-shrink-0"
                  style={{ backgroundColor: mergedTheme[key] ?? "#ccc" }}
                />
                <span className="flex-1 text-xs text-[#1F2937]">{COLOR_LABELS[key]}</span>
                <span className="text-[10px] font-mono text-[#6B7280]">
                  {(mergedTheme[key] as string) ?? "#FFFFFF"}
                </span>
                <FiChevronRight size={16} className="text-[#9CA3AF] flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* Save button */}
        <section className="mt-4">
          {error && <p className="mb-2 text-xs text-[#EF4444]">{error}</p>}
          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={saving}
            className="w-full py-2.5 px-4 rounded-lg bg-[#DC2626] text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              "Save theme"
            )}
          </button>
        </section>
      </div>

      <ThemeColorPickerModal
        isOpen={editColorKey !== null}
        editColorKey={editColorKey}
        initialHex={editHex}
        onApply={handleColorApply}
        onCancel={() => {
          setEditColorKey(null);
          setEditHex("");
        }}
      />
    </div>
  );
}
