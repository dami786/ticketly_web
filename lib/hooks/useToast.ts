import { useCallback } from "react";
import { useToastStore } from "../../store/useToastStore";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);

  const toast = useCallback(
    (message: string, type: ToastType = "info", duration?: number) => {
      addToast(message, type, duration);
    },
    [addToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => {
      toast(message, "success", duration);
    },
    [toast]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      toast(message, "error", duration);
    },
    [toast]
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      toast(message, "info", duration);
    },
    [toast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      toast(message, "warning", duration);
    },
    [toast]
  );

  return {
    toast,
    success,
    error,
    info,
    warning,
    removeToast
  };
}

