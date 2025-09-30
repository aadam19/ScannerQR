"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple auth check
    if (username === process.env.NEXT_PUBLIC_USER && password === process.env.NEXT_PUBLIC_PASSWORD) {
      // Save token in session storage
      if (process.env.NEXT_PUBLIC_TOKEN) {
        sessionStorage.setItem("token", process.env.NEXT_PUBLIC_TOKEN);
      }
      router.push("/scanner");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#fafafa] text-gray-800 font-sans">
      <div className="p-6 bg-pink-100 rounded-2xl shadow-md border-4 border-pink-200 w-80">
        <h1 className="text-2xl font-semibold mb-4 text-center">Login</h1>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          <button
            type="submit"
            className="w-full bg-pink-400 text-white py-2 rounded-lg hover:bg-pink-500 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
