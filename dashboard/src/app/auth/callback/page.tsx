"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Type guard for API error response
function isApiError(error: unknown): error is { response?: { data?: { error?: string }; status?: number }; request?: unknown; message?: string } {
    return typeof error === "object" && error !== null;
}

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const { setUser } = useDashboardStore();

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code");
            const state = searchParams.get("state");
            const errorParam = searchParams.get("error");

            if (errorParam) {
                setError("Authentication failed");
                setTimeout(() => {
                    router.push("/login?error=" + errorParam);
                }, 2000);
                return;
            }

            // Validate OAuth state for CSRF protection
            const storedState = sessionStorage.getItem("oauth_state");
            if (!state || state !== storedState) {
                setError("Invalid authentication state. Please try again.");
                sessionStorage.removeItem("oauth_state");
                setTimeout(() => {
                    router.push("/login?error=invalid_state");
                }, 2000);
                return;
            }
            // Clear the used state
            sessionStorage.removeItem("oauth_state");

            if (!code) {
                setError("No authorization code received");
                setTimeout(() => {
                    router.push("/login?error=no_code");
                }, 2000);
                return;
            }

            try {
                // Exchange code for token
                console.log("Attempting to exchange code for token...");
                const response = await api.login(code);

                // Store user in state
                setUser(response.user);

                // Show success message
                toast.success(`Welcome back, ${response.user.username}!`);

                // Redirect to dashboard
                router.push("/dashboard");
            } catch (err: unknown) {
                console.error("Auth callback error:", err);
                
                // Extract detailed error message with proper type checking
                let errorMessage = "Failed to authenticate";
                
                if (isApiError(err)) {
                    if (err.response) {
                        // Server responded with error
                        errorMessage = err.response.data?.error || 
                                       `Server error: ${err.response.status}`;
                        console.error("Server error:", err.response.data);
                    } else if (err.request) {
                        // Request made but no response
                        errorMessage = "No response from server. Is the API running?";
                        console.error("No response received");
                    } else if (err.message) {
                        // Error setting up request
                        errorMessage = err.message;
                    }
                }
                
                setError(errorMessage);
                toast.error(errorMessage);

                setTimeout(() => {
                    router.push("/login?error=auth_failed");
                }, 3000);
            }
        };

        handleCallback();
    }, [router, searchParams, setUser]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
            <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center space-y-6">
                {error ? (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <svg
                                className="w-8 h-8 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Authentication Failed</h2>
                            <p className="text-gray-600 mt-2">{error}</p>
                            <p className="text-sm text-gray-500 mt-4">Redirecting to login...</p>
                        </div>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Authenticating...</h2>
                            <p className="text-gray-600 mt-2">Please wait while we sign you in</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
