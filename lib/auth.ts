import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        // Email/Password (for MVP)
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                });

                if (!user) {
                    // Creating a new user (registration flow)
                    const hashedPassword = await bcrypt.hash(credentials.password, 12);
                    const newUser = await prisma.user.create({
                        data: {
                            email: credentials.email,
                            password: hashedPassword,
                            name: (credentials as any).name || credentials.email.split("@")[0],
                            role: (credentials as any).role || "STUDENT",
                        },
                    });
                    return newUser;
                }

                // Verify password for existing users
                if (!user.password) {
                    // User exists but has no password (might be OAuth user)
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                
                if (!isPasswordValid) {
                    return null;
                }

                return user;
            },
        }),

        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },        async redirect({ url, baseUrl }) {
            // Role-based redirect after login
            return url.startsWith(baseUrl) ? url : baseUrl + "/dashboard";
        },    },
};
