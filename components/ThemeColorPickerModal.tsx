"use client";

import React, { useState, useEffect } from "react";
import { isValidHex, normalizeHex, type TicketTheme } from "../lib/ticketTheme";

const LABELS: Record<string, string> = {
  gradientStart: "Gradient start",
  gradientEnd: "Gradient end",
  primaryTextColor: "Text color",
  accentColor: "Accent / divider / background",
  brandColor: "Brand / logo",
};

interface ThemeColorPickerModalProps {
  isOpen: boolean;
  editColorKey: keyof TicketTheme | null;
  initialHex: string;
  onApply: (key: keyof TicketTheme, hex: string) => void;
  onCancel: () => void;
}

export function ThemeColorPickerModal({
  isOpen,
  editColorKey,
  initialHex,
  onApply,
  onCancel,
}: ThemeColorPickerModalProps) {
  const [editHex, setEditHex] = useState(initialHex);

  useEffect(() => {
    if (isOpen && editColorKey) {
      setEditHex(initialHex || "#FFFFFF");
    }
  }, [isOpen, editColorKey, initialHex]);

  if (!isOpen) return null;

  const title = editColorKey ? LABELS[editColorKey] ?? "Edit color" : "Edit color";
  const displayHex = editHex.startsWith("#") ? editHex : `#${editHex}`;
  const validHex = isValidHex(displayHex);
  const previewBg = validHex ? displayHex : "#ccc";

  const handleHexChange = (value: string) => {
    if (value === "") {
      setEditHex("");
      return;
    }
    const withHash = value.startsWith("#") ? value : `#${value}`;
    setEditHex(withHash);
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setEditHex(hex);
  };

  const handleApply = () => {
    if (!editColorKey) return;
    const normalized = validHex ? normalizeHex(displayHex) : displayHex;
    if (isValidHex(normalized)) {
      onApply(editColorKey, normalized);
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-[24rem] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-[#111827] mb-3">{title}</h2>

        {/* Hex input row with preview */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: previewBg }}
          />
          <input
            type="text"
            value={editHex}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#FFFFFF"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        {/* Native color picker */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs text-gray-600">Pick color:</label>
          <input
            type="color"
            value={validHex ? displayHex : "#FFFFFF"}
            onChange={handleNativeColorChange}
            className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-[#F3F4F6] text-gray-700 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!validHex}
            className="flex-1 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
