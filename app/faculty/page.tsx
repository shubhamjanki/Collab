"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, BookOpen, GraduationCap, AlertCircle, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import LogoutButton from "@/components/dashboard/LogoutButton";

export default function FacultyDashboard() {
    const { data: session } = useSession();
    const [courses, setCourses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<"courses" | "assignments">("courses");
    const [newCourse, setNewCourse] = useState({
        name: "",
        code: "",
        semester: "Spring",
        year: new Date().getFullYear(),
    });

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (error) {
            toast.error("Failed to load courses");
        }
    };

    const fetchAssignments = async () => {
        try {
            const response = await fetch("/api/faculty/assignments");
            if (response.ok) {
                const data = await response.json();
                setAssignments(data);
            }
        } catch (error) {
            toast.error("Failed to load assignments");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
        fetchAssignments();
    }, []);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const response = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCourse),
            });

            if (response.ok) {
                toast.success("Course created successfully!");
                fetchCourses();
                (document.getElementById("close-dialog") as HTMLButtonElement)?.click();
            } else {
                throw new Error("Failed to create course");
            }
        } catch (error) {
            toast.error("Error creating course");
        } finally {
            setIsCreating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Profile Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-4">
                        {session?.user?.image ? (
                            <img
                                src={session.user.image}
                                alt={session.user.name || "Faculty"}
                                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200 cursor-pointer hover:border-indigo-400 transition"
                                onClick={() => window.location.href = "/faculty/profile"}
                            />
                        ) : (
                            <div 
                                className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 cursor-pointer hover:border-indigo-400 transition"
                                onClick={() => window.location.href = "/faculty/profile"}
                            >
                                <User className="h-8 w-8 text-indigo-600" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {session?.user?.name || "Faculty Member"}
                            </h2>
                            <p className="text-gray-600">{session?.user?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-indigo-50 text-indigo-700">
                                    Faculty
                                </span>
                                <button
                                    onClick={() => window.location.href = "/faculty/profile"}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    View Profile →
                                </button>
                            </div>
                        </div>
                        <LogoutButton />
                    </div>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <GraduationCap className="h-8 w-8 text-indigo-600" />
                            Faculty Dashboard
                        </h1>
                        <p className="text-gray-600 mt-1">Manage your courses and evaluate student projects.</p>
                    </div>

                    <div className="flex gap-3 items-center">
                        <Dialog>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                New Course
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create a New Course</DialogTitle>
                                <DialogDescription>
                                    Add a course to organize student projects and grading.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateCourse} className="space-y-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Course Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Senior Design Project"
                                        value={newCourse.name}
                                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="code">Course Code</Label>
                                    <Input
                                        id="code"
                                        placeholder="e.g. CS490"
                                        value={newCourse.code}
                                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="semester">Semester</Label>
                                        <Input
                                            id="semester"
                                            value={newCourse.semester}
                                            onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="year">Year</Label>
                                        <Input
                                            id="year"
                                            type="number"
                                            value={newCourse.year}
                                            onChange={(e) => setNewCourse({ ...newCourse, year: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="submit" disabled={isCreating}>
                                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Course
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab("courses")}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === "courses"
                                ? "text-indigo-600 border-b-2 border-indigo-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        My Courses ({courses.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("assignments")}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === "assignments"
                                ? "text-indigo-600 border-b-2 border-indigo-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Assigned Evaluations ({assignments.length})
                    </button>
                </div>

                {/* Courses Tab */}
                {activeTab === "courses" && (
                    courses.length === 0 ? (
                    <Card className="p-12 text-center border-dashed border-2">
                        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900">No courses yet</h2>
                        <p className="text-gray-500 mb-6">Start by creating your first course to manage student teams.</p>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>Create Your First Course</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create a New Course</DialogTitle>
                                    <DialogDescription>
                                        Add a course to organize student projects and grading.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateCourse} className="space-y-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name-2">Course Name</Label>
                                        <Input
                                            id="name-2"
                                            placeholder="e.g. Senior Design Project"
                                            value={newCourse.name}
                                            onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="code-2">Course Code</Label>
                                        <Input
                                            id="code-2"
                                            placeholder="e.g. CS490"
                                            value={newCourse.code}
                                            onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="semester-2">Semester</Label>
                                            <Input
                                                id="semester-2"
                                                value={newCourse.semester}
                                                onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="year-2">Year</Label>
                                            <Input
                                                id="year-2"
                                                type="number"
                                                value={newCourse.year}
                                                onChange={(e) => setNewCourse({ ...newCourse, year: parseInt(e.target.value) })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button type="submit" disabled={isCreating}>
                                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Course
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {courses.map((course) => {
                            const allStudents = new Map();
                            course.projects?.forEach((project: any) => {
                                project.members.filter((m: any) => m.user).forEach((member: any) => {
                                    if (!allStudents.has(member.user.id)) {
                                        allStudents.set(member.user.id, member.user);
                                    }
                                });
                            });
                            const studentCount = allStudents.size;
                            const pendingEvaluations = course.projects?.filter(
                                (p: any) => !p.evaluation || p.evaluation.status === "DRAFT"
                            ).length || 0;

                            return (
                                <Card key={course.id} className="hover:shadow-md transition">
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span>{course.name}</span>
                                                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                                        {course.code}
                                                    </span>
                                                </div>
                                                <CardDescription className="mt-1">
                                                    {course.semester} {course.year}
                                                </CardDescription>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {/* Stats */}
                                            <div className="grid grid-cols-3 gap-4 py-3 border-y">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-indigo-600">
                                                        {studentCount}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Students</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {course._count.projects}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Projects</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-orange-600">
                                                        {pendingEvaluations}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Pending</div>
                                                </div>
                                            </div>

                                            {/* Student List Preview */}
                                            {studentCount > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-2 text-gray-700">
                                                        Enrolled Students
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Array.from(allStudents.values()).slice(0, 5).map((student: any) => (
                                                            <div
                                                                key={student.id}
                                                                className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full text-sm"
                                                            >
                                                                <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-semibold text-indigo-700">
                                                                    {student.name?.[0]?.toUpperCase() || "?"}
                                                                </div>
                                                                <span className="text-gray-700">{student.name}</span>
                                                            </div>
                                                        ))}
                                                        {studentCount > 5 && (
                                                            <div className="flex items-center px-3 py-1 text-sm text-gray-500">
                                                                +{studentCount - 5} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Projects List */}
                                            {course.projects && course.projects.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-2 text-gray-700">
                                                        Course Projects
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {course.projects.slice(0, 3).map((project: any) => (
                                                            <div
                                                                key={project.id}
                                                                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-800">
                                                                        {project.name}
                                                                    </span>
                                                                    <span className="text-gray-500">
                                                                        ({project.members.length} members)
                                                                    </span>
                                                                </div>
                                                                {project.evaluation ? (
                                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                                        project.evaluation.status === "PUBLISHED"
                                                                            ? "bg-green-100 text-green-700"
                                                                            : project.evaluation.status === "SUBMITTED"
                                                                            ? "bg-blue-100 text-blue-700"
                                                                            : "bg-gray-100 text-gray-600"
                                                                    }`}>
                                                                        {project.evaluation.status}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                                                                        Not Graded
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {course.projects.length > 3 && (
                                                            <div className="text-sm text-gray-500 text-center">
                                                                +{course.projects.length - 3} more projects
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="grid grid-cols-2 gap-2 pt-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/faculty/course/${course.id}`}>View Details</Link>
                                                </Button>
                                                <Button size="sm" asChild>
                                                    <Link href={`/faculty/evaluate?courseId=${course.id}`}>
                                                        Grade Projects
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )
                )}

                {/* Assignments Tab */}
                {activeTab === "assignments" && (
                    assignments.length === 0 ? (
                        <Card className="p-12 text-center border-dashed border-2">
                            <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-900">No Assignments Yet</h2>
                            <p className="text-gray-500">You haven't been assigned any projects to evaluate.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {assignments.map((assignment) => (
                                <Card key={assignment.id} className="hover:shadow-md transition">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {assignment.project.name}
                                                    </h3>
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        assignment.status === "PUBLISHED"
                                                            ? "bg-green-100 text-green-700"
                                                            : assignment.status === "SUBMITTED"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                        {assignment.status}
                                                    </span>
                                                </div>
                                                {assignment.project.course && (
                                                    <p className="text-sm text-gray-600 mb-3">
                                                        Course: {assignment.project.course.code} - {assignment.project.course.name}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    <span className="text-sm text-gray-600">Team Members:</span>
                                                    {assignment.project.members.map((member: any) => (
                                                        <span
                                                            key={member.user.id}
                                                            className="text-sm bg-gray-100 px-2 py-1 rounded"
                                                        >
                                                            {member.user.name}
                                                        </span>
                                                    ))}
                                                </div>
                                                {assignment.totalScore !== undefined && (
                                                    <div className="text-sm font-medium text-indigo-600">
                                                        Score: {assignment.totalScore}/{assignment.maxScore}
                                                    </div>
                                                )}
                                            </div>
                                            <Button size="sm" asChild>
                                                <Link href={`/faculty/evaluate/${assignment.project.id}`}>
                                                    {assignment.status === "DRAFT" ? "Continue Grading" : "View Evaluation"}
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}