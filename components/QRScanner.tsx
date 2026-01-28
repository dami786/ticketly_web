"use client";

import { useEffect, useRef, useState } from "react";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let stream: MediaStream | null = null;
    let cancelled = false;
    let scanInterval: number | null = null;

    const startCamera = async () => {
      try {
        setError(null);
        setHasPermission(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Camera not supported in this browser. Please enter ticket number manually.");
          setHasPermission(false);
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setHasPermission(true);

        if (typeof BarcodeDetector === "undefined") {
          setError(
            "QR scanning is not supported on this browser. Please type the ticket number manually."
          );
          return;
        }

        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        setScanning(true);

        scanInterval = window.setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0 && codes[0].rawValue) {
              const value = String(codes[0].rawValue);
              setScanning(false);
              if (!cancelled) {
                onScan(value);
                handleClose();
              }
            }
          } catch {
            // ignore transient detection errors
          }
        }, 400);
      } catch (err: any) {
        console.error("QR scanner error:", err);
        setError(
          "Unable to access camera. Please allow camera permission or enter ticket number manually."
        );
        setHasPermission(false);
      }
    };

    const handleClose = () => {
      if (scanInterval !== null) {
        window.clearInterval(scanInterval);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      cancelled = true;
      setScanning(false);
      onClose();
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (scanInterval !== null) {
        window.clearInterval(scanInterval);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const handleManualClose = () => {
    setScanning(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative h-[80vh] w-[90vw] max-w-xl overflow-hidden rounded-2xl border border-[#374151] bg-black shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1F2937] bg-black/70 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Scan QR code</h2>
          <button
            type="button"
            onClick={handleManualClose}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="relative flex h-full flex-col items-center justify-center bg-black">
          {hasPermission === null && !error && (
            <div className="flex flex-col items-center justify-center gap-2 text-center text-sm text-mutedLight">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p>Requesting camera permission…</p>
            </div>
          )}

          {hasPermission && !error && (
            <>
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
              />
              {/* scanning frame */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-56 w-56 rounded-2xl border-2 border-accent/80 bg-black/10 shadow-[0_0_30px_rgba(147,51,234,0.5)]" />
              </div>
              {scanning && (
                <div className="pointer-events-none absolute bottom-6 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-lg">
                  Scanning for QR code…
                </div>
              )}
            </>
          )}

          {error && (
            <div className="px-6 text-center text-sm text-danger">
              <p className="mb-2 font-semibold">Unable to scan QR code</p>
              <p className="text-xs text-mutedLight">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


