"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "STUDENT" as "STUDENT" | "FACULTY" | "ORGANIZER",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            // Sign in will create user if doesn't exist (as per auth.ts logic)
            const result = await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                name: formData.name,
                role: formData.role,
                redirect: false,
            });

            if (result?.error) {
                setError("Registration failed");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                    <p className="text-gray-600">Join CollabHack and start collaborating</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                            I am a...
                        </label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as "STUDENT" | "FACULTY" | "ORGANIZER" })}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
                        >
                            <option value="STUDENT">Student</option>
                            <option value="FACULTY">Faculty/Teacher</option>
                            <option value="ORGANIZER">Hackathon Organizer</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{" "}
                        <a href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
