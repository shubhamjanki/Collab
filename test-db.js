require('dotenv').config()
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()


async function main() {
    try {
        const email = `test-manual-${Date.now()}@example.com`
        const user = await prisma.user.create({
            data: {
                email: email,
                name: "Test Manual",
            },
        })
        console.log("User created:", user)
    } catch (error) {
        console.error("FULL ERROR:", JSON.stringify(error, null, 2))
        console.error("MESSAGE:", error.message)
        console.error("CODE:", error.code)
    } finally {
        await prisma.$disconnect()
    }
}

main()
