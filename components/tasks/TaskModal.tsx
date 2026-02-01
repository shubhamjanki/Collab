"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TaskModalProps {
    projectId: string;
    task?: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: any) => void;
}

export function TaskModal({ projectId, task, isOpen, onClose, onSave }: TaskModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "TODO",
        assignedTo: "",
        dueDate: "",
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || "",
                description: task.description || "",
                status: task.status || "TODO",
                assignedTo: task.assignedTo || "",
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
            });
        } else {
            setFormData({
                title: "",
                description: "",
                status: "TODO",
                assignedTo: "",
                dueDate: "",
            });
        }
    }, [task, isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetch(`/api/projects/${projectId}`)
                .then(res => res.json())
                .then(data => setMembers(data.members))
                .catch(() => toast.error("Failed to load team members"));
        }
    }, [isOpen, projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const url = task ? `/api/tasks/${task.id}` : "/api/tasks";
            const method = task ? "PATCH" : "POST";

            const payload = {
                ...formData,
                projectId,
                assignedTo: formData.assignedTo === "unassigned" || formData.assignedTo === "" ? null : formData.assignedTo
            };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to save task");

            const savedTask = await response.json();
            toast.success(task ? "Task updated" : "Task created");
            onSave(savedTask);
            onClose();
        } catch (error) {
            toast.error("Error saving task");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Task title"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the task..."
                            className="min-h-[100px]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(v) => setFormData({ ...formData, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODO">To Do</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="DONE">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="assignee">Assign To</Label>
                        <Select
                            value={formData.assignedTo}
                            onValueChange={(v) => setFormData({ ...formData, assignedTo: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {members.map((m) => (
                                    <SelectItem key={m.user.id} value={m.user.id}>
                                        {m.user.name || m.user.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {task ? "Update Task" : "Create Task"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
