const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
    try {
        const docs = await prisma.document.findMany({
            take: 5,
            select: {
                id: true,
                title: true,
                projectId: true
            }
        })
        console.log("Documents in DB:", JSON.stringify(docs, null, 2))
    } catch (error) {
        console.error("Error:", error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
