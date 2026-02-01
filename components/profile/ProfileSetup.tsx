"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserCircle } from "lucide-react";
import { SkillInput } from "./SkillInput";

export function ProfileSetup() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        bio: "",
        university: "",
        skills: [] as string[],
    });

    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch("/api/profile");
                if (response.ok) {
                    const data = await response.json();
                    setFormData({
                        name: data.name || "",
                        bio: data.bio || "",
                        university: data.university || "",
                        skills: data.skills || [],
                    });

                    // Logic to show prompt:
                    // 1. Must be logged in (data exists)
                    // 2. Profile must be actually empty (not just missing one field)
                    // 3. Haven't dismissed it this session
                    const isProfileEmpty = !data.bio && !data.university && (!data.skills || data.skills.length === 0);
                    const isDismissed = sessionStorage.getItem("profilePromptDismissed") === "true";

                    if (isProfileEmpty && !isDismissed) {
                        setIsOpen(true);
                    }
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error("Failed to update profile");
            }

            toast.success("Profile updated successfully!");
            sessionStorage.setItem("profilePromptDismissed", "true");
            setIsOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-indigo-100 rounded-full">
                            <UserCircle className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl">Complete Your Profile</DialogTitle>
                            <DialogDescription>
                                Let others know about your skills and background.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            placeholder="Your name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="university">University / Organization</Label>
                        <Input
                            id="university"
                            placeholder="e.g. Stanford University"
                            value={formData.university}
                            onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">About You</Label>
                        <Textarea
                            id="bio"
                            placeholder="Tell us a bit about yourself, your interests, and what you're looking for in collab..."
                            className="min-h-[100px] resize-none"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Top Skills</Label>
                        <SkillInput
                            value={formData.skills}
                            onChange={(skills) => setFormData({ ...formData, skills })}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            className="flex-1"
                            onClick={() => {
                                sessionStorage.setItem("profilePromptDismissed", "true");
                                setIsOpen(false);
                            }}
                        >
                            Skip for now
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Profile
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
