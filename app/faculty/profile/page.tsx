"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
    User, 
    Mail, 
    Building2, 
    Calendar, 
    BookOpen, 
    Award, 
    Edit, 
    Save, 
    X,
    GraduationCap,
    FileText,
    Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LogoutButton from "@/components/dashboard/LogoutButton";

export default function FacultyProfilePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [stats, setStats] = useState({
        coursesCount: 0,
        studentsCount: 0,
        projectsCount: 0,
        evaluationsCount: 0,
    });
    
    const [profileData, setProfileData] = useState({
        name: "",
        email: "",
        image: "",
        bio: "",
        university: "",
        role: "",
    });

    const [editData, setEditData] = useState({
        name: "",
        bio: "",
        university: "",
    });

    useEffect(() => {
        fetchProfile();
        fetchStats();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch("/api/profile");
            if (response.ok) {
                const data = await response.json();
                setProfileData(data);
                setEditData({
                    name: data.name || "",
                    bio: data.bio || "",
                    university: data.university || "",
                });
            }
        } catch (error) {
            toast.error("Failed to load profile");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const [coursesRes, assignmentsRes] = await Promise.all([
                fetch("/api/courses"),
                fetch("/api/faculty/assignments"),
            ]);

            if (coursesRes.ok && assignmentsRes.ok) {
                const courses = await coursesRes.json();
                const assignments = await assignmentsRes.json();

                // Calculate unique students from all courses
                const allStudents = new Set();
                let totalProjects = 0;

                courses.forEach((course: any) => {
                    totalProjects += course._count?.projects || 0;
                    course.projects?.forEach((project: any) => {
                        project.members?.forEach((member: any) => {
                            allStudents.add(member.user.id);
                        });
                    });
                });

                setStats({
                    coursesCount: courses.length,
                    studentsCount: allStudents.size,
                    projectsCount: totalProjects,
                    evaluationsCount: assignments.length,
                });
            }
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (!response.ok) {
                throw new Error("Failed to update profile");
            }

            const updatedData = await response.json();
            setProfileData(updatedData);
            setIsEditing(false);
            toast.success("Profile updated successfully!");
            router.refresh();
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditData({
            name: profileData.name || "",
            bio: profileData.bio || "",
            university: profileData.university || "",
        });
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/faculty")}
                    >
                        ← Back to Dashboard
                    </Button>
                    <LogoutButton />
                </div>

                {/* Profile Card */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-6">
                            {/* Profile Picture */}
                            <div className="flex-shrink-0">
                                {profileData.image ? (
                                    <img
                                        src={profileData.image}
                                        alt={profileData.name || "Faculty"}
                                        className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-indigo-200">
                                        <User className="h-16 w-16 text-indigo-600" />
                                    </div>
                                )}
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={editData.name}
                                                onChange={(e) =>
                                                    setEditData({ ...editData, name: e.target.value })
                                                }
                                                placeholder="Enter your name"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="university">University/Institution</Label>
                                            <Input
                                                id="university"
                                                value={editData.university}
                                                onChange={(e) =>
                                                    setEditData({ ...editData, university: e.target.value })
                                                }
                                                placeholder="Enter your university"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="bio">Bio</Label>
                                            <Textarea
                                                id="bio"
                                                value={editData.bio}
                                                onChange={(e) =>
                                                    setEditData({ ...editData, bio: e.target.value })
                                                }
                                                placeholder="Tell us about yourself..."
                                                rows={4}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="gap-2"
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleCancel}
                                                disabled={isSaving}
                                                className="gap-2"
                                            >
                                                <X className="h-4 w-4" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                                    {profileData.name || "Faculty Member"}
                                                </h1>
                                                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                                                    <GraduationCap className="inline h-4 w-4 mr-1" />
                                                    Faculty
                                                </span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsEditing(true)}
                                                className="gap-2"
                                            >
                                                <Edit className="h-4 w-4" />
                                                Edit Profile
                                            </Button>
                                        </div>

                                        <div className="space-y-3 text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                                <span>{profileData.email}</span>
                                            </div>
                                            {profileData.university && (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-5 w-5 text-gray-400" />
                                                    <span>{profileData.university}</span>
                                                </div>
                                            )}
                                        </div>

                                        {profileData.bio && (
                                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                                <p className="text-gray-700">{profileData.bio}</p>
                                            </div>
                                        )}

                                        {!profileData.bio && !isEditing && (
                                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-sm text-yellow-800">
                                                    Add a bio to tell students and colleagues about yourself!
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-100 rounded-lg">
                                    <BookOpen className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.coursesCount}</p>
                                    <p className="text-sm text-gray-500">Courses</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Users className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.studentsCount}</p>
                                    <p className="text-sm text-gray-500">Students</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <FileText className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.projectsCount}</p>
                                    <p className="text-sm text-gray-500">Projects</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <Award className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.evaluationsCount}</p>
                                    <p className="text-sm text-gray-500">Evaluations</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Additional Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-gray-600">Account Type</Label>
                                <p className="text-gray-900 font-medium mt-1">Faculty Account</p>
                            </div>
                            <div>
                                <Label className="text-gray-600">Member Since</Label>
                                <p className="text-gray-900 font-medium mt-1">
                                    {new Date().toLocaleDateString("en-US", {
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
