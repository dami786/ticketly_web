"use client";

import { useEffect, useState } from "react";
import { FiCheckCircle, FiX, FiXCircle, FiInfo, FiAlertCircle } from "react-icons/fi";
import { useToastStore } from "../store/useToastStore";
import type { Toast } from "../lib/hooks/useToast";

const ToastItem = ({ toast }: { toast: Toast }) => {
  const removeToast = useToastStore((state) => state.removeToast);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => removeToast(toast.id), 300);
      }, toast.duration - 300);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, removeToast]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <FiCheckCircle className="h-5 w-5" />;
      case "error":
        return <FiXCircle className="h-5 w-5" />;
      case "warning":
        return <FiAlertCircle className="h-5 w-5" />;
      default:
        return <FiInfo className="h-5 w-5" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          container: "bg-gradient-to-r from-success/20 via-success/15 to-success/10 border-success/40",
          iconBg: "bg-success/20",
          iconColor: "text-success",
          textColor: "text-white",
          glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
          progressBar: "bg-success"
        };
      case "error":
        return {
          container: "bg-gradient-to-r from-danger/20 via-danger/15 to-danger/10 border-danger/40",
          iconBg: "bg-danger/20",
          iconColor: "text-danger",
          textColor: "text-white",
          glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
          progressBar: "bg-danger"
        };
      case "warning":
        return {
          container: "bg-gradient-to-r from-yellow-500/20 via-yellow-500/15 to-yellow-500/10 border-yellow-500/40",
          iconBg: "bg-yellow-500/20",
          iconColor: "text-yellow-500",
          textColor: "text-white",
          glow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]",
          progressBar: "bg-yellow-500"
        };
      default:
        return {
          container: "bg-gradient-to-r from-accent/20 via-accent/15 to-accent/10 border-accent/40",
          iconBg: "bg-accent/20",
          iconColor: "text-accent",
          textColor: "text-white",
          glow: "shadow-[0_0_20px_rgba(147,51,234,0.3)]",
          progressBar: "bg-accent"
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`
        group relative flex min-w-[320px] max-w-md items-start gap-3 overflow-hidden rounded-2xl border px-4 py-4
        backdrop-blur-xl transition-all duration-300 ease-out
        ${styles.container} ${styles.glow}
        ${isExiting ? "opacity-0 translate-x-full scale-95" : "opacity-100 translate-x-0 scale-100 animate-in"}
        before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none
      `}
    >
      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-black/20">
          <div
            className={`h-full ${styles.progressBar} transition-all ease-linear`}
            style={{
              width: isExiting ? "0%" : "100%",
              animation: isExiting ? "none" : `shrink ${toast.duration}ms linear forwards`
            }}
          />
        </div>
      )}

      {/* Icon with background */}
      <div className={`flex-shrink-0 rounded-xl p-2 ${styles.iconBg} ${styles.iconColor} mt-0.5`}>
        {getIcon()}
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm font-semibold leading-relaxed ${styles.textColor} pt-0.5`}>
        {toast.message}
      </p>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 rounded-lg p-1.5 text-white/60 transition-all hover:bg-white/10 hover:text-white active:scale-95"
        aria-label="Close toast"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-50 flex flex-col gap-3 sm:right-6 sm:top-20">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

