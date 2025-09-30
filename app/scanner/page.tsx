"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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
      router.push("/"); // redirect to login if no token
    }
  }, [router]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"success" | "error" | null>(null);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
        setStatus(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
  if (detectedCodes.length === 0) return;

  const data = detectedCodes[0].rawValue;
  if (!data) return;

  const now = Date.now();
  if (
      lastScanRef.current &&
      lastScanRef.current.code === data &&
      now - lastScanRef.current.time < 2000
  ) {
      return;
  }
  lastScanRef.current = { code: data, time: now };

  fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data }),
  })
      .then(async (res) => {
      if (!res.ok) {
          setStatus("error");
          setMessage(`Server error (${res.status})`);
          return;
      }
      const json = await res.json();
      if (json.success) {
          setStatus("success");
          setMessage(`Entry ok ✓ Remaining: ${json.remaining}`);
      } else {
          setStatus("error");
          setMessage(json.message);
      }
      })
      .catch(() => {
      setStatus("error");
      setMessage("Server not reachable");
      });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#fafafa] text-gray-800 font-sans">
      {/* Title */}
      <h1 className="text-2xl font-semibold mb-2">QR Scanner</h1>
      <p className="text-sm text-gray-500 mb-8">Hold a QR code inside the frame</p>

      {/* Picture-style frame */}
      <div className="p-4 bg-pink-200 rounded-2xl shadow-md border-4 border-pink-300">
        <div className="w-72 h-72 rounded-lg overflow-hidden bg-white">
          <Scanner
            constraints={{ facingMode: "environment" }}
            onScan={handleScan}
            onError={() => {
              setStatus("error");
              setMessage("Camera error");
            }}
          />
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          className={`fixed bottom-6 px-4 py-2 rounded-full text-sm shadow-sm ${
            status === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
