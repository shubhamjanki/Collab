"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Rocket } from "lucide-react";

export default function JoinPage() {
    const { code } = useParams();
    const router = useRouter();
    const [status, setStatus] = useState<"joining" | "error">("joining");

    useEffect(() => {
        if (!code) return;

        const joinProject = async () => {
            try {
                const response = await fetch("/api/projects/join", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ inviteCode: code }),
                });

                const data = await response.json();

                if (response.ok) {
                    toast.success(`Welcome to ${data.projectName}!`);
                    router.push(`/projects/${data.projectId}`);
                } else {
                    // If already a member, just redirect
                    if (data.projectId && response.status === 400) {
                        toast.info(data.error);
                        router.push(`/projects/${data.projectId}`);
                    } else {
                        throw new Error(data.error || "Failed to join project");
                    }
                }
            } catch (error: any) {
                console.error("Join error:", error);
                toast.error(error.message);
                setStatus("error");
                // Redirect to dashboard after a delay if error
                setTimeout(() => router.push("/dashboard"), 3000);
            }
        };

        joinProject();
    }, [code, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full mx-4">
                <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-indigo-100 rounded-full">
                        <Rocket className="h-10 w-10 text-indigo-600" />
                    </div>
                </div>

                {status === "joining" ? (
                    <>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Joining Project...</h1>
                        <p className="text-gray-600 mb-8">Please wait while we set up your workspace.</p>
                        <div className="flex justify-center">
                            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-red-600 mb-2">Oops!</h1>
                        <p className="text-gray-600 mb-4">We couldn't join the project. Redirecting you to the dashboard...</p>
                    </>
                )}
            </div>
        </div>
    );
}
