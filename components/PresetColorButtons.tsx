import React from "react";

interface PresetColorButtonsProps {
  onColorSelect: (color: string) => void;
  selectedColor: string;
}

const PRESET_COLORS = [
  { name: "Blue", hex: "#007AFF" },
  { name: "Red", hex: "#FF3B30" },
  { name: "Green", hex: "#34C759" },
  { name: "Purple", hex: "#AF52DE" },
  { name: "Orange", hex: "#FF9500" },
  { name: "Pink", hex: "#FF2D55" },
  { name: "Gray", hex: "#A2A2A2" },
  { name: "Yellow", hex: "#FFCC00" }
];

export const PresetColorButtons: React.FC<PresetColorButtonsProps> = ({
  onColorSelect,
  selectedColor
}) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {PRESET_COLORS.map((color) => (
        <button
          key={color.hex}
          type="button"
          onClick={() => onColorSelect(color.hex)}
          className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={color.name}
        >
          <div
            className={`w-12 h-12 rounded-full border-4 transition-all ${
              selectedColor === color.hex
                ? "border-gray-900 scale-110"
                : "border-gray-200 hover:border-gray-400"
            }`}
            style={{ backgroundColor: color.hex }}
          />
          <span className="text-xs font-medium text-gray-700 text-center truncate">
            {color.name}
          </span>
        </button>
      ))}
    </div>
  );
};
