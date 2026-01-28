"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

// Some browsers don't yet have proper TS types for BarcodeDetector
declare const BarcodeDetector:
  | undefined
  | (new (options: { formats: string[] }) => {
      detect: (image: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
    });

export default function QRScanner({ visible, onClose, onScan }: QRScannerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setScanning(true);
    // Auto-open file picker when modal appears (user already clicked Scan QR)
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [visible]);

  if (!visible) return null;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setScanning(false);
      return;
    }

    try {
      if (typeof BarcodeDetector !== "undefined") {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        const bitmap = await createImageBitmap(file);
        const codes = await detector.detect(bitmap);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          onScan(String(codes[0].rawValue));
          setScanning(false);
          onClose();
          return;
        }
      }

      setError(
        "Could not read QR code from image. Please try again or enter ticket number manually."
      );
    } catch (err) {
      console.error("QR scan error:", err);
      setError(
        "Failed to scan QR code. Please try again or enter ticket number manually."
      );
    } finally {
      setScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClose = () => {
    setScanning(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-[90vw] max-w-md rounded-2xl border border-[#374151] bg-[#020617] px-5 py-5 text-center shadow-2xl">
        <h2 className="mb-2 text-base font-semibold text-white">Scan QR code</h2>
        <p className="mb-4 text-xs text-mutedLight">
          Your camera app will open. Point it at the ticket QR code and capture
          a clear photo. We&apos;ll read the ticket number automatically.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mb-3 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          {scanning ? "Scanning…" : "Open camera"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {error ? (
          <p className="mt-2 text-xs font-semibold text-danger">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={handleClose}
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-border bg-[#111827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1F2937]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

