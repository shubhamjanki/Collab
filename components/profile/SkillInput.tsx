"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SkillInputProps {
    value: string[];
    onChange: (value: string[]) => void;
}

export function SkillInput({ value, onChange }: SkillInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addSkill();
        }
    };

    const addSkill = () => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue && !value.includes(trimmedValue)) {
            onChange([...value, trimmedValue]);
            setInputValue("");
        }
    };

    const removeSkill = (skillToRemove: string) => {
        onChange(value.filter((skill) => skill !== skillToRemove));
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {value.map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1 gap-1">
                        {skill}
                        <button
                            onClick={() => removeSkill(skill)}
                            className="ml-1 hover:text-destructive focus:outline-none"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    placeholder="Add a skill (e.g. Next.js, Python)"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addSkill}
                    disabled={!inputValue.trim()}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
