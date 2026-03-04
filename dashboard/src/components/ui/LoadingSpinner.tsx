"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
    text?: string;
}

const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
};

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
            <Loader2 className={cn("animate-spin text-indigo-600", sizeClasses[size])} />
            {text && <p className="text-sm text-gray-600">{text}</p>}
        </div>
    );
}

// Full-page loading spinner
export function PageLoader({ text }: { text?: string }) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" text={text} />
        </div>
    );
}

// Inline loading spinner for buttons and small areas
export function InlineLoader({ className }: { className?: string }) {
    return <Loader2 className={cn("animate-spin w-4 h-4", className)} />;
}
