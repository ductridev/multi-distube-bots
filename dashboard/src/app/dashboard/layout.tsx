"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/store/dashboard";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser, sidebarOpen } = useDashboardStore();
  const [isClient, setIsClient] = useState(false);
  // Use state for token instead of reading localStorage in render path
  const [hasToken, setHasToken] = useState(false);

  // Single source of truth for client-side initialization
  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("dashboard_token");
    setHasToken(!!token);
    
    // If no token, redirect to login
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  // Fetch current user - only enabled when we have a token (stored in state, not read in render)
  const { isLoading, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const userData = await api.getCurrentUser();
      setUser(userData);
      return userData;
    },
    enabled: isClient && hasToken,
    retry: false,
  });

  // Handle auth errors
  useEffect(() => {
    if (error && isClient) {
      localStorage.removeItem("dashboard_token");
      setHasToken(false);
      router.push("/login");
    }
  }, [error, isClient, router]);

  if (!isClient || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <Header />
        <main className="p-4 md:p-6" id="main-content" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
