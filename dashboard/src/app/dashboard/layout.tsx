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

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check authentication
  useEffect(() => {
    if (!isClient) return;
    
    const token = localStorage.getItem("dashboard_token");
    if (!token) {
      router.push("/login");
    }
  }, [router, isClient]);

  // Fetch current user
  const { isLoading, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const userData = await api.getCurrentUser();
      setUser(userData);
      return userData;
    },
    enabled: isClient && !!localStorage.getItem("dashboard_token"),
    retry: false,
  });

  if (error) {
    // Token invalid, redirect to login
    if (isClient) {
      localStorage.removeItem("dashboard_token");
    }
    router.push("/login");
    return null;
  }

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
      <div className={`transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
