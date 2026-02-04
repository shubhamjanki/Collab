"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Member {
    id: string;
    userId: string;
    role: string;
    charactersAdded: number;
    charactersRemoved: number;
    editsCount: number;
    user: {
        name: string | null;
        email: string;
        image: string | null;
    };
}

interface TeamMemberListProps {
    members: Member[];
}

export function TeamMemberList({ members }: TeamMemberListProps) {
    const validMembers = members ? members.filter(member => member && member.user) : [];

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Edits</TableHead>
                        <TableHead className="text-right">Characters</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {validMembers.map((member) => (
                        <TableRow key={member.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.user.image || ""} />
                                        <AvatarFallback>
                                            {member.user.name?.[0] || member.user.email[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                            {member.user.name || "Unknown"}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                            {member.user.email}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                                    {member.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {member.editsCount}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                                <span className="text-green-600">+{member.charactersAdded}</span>
                                <span className="px-1 text-muted-foreground">/</span>
                                <span className="text-red-600">-{member.charactersRemoved}</span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
