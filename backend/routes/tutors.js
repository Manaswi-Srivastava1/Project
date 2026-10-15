import express from "express";
import mongoose from "mongoose";
import Tutor from "../models/tutor.js";
import User from "../models/user.js";
import DemoRequest from "../models/demoRequest.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { sendDemoEmail } from "../utils/mailer.js";

const router = express.Router();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Sab dekh sakte hain: sirf verified tutors (phone/college nahi dikhta)
router.get("/tutors", async (req, res) => {
    try {
        const filter = { verified: true };
        const cls = Number(req.query.class);
        if (cls) filter.classes = cls;

        const q = (req.query.search || "").toString().trim();
        if (q) {
            const rx = new RegExp(escapeRegex(q), "i");
            filter.$or = [{ name: rx }, { subjects: rx }, { area: rx }, { course: rx }];
        }

        const tutors = await Tutor.find(filter)
            .select("name course subjects classes area fee mode lat lng")
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ tutors });
    } catch (e) {
        console.error(e.message);
        res.status(500).json({ message: "Could not load tutors" });
    }
});

// Tutor apni profile banata/edit karta hai
router.post("/tutors", requireAuth("tutor"), async (req, res) => {
    try {
        const { name, phone, college, course, subjects, classes, area, fee, mode, lat, lng } = req.body;

        const subjectList = Array.isArray(subjects) ? subjects : String(subjects || "").split(",");
        const cleanSubjects = subjectList.map((s) => String(s).trim()).filter(Boolean);
        const cleanClasses = (Array.isArray(classes) ? classes : [])
            .map(Number).filter((n) => n >= 1 && n <= 12);

        if (!name || !phone || !college || !course || !area || !mode ||
            !cleanSubjects.length || !cleanClasses.length || !(Number(fee) >= 0)) {
            return res.status(400).json({ message: "Please fill all fields correctly" });
        }

        const update = { name, phone, college, course, subjects: cleanSubjects, classes: cleanClasses,
              area, fee: Number(fee), mode, verified: false };

        // Location: lagbhag 1 km tak round karke save (privacy ke liye)
        const hasLoc = lat !== undefined && lat !== "" && lng !== undefined && lng !== "";
        const la = Number(lat), ln = Number(lng);
        if (hasLoc && Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
            update.lat = Math.round(la * 100) / 100;
            update.lng = Math.round(ln * 100) / 100;
        }

        const tutor = await Tutor.findOneAndUpdate(
            { user: req.user.userId },
            update,
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ message: "Profile submitted. It will appear after verification.", id: tutor._id });
    } catch (e) {
        console.error(e.message);
        res.status(500).json({ message: "Could not save profile" });
    }
});

// Tutor apni profile aur status dekhe
router.get("/tutors/me", requireAuth("tutor"), async (req, res) => {
    const tutor = await Tutor.findOne({ user: req.user.userId });
    res.json({ tutor });
});

// Parent demo request bheje (tutor ko email bhi jata hai)
router.post("/demo-requests", requireAuth("parent"), async (req, res) => {
    try {
        const { tutorId, parentPhone, message } = req.body;
        if (!mongoose.isValidObjectId(tutorId) || !parentPhone) {
            return res.status(400).json({ message: "Tutor and phone number are required" });
        }

        const tutor = await Tutor.findOne({ _id: tutorId, verified: true }).populate("user", "email");
        if (!tutor) return res.status(404).json({ message: "Tutor not found" });

        const parent = await User.findById(req.user.userId).select("name");

        await DemoRequest.create({
            tutor: tutorId,
            parent: req.user.userId,
            parentPhone: String(parentPhone).trim(),
            message: message ? String(message).trim().slice(0, 300) : undefined
        });

        res.status(201).json({ message: "Demo request sent" });

        // Email background mein: fail ho jaye to bhi request save rehti hai
        if (tutor.user && tutor.user.email) {
            sendDemoEmail({
                to: tutor.user.email,
                tutorName: tutor.name,
                parentName: parent ? parent.name : "Ek parent",
                parentPhone: String(parentPhone).trim(),
                message
            }).catch((err) => console.error("Email failed:", err.message));
        }
    } catch (e) {
        console.error(e.message);
        if (!res.headersSent) res.status(500).json({ message: "Could not send request" });
    }
});

// Tutor apni demo requests dekhe
router.get("/demo-requests/mine", requireAuth("tutor"), async (req, res) => {
    const tutor = await Tutor.findOne({ user: req.user.userId });
    if (!tutor) return res.json({ requests: [] });
    const requests = await DemoRequest.find({ tutor: tutor._id })
        .populate("parent", "name").sort({ createdAt: -1 });
    res.json({ requests });
});

// Admin (aap): pending tutors dekho aur verify karo
router.get("/admin/tutors/pending", requireAdmin, async (req, res) => {
    res.json({ tutors: await Tutor.find({ verified: false }) });
});

router.patch("/admin/tutors/:id/verify", requireAdmin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid id" });
    }
    const tutor = await Tutor.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!tutor) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Tutor verified", tutor });
});

export default router;