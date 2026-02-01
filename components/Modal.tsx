"use client";

import { useEffect } from "react";
import { FiCheckCircle, FiX, FiXCircle, FiInfo, FiAlertCircle } from "react-icons/fi";

export type ModalVariant = "success" | "error" | "info" | "warning";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: ModalVariant;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  showCloseButton?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  message,
  variant = "info",
  primaryButtonText = "OK",
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  showCloseButton = true,
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!visible) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [visible, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  const getIcon = () => {
    const iconColor = getVariantColor();
    switch (variant) {
      case "success":
        return <FiCheckCircle className="h-7 w-7" style={{ color: iconColor }} />;
      case "error":
        return <FiXCircle className="h-7 w-7" style={{ color: iconColor }} />;
      case "warning":
        return <FiAlertCircle className="h-7 w-7" style={{ color: iconColor }} />;
      default:
        return <FiInfo className="h-7 w-7" style={{ color: iconColor }} />;
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case "success":
        return "#10B981"; // Green 500
      case "error":
        return "#EF4444"; // Red 500
      case "warning":
        return "#F59E0B"; // Amber 500
      default:
        return "#DC2626"; // Primary Red (default variant)
    }
  };

  const handlePrimary = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else {
      onClose();
    }
  };

  const handleSecondary = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else {
      onClose();
    }
  };

  const variantColor = getVariantColor();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-[400px] rounded-2xl border border-[#374151] bg-[#1F1F1F] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div className="flex items-center justify-center pb-3 pt-1">
          <div className="h-1 w-10 rounded-full bg-[#4B5563]" />
        </div>

        {/* Icon + Title */}
        <div className="mb-2 flex flex-col items-center">
          <div
            className="mb-2 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${variantColor}33` }}
          >
            {getIcon()}
          </div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        {/* Message */}
        <p className="mb-6 text-center text-base leading-6 text-[#D1D5DB]">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          {secondaryButtonText && (
            <button
              type="button"
              onClick={handleSecondary}
              className="flex-1 rounded-xl border border-[#374151] bg-[#2F2F2F] px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#374151]"
            >
              {secondaryButtonText}
            </button>
          )}
          <button
            type="button"
            onClick={handlePrimary}
            className="flex-1 rounded-xl px-4 py-3.5 text-base font-semibold text-white transition-colors"
            style={{
              backgroundColor: variantColor,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {primaryButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

