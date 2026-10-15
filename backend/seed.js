import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "./models/user.js";
import Tutor from "./models/tutor.js";

// lat/lng sirf lagbhag (sample) hain
const samples = [
    { name: "Manaswi Srivastava", email: "manaswi@example.com", course: "BCA 3rd Year",
      subjects: ["Maths", "Science"], classes: [6, 7, 8, 9, 10], area: "Kunraghat", fee: 2000, lat: 26.74, lng: 83.41 },
    { name: "Jiya Jaiswal", email: "jiya@example.com", course: "BCA 3rd Year",
      subjects: ["Maths", "Physics"], classes: [8, 9, 10, 11, 12], area: "Deoria", fee: 1800, lat: 26.50, lng: 83.78 },
    { name: "Soumya Dwivedi", email: "soumya@example.com", course: "BCA 3rd Year",
      subjects: ["English", "Hindi"], classes: [5, 6, 7, 8], area: "Sadar", fee: 1500, lat: 27.88, lng: 79.91 },
    { name: "Neha Gupta", email: "neha@example.com", course: "B.A. 3rd Year",
      subjects: ["English", "Social Science"], classes: [5, 6, 7, 8, 9], area: "Kannauj", fee: 1600, lat: 27.05, lng: 79.92 }
];

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    for (const s of samples) {
        let user = await User.findOne({ email: s.email });

        if (!user) {
            const password = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12);
            user = await User.create({ name: s.name, email: s.email, password, role: "tutor" });
        }

        await Tutor.findOneAndUpdate(
            { user: user._id },
            {
                user: user._id,
                name: s.name,
                phone: "0000000000",
                college: "Sample College",
                course: s.course,
                subjects: s.subjects,
                classes: s.classes,
                area: s.area,
                fee: s.fee,
                lat: s.lat,
                lng: s.lng,
                mode: "At Student's Home",
                verified: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log("Added:", s.name);
    }

    await mongoose.disconnect();
    console.log("Done!");
}

run().catch(function (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
});