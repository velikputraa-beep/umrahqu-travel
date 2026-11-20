"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Email atau password salah."
          : signInError.message
      );
      setIsLoading(false);
      return;
    }

    // Cookie sesi sudah ditulis oleh createBrowserClient; refresh() membuat
    // Server Component & proxy membacanya sebelum dashboard dirender.
    router.replace("/travel/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-lg space-y-6">
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-8 sm:p-10">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center justify-center gap-1">
              UMRAH<span className="text-emerald-600">QU</span>
            </h1>
            <h2 className="text-lg font-bold text-gray-800 mt-3">
              UmrahQu Travel
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Masuk untuk mengelola dashboard travel Anda
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@umrohqu.com"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 border border-rose-200 bg-rose-50 rounded-lg p-3">
                <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 font-medium">{error}</p>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition-colors shadow-xs active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>

        {/* Security / Help Notice */}
        <p className="text-xs text-gray-500 text-center px-4">
          Akses hanya untuk tim travel yang terdaftar. Hubungi administrator
          jika Anda belum memiliki akun.
        </p>
      </div>
    </div>
  );
}
