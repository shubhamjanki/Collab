export interface VideoCallParticipant {
    userId: string;
    userName: string;
    peerId?: string;
    joinedAt: number;
}

const participantsByProject = new Map<string, Map<string, VideoCallParticipant>>();

const getProjectParticipants = (projectId: string) => {
    if (!participantsByProject.has(projectId)) {
        participantsByProject.set(projectId, new Map());
    }
    return participantsByProject.get(projectId)!;
};

export const addParticipant = (
    projectId: string,
    userId: string,
    userName: string,
    peerId?: string
) => {
    const participants = getProjectParticipants(projectId);
    participants.set(userId, {
        userId,
        userName,
        peerId,
        joinedAt: participants.get(userId)?.joinedAt || Date.now(),
    });
};

export const touchParticipant = (
    projectId: string,
    userId: string,
    userName?: string,
    peerId?: string
) => {
    const participants = getProjectParticipants(projectId);
    const existing = participants.get(userId);
    if (existing) {
        participants.set(userId, {
            ...existing,
            userName: userName || existing.userName,
            peerId: peerId || existing.peerId,
        });
    }
};

export const removeParticipant = (projectId: string, userId: string) => {
    const participants = getProjectParticipants(projectId);
    participants.delete(userId);
};

export const listParticipants = (projectId: string) => {
    const participants = getProjectParticipants(projectId);
    return Array.from(participants.values()).sort((a, b) => a.joinedAt - b.joinedAt);
};
