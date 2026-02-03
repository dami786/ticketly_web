import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { PresetColorButtons } from "./PresetColorButtons";
import { TicketPreview } from "./TicketPreview";

interface ColorPickerModalProps {
  isOpen: boolean;
  eventName: string;
  currentColor: string;
  onColorSelect: (color: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  eventName,
  currentColor,
  onColorSelect,
  onSave,
  onCancel,
  isSaving = false
}) => {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [useCustomColor, setUseCustomColor] = useState(false);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onColorSelect(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setSelectedColor(color);
    onColorSelect(color);
  };

  const handleSave = () => {
    onSave();
  };

  const handleCancel = () => {
    setSelectedColor(currentColor);
    setUseCustomColor(false);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-2xl md:rounded-xl border border-gray-200 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar (Mobile) */}
        <div className="flex md:hidden items-center justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Select Ticket Color</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Ticket Preview */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Preview
            </label>
            <TicketPreview
              eventName={eventName}
              backgroundColor={selectedColor}
              textColor={selectedColor === "#FFCC00" ? "#000000" : "#ffffff"}
            />
          </div>

          {/* Preset Colors */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Preset Colors
            </label>
            <PresetColorButtons
              onColorSelect={handleColorChange}
              selectedColor={selectedColor}
            />
          </div>

          {/* Custom Color Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Custom Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedColor}
                onChange={handleCustomColorChange}
                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={selectedColor.toUpperCase()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(value)) {
                      handleColorChange(value);
                    }
                  }}
                  placeholder="#RRGGBB"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Color</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
