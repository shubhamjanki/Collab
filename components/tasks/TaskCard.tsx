"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MoreVertical, Edit2, Trash2, GripVertical, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskCardProps {
    task: any;
    onEdit?: (task: any) => void;
    onDelete?: (id: string) => void;
    onStatusChange?: (id: string, status: string) => void;
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: "Task",
            task,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30 bg-gray-100 rounded-lg h-32 border-2 border-dashed border-indigo-200"
            />
        );
    }

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className="group hover:shadow-md transition-shadow bg-white border-gray-200"
        >
            <div className="flex">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="p-2 flex items-center justify-center text-gray-300 hover:text-indigo-600 cursor-grab active:cursor-grabbing border-r border-gray-50"
                >
                    <GripVertical className="h-4 w-4" />
                </div>
                <CardContent className="p-4 flex-1 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                        <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {task.title}
                        </h4>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => onEdit?.(task)}>
                                    <Edit2 className="h-4 w-4 mr-2" /> Edit Task
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Move to:</div>
                                <DropdownMenuItem onClick={() => onStatusChange?.(task.id, "TODO")} disabled={task.status === "TODO"}>
                                    To Do
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange?.(task.id, "IN_PROGRESS")} disabled={task.status === "IN_PROGRESS"}>
                                    In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange?.(task.id, "DONE")} disabled={task.status === "DONE"}>
                                    Done
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => onDelete?.(task.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Task
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                            {task.description}
                        </p>
                    )}

                    <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center gap-2">
                            {task.assignee ? (
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 border border-indigo-100">
                                        <AvatarImage src={task.assignee.image || ""} />
                                        <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-700">
                                            {task.assignee.name?.[0] || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] font-medium text-gray-600 truncate max-w-[80px]">
                                        {task.assignee.name || "Member"}
                                    </span>
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-[9px] font-normal text-gray-400 border-gray-100">
                                    Unassigned
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {task.dueDate && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 mr-2">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(task.dueDate), "MMM d")}
                                </div>
                            )}
                            {task.status !== "DONE" && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 px-2 text-[10px] gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const nextStatus = task.status === "TODO" ? "IN_PROGRESS" : "DONE";
                                        onStatusChange?.(task.id, nextStatus);
                                    }}
                                >
                                    {task.status === "TODO" ? (
                                        <>
                                            Start <ArrowRight className="h-3 w-3" />
                                        </>
                                    ) : (
                                        <>
                                            Done <CheckCircle2 className="h-3 w-3" />
                                        </>
                                    )}
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] px-1.5 py-0 h-5 font-normal cursor-pointer hover:opacity-80 transition-opacity ${task.status === "DONE" ? "bg-green-50 text-green-700 border-green-200" :
                                            task.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                "bg-gray-50 text-gray-600 border-gray-200"
                                            }`}
                                    >
                                        {task.status.replace("_", " ")}
                                    </Badge>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onStatusChange?.(task.id, "TODO")} disabled={task.status === "TODO"}>To Do</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange?.(task.id, "IN_PROGRESS")} disabled={task.status === "IN_PROGRESS"}>In Progress</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange?.(task.id, "DONE")} disabled={task.status === "DONE"}>Done</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}
