import { prisma } from "@/lib/prisma";

type ContributionType = "edit" | "chat" | "task";

interface ContributionData {
    charsAdded?: number;
    charsRemoved?: number;
}

export async function trackContribution(
    userId: string,
    projectId: string,
    type: ContributionType,
    data: ContributionData = {}
) {
    // Simple tracking - increment counters
    await prisma.projectMember.upsert({
        where: {
            projectId_userId: {
                projectId,
                userId,
            },
        },
        update: {
            lastActive: new Date(),
            editsCount: {
                increment: type === "edit" ? 1 : 0,
            },
            charactersAdded: {
                increment: type === "edit" ? data.charsAdded || 0 : 0,
            },
            charactersRemoved: {
                increment: type === "edit" ? data.charsRemoved || 0 : 0,
            },
        },
        create: {
            projectId,
            userId,
            role: "MEMBER",
            editsCount: type === "edit" ? 1 : 0,
            charactersAdded: type === "edit" ? data.charsAdded || 0 : 0,
            charactersRemoved: type === "edit" ? data.charsRemoved || 0 : 0,
        },
    });

    // Daily snapshot
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.contributionSnapshot.upsert({
        where: {
            projectId_userId_date: {
                projectId,
                userId,
                date: today,
            },
        },
        update: {
            documentsEdited: {
                increment: type === "edit" ? 1 : 0,
            },
            charactersAdded: {
                increment: type === "edit" ? data.charsAdded || 0 : 0,
            },
            chatMessages: {
                increment: type === "chat" ? 1 : 0,
            },
            tasksCompleted: {
                increment: type === "task" ? 1 : 0,
            },
        },
        create: {
            projectId,
            userId,
            date: today,
            documentsEdited: type === "edit" ? 1 : 0,
            charactersAdded: type === "edit" ? data.charsAdded || 0 : 0,
            chatMessages: type === "chat" ? 1 : 0,
            tasksCompleted: type === "task" ? 1 : 0,
        },
    });
}

// Calculate contribution percentages
export async function getContributionBreakdown(projectId: string) {
    const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: { user: true },
    });

    const totalEdits = members.reduce((sum: number, m: any) => sum + m.editsCount, 0);
    const totalChars = members.reduce((sum: number, m: any) => sum + m.charactersAdded, 0);

    return members.map((member: any) => ({
        user: member.user,
        editsCount: member.editsCount,
        charactersAdded: member.charactersAdded,
        charactersRemoved: member.charactersRemoved,
        contributionPercentage: totalEdits > 0
            ? Math.round((member.editsCount / totalEdits) * 100)
            : 0,
        characterPercentage: totalChars > 0
            ? Math.round((member.charactersAdded / totalChars) * 100)
            : 0,
    }));
}

// Get contribution history for a user in a project
export async function getContributionHistory(
    projectId: string,
    userId: string,
    days: number = 7
) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const snapshots = await prisma.contributionSnapshot.findMany({
        where: {
            projectId,
            userId,
            date: {
                gte: startDate,
            },
        },
        orderBy: {
            date: "asc",
        },
    });

    return snapshots;
}
