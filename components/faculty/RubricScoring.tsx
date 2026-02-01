"use client";

import { useState } from "react";
import { Star, ChevronRight, CheckCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface Criterion {
    id: string;
    name: string;
    weight: number;
    maxScore: number;
    description: string;
}

interface RubricScoringProps {
    criteria: Criterion[];
    onSave: (scores: Record<string, number>, total: number) => void;
    isSubmitting?: boolean;
}

export function RubricScoring({ criteria, onSave, isSubmitting = false }: RubricScoringProps) {
    const [scores, setScores] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        criteria.forEach((c) => (initial[c.name] = 0));
        return initial;
    });

    const totalScore = criteria.reduce((sum, c) => {
        return sum + (scores[c.name] || 0) * (c.weight / 100);
    }, 0);

    const maxPossible = criteria.reduce((sum, c) => sum + c.maxScore * (c.weight / 100), 0);

    const handleScoreChange = (name: string, value: number[]) => {
        setScores((prev) => ({ ...prev, [name]: value[0] }));
    };

    return (
        <div className="space-y-6">
            {criteria.map((criterion) => (
                <Card key={criterion.id || criterion.name} className="border-l-4 border-l-indigo-500">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{criterion.name}</CardTitle>
                                <CardDescription>{criterion.description}</CardDescription>
                            </div>
                            <div className="text-2xl font-bold text-indigo-600">
                                {scores[criterion.name] || 0}
                                <span className="text-xs text-gray-400 ml-1">/ {criterion.maxScore}</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Slider
                                value={[scores[criterion.name] || 0]}
                                max={criterion.maxScore}
                                step={1}
                                onValueChange={(val) => handleScoreChange(criterion.name, val)}
                                className="py-4"
                            />
                            <div className="flex justify-between text-xs text-gray-400 px-1 font-mono">
                                <span>0</span>
                                <span>{criterion.maxScore / 2}</span>
                                <span>{criterion.maxScore}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Card className="bg-indigo-900 text-white shadow-xl">
                <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-indigo-200 text-sm uppercase tracking-wider font-semibold">Total weighted Score</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-5xl font-bold">{totalScore.toFixed(1)}</h2>
                                <span className="text-indigo-300">/ {maxPossible.toFixed(1)}</span>
                            </div>
                        </div>
                        <Button
                            size="lg"
                            className="bg-white text-indigo-900 hover:bg-indigo-50 gap-2 font-bold"
                            onClick={() => onSave(scores, totalScore)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Star className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Save Evaluation
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
