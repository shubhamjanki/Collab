"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    BarChart4,
    Users,
    ClipboardCheck,
    MessageSquare,
    History,
    Info,
    ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RubricScoring } from "@/components/faculty/RubricScoring";
import { toast } from "sonner";
import Link from "next/link";

const DEFAULT_CRITERIA = [
    { id: "1", name: "Innovation", weight: 30, maxScore: 10, description: "How unique and creative is the solution?" },
    { id: "2", name: "Technical Execution", weight: 40, maxScore: 10, description: "Code quality, architecture, and robustness." },
    { id: "3", name: "Design & UX", weight: 20, maxScore: 10, description: "Visual appeal and ease of use." },
    { id: "4", name: "Collaboration", weight: 10, maxScore: 10, description: "How well did the team work together based on data?" },
];

export default function ProjectEvaluationPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const [project, setProject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await fetch(`/api/projects/${projectId}`);
                if (response.ok) {
                    const data = await response.json();
                    setProject(data);
                }
            } catch (error) {
                toast.error("Failed to load project details");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);

    const handleSaveEvaluation = async (scores: any, total: number) => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/evaluations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    scores,
                    totalScore: total,
                    maxScore: DEFAULT_CRITERIA.reduce((sum, c) => sum + c.maxScore * (c.weight / 100), 0),
                    feedback,
                    status: "DRAFT"
                }),
            });

            if (response.ok) {
                toast.success("Evaluation saved as draft");
            } else {
                throw new Error("Failed to save evaluation");
            }
        } catch (error) {
            toast.error("Error saving evaluation");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <BarChart4 className="h-12 w-12 animate-pulse text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading project data for evaluation...</p>
                </div>
            </div>
        );
    }

    if (!project) return <div>Project not found</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/faculty">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Evaluating: {project.name}</h1>
                            <p className="text-xs text-gray-500 uppercase font-mono tracking-tighter">ID: {projectId}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">Preview Evaluation</Button>
                        <Button className="bg-green-600 hover:bg-green-700">Publish Grades</Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Context & Data */}
                    <div className="lg:col-span-8 space-y-8">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 h-12">
                                <TabsTrigger value="overview" className="gap-2"><Info className="h-4 w-4" /> Overview</TabsTrigger>
                                <TabsTrigger value="contributions" className="gap-2"><BarChart4 className="h-4 w-4" /> Contributions</TabsTrigger>
                                <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Revisions</TabsTrigger>
                                <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Project Pitch & Description</CardTitle>
                                    </CardHeader>
                                    <CardContent className="prose max-w-none">
                                        <p>{project.description || "No description provided."}</p>
                                        <div className="mt-6">
                                            <h4 className="font-semibold mb-2">Attached Documents</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {project.documents?.map((doc: any) => (
                                                    <div key={doc.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                                                        <span className="font-medium text-sm">{doc.title}</span>
                                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="contributions" className="mt-6">
                                <div className="space-y-6">
                                    <div className="p-12 text-center bg-white rounded-lg border-2 border-dashed">
                                        <BarChart4 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500">Contribution visualizations will load here.</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="team" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Team Composition</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {project.members.map((member: any) => (
                                                <div key={member.id} className="flex items-center justify-between p-4 border rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                                                            {member.user.name?.[0] || "?"}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold">{member.user.name}</h4>
                                                            <p className="text-xs text-gray-500">{member.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant="outline" className="mb-1">Active</Badge>
                                                        <p className="text-xs text-gray-400">Joined Nov 2025</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                                    Detailed Feedback
                                </CardTitle>
                                <CardDescription>Provide constructive feedback to the team.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    placeholder="The project shows great promise in..."
                                    className="min-h-[200px] text-base"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Grading */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-24 space-y-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                                    <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                                    Grading Rubric
                                </h3>
                                <RubricScoring
                                    criteria={DEFAULT_CRITERIA}
                                    onSave={handleSaveEvaluation}
                                    isSubmitting={isSubmitting}
                                />
                            </div>

                            <Card className="bg-yellow-50 border-yellow-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-yellow-800">
                                        <AlertCircle className="h-4 w-4" />
                                        Evaluation Tip
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs text-yellow-700 leading-relaxed">
                                    CollabHack uses real-time contribution data. Check the **Contributions** tab to verify individual involvement before finalizing individual score adjustments.
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
