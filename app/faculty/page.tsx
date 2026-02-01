"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, GraduationCap, AlertCircle, Loader2 } from "lucide-react";
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

export default function FacultyDashboard() {
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
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
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
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
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <GraduationCap className="h-8 w-8 text-indigo-600" />
                            Faculty Dashboard
                        </h1>
                        <p className="text-gray-600 mt-1">Manage your courses and evaluate student projects.</p>
                    </div>

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

                {courses.length === 0 ? (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <Card key={course.id} className="hover:shadow-md transition">
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-start">
                                        <span>{course.name}</span>
                                        <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                            {course.code}
                                        </span>
                                    </CardTitle>
                                    <CardDescription>
                                        {course.semester} {course.year}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                                        <span>Projects: {course._count.projects}</span>
                                        <span className="flex items-center gap-1 text-orange-600">
                                            <AlertCircle className="h-3 w-3" />
                                            2 Pending
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/faculty/course/${course.id}`}>View Class</Link>
                                        </Button>
                                        <Button size="sm" asChild>
                                            <Link href={`/faculty/evaluate?courseId=${course.id}`}>Grade All</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
