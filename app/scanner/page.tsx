"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  { ssr: false }
);

export default function ScannerPage() {
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/");
    }
  }, [router]);

  const [status, setStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  const isScanningRef = useRef(false);

  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => {
        setPopupMessage(null);
        setStatus(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length === 0) return;
    const data = detectedCodes[0].rawValue;
    if (!data) return;
    if (isScanningRef.current) return;

    isScanningRef.current = true;
    setStatus("loading");
    setPopupMessage("Processing...");

    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        const json = await res.json();
        if (json.success) {
          setStatus("success");
          setPopupMessage(`Entry OK ✓ Remaining: ${json.remaining}`);
        } else {
          setStatus("error");
          setPopupMessage(json.message);
        }
      })
      .catch((err) => {
        setStatus("error");
        setPopupMessage(err.message || "Server not reachable");
      })
      .finally(() => {
        setTimeout(() => {
          isScanningRef.current = false;
          setScannerKey((prev) => prev + 1);
        }, 1000);
      });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-pink-100 via-white to-pink-50 text-gray-800 font-sans relative">
      <h1 className="text-3xl font-bold mb-2">QR Scanner</h1>
      <p className="text-sm text-gray-500 mb-8">Hold a QR code inside the frame</p>

      <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-pink-200">
        <div className="w-72 h-72 rounded-lg overflow-hidden bg-gray-50 shadow-inner">
          <Scanner
            key={scannerKey}
            constraints={{ facingMode: "environment" }}
            onScan={handleScan}
            onError={() => {
              setStatus("error");
              setPopupMessage("Camera error");
            }}
          />
        </div>
      </div>

      {/* Overlay + Animations */}
      <AnimatePresence>
        {status === "loading" && (
          <motion.div
            key="loading"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-64 h-2 bg-gray-300/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full w-1/2 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
            </div>
            <p className="text-white mt-4 text-lg font-medium">Scanning...</p>
          </motion.div>
        )}

        {(status === "success" || status === "error") && popupMessage && (
          <motion.div
            key="popup"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`p-6 rounded-2xl shadow-2xl max-w-sm text-center flex flex-col items-center gap-3 ${
                status === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              {status === "success" ? (
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500" />
              )}
              <p className="text-lg font-semibold">{popupMessage}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
