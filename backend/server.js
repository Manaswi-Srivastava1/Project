import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";

import User from "./models/user.js";
import tutorRoutes from "./routes/tutors.js";

const app = express();
const PORT = process.env.PORT || 3100;

// ================= MIDDLEWARE =================

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : true
}));
app.use(express.json());

// Zyada login/register try karne se rokna
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));
app.use("/api/auth/register", rateLimit({ windowMs: 60 * 60 * 1000, limit: 20 }));

app.use((req, res, next) => {
    console.log("Incoming request:", req.method, req.url);
    next();
});

// ================= BASIC ROUTES =================

app.get("/", (req, res) => {
    res.send("Walk In Tutor backend is running!");
});

app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "Backend API is working!" });
});

// ================= REGISTER =================

app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!["tutor", "parent"].includes(role)) {
            return res.status(400).json({ message: "Role must be tutor or parent" });
        }

        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const normalizedName = String(name).trim();
        const normalizedEmail = String(email).trim().toLowerCase();

        if (!normalizedName || !normalizedEmail) {
            return res.status(400).json({ message: "Name and email cannot be empty" });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: "Email is already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role
        });

        return res.status(201).json({
            message: "Registration successful",
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Email is already registered" });
        }
        console.error("Registration error:", error.message);
        return res.status(500).json({ message: "Registration failed" });
    }
});

// ================= LOGIN =================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({ message: "Login failed" });
    }
});

// ================= TUTOR ROUTES =================

app.use("/api", tutorRoutes);

// ================= START SERVER =================

async function startServer() {
    try {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing from .env");
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing from .env");

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log("Tutor routes loaded");
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();