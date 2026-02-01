import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContributionBreakdown } from "@/lib/contributions";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contributions = await getContributionBreakdown(id);

        return NextResponse.json(contributions);
    } catch (error) {
        console.error("Error fetching contributions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
