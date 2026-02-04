"use client";

interface ProjectCardProps {
    project: {
        id: string;
        name: string;
        description: string | null;
        updatedAt: Date;
        members: Array<{
            user: {
                name: string | null;
                image: string | null;
            };
        }>;
        _count: {
            documents: number;
            chat: number;
        };
    };
}

export default function ProjectCard({ project }: ProjectCardProps) {
    return (
        <a
            href={`/projects/${project.id}`}
            className="block bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4 hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                    {project.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                    <span>{project._count.documents} docs</span>
                    <span>{project._count.chat} messages</span>
                </div>
                <div className="flex -space-x-2">
                    {project.members
                        .filter((member) => member.user)
                        .slice(0, 3)
                        .map((member, idx) => (
                        <div
                            key={idx}
                            className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold border-2 border-white"
                        >
                            {member.user.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                    ))}
                    {project.members.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-semibold border-2 border-white">
                            +{project.members.filter(m => m.user).length - 3}
                        </div>
                    )}
                </div>
            </div>
        </a>
    );
}
