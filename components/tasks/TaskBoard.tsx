"use client";

import { useState, useMemo } from "react";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layout, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pusherClient } from "@/lib/pusher";
import { useEffect } from "react";

interface TaskBoardProps {
    projectId: string;
    initialTasks?: any[];
}

const COLUMNS = [
    { id: "TODO", title: "To Do" },
    { id: "IN_PROGRESS", title: "In Progress" },
    { id: "DONE", title: "Done" },
];

export function TaskBoard({ projectId, initialTasks = [] }: TaskBoardProps) {
    const [tasks, setTasks] = useState<any[]>(initialTasks);
    const [activeTask, setActiveTask] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);

    // Pusher Subscription & Polling Fallback
    useEffect(() => {
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const isConfigured = pusherKey && pusherKey !== "your-key";
        let pollInterval: NodeJS.Timeout | null = null;

        if (isConfigured) {
            const channel = pusherClient.subscribe(`project-${projectId}`);

            channel.bind("task-created", (newTask: any) => {
                setTasks((prev) => {
                    if (prev.find(t => t.id === newTask.id)) return prev;
                    return [...prev, newTask];
                });
            });

            channel.bind("task-updated", (updatedTask: any) => {
                setTasks((prev) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
            });

            channel.bind("task-deleted", ({ id }: { id: string }) => {
                setTasks((prev) => prev.filter(t => t.id !== id));
            });
        } else {
            console.warn("Tasks: Pusher not configured, falling back to polling.");
            pollInterval = setInterval(() => {
                fetch(`/api/tasks?projectId=${projectId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) setTasks(data);
                    })
                    .catch(console.error);
            }, 5000);
        }

        return () => {
            if (isConfigured) pusherClient.unsubscribe(`project-${projectId}`);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [projectId]);

    // Fetch tasks if not provided
    useEffect(() => {
        if (initialTasks.length === 0) {
            setIsLoading(true);
            fetch(`/api/tasks?projectId=${projectId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setTasks(data);
                    }
                    setIsLoading(false);
                })
                .catch(() => {
                    toast.error("Failed to load tasks");
                    setIsLoading(false);
                });
        }
    }, [projectId, initialTasks.length]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const tasksByColumn = useMemo(() => {
        const grouped: Record<string, any[]> = {
            TODO: [],
            IN_PROGRESS: [],
            DONE: [],
        };
        tasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });
        // Sort each column by order
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => a.order - b.order);
        });
        return grouped;
    }, [tasks]);

    const onDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === "Task") {
            setActiveTask(event.active.data.current.task);
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveATask = active.data.current?.type === "Task";
        const isOverATask = over.data.current?.type === "Task";

        if (!isActiveATask) return;

        // Im dropping a task over another task
        if (isActiveATask && isOverATask) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const overIndex = tasks.findIndex((t) => t.id === overId);

                const newTasks = [...tasks];
                if (newTasks[activeIndex].status !== newTasks[overIndex].status) {
                    newTasks[activeIndex] = { ...newTasks[activeIndex], status: newTasks[overIndex].status };
                    return arrayMove(newTasks, activeIndex, overIndex - 1);
                }

                return arrayMove(newTasks, activeIndex, overIndex);
            });
        }

        const isOverAColumn = over.id in tasksByColumn;

        // Im dropping a task over a column
        if (isActiveATask && isOverAColumn) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const newTasks = [...tasks];
                newTasks[activeIndex] = { ...newTasks[activeIndex], status: overId.toString() };
                return arrayMove(newTasks, activeIndex, activeIndex);
            });
        }
    };

    const onDragEnd = async (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const task = tasks.find(t => t.id === activeId);
        if (!task) return;

        // Update backend with new status and order
        try {
            await fetch(`/api/tasks/${activeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: task.status,
                    order: tasks.filter(t => t.status === task.status).indexOf(task)
                }),
            });
        } catch (error) {
            toast.error("Failed to sync task order");
        }
    };

    const handleAddTask = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const handleEditTask = (task: any) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;

        try {
            const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setTasks(tasks.filter(t => t.id !== id));
            toast.success("Task deleted");
        } catch (error) {
            toast.error("Failed to delete task");
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task || task.status === newStatus) return;

        // Optimistic update
        const updatedTask = { ...task, status: newStatus };
        setTasks(tasks.map(t => t.id === id ? updatedTask : t));

        try {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error();
            toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
        } catch (error) {
            toast.error("Failed to move task");
            // Rollback
            setTasks(tasks.map(t => t.id === id ? task : t));
        }
    };

    const handleSaveTask = (savedTask: any) => {
        if (editingTask) {
            setTasks(tasks.map(t => t.id === savedTask.id ? savedTask : t));
        } else {
            setTasks([...tasks, savedTask]);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Layout className="h-5 w-5 text-indigo-600" />
                    Project Board
                </h3>
                <Button size="sm" className="gap-2" onClick={handleAddTask}>
                    <Plus className="h-4 w-4" /> Add Task
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-4 h-full">
                    {COLUMNS.map((column) => (
                        <div
                            key={column.id}
                            className="flex flex-col flex-1 min-w-[300px] bg-gray-100/50 rounded-xl p-4"
                        >
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                                        {column.title}
                                    </h4>
                                    <Badge variant="secondary" className="bg-white text-gray-500 font-mono text-[10px]">
                                        {tasksByColumn[column.id].length}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-[500px]">
                                <SortableContext
                                    items={tasksByColumn[column.id].map((t) => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {tasksByColumn[column.id].map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onEdit={handleEditTask}
                                            onDelete={handleDeleteTask}
                                            onStatusChange={handleStatusChange}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        </div>
                    ))}
                </div>

                <DragOverlay>
                    {activeTask ? <TaskCard task={activeTask} /> : null}
                </DragOverlay>
            </DndContext>

            <TaskModal
                projectId={projectId}
                task={editingTask}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
            />
        </div>
    );
}
