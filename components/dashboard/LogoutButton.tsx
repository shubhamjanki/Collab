"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut({ 
                redirect: false 
            });
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
            >
                <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                />
            </svg>
            {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
    );
}
