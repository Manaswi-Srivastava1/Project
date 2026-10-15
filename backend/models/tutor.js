import mongoose from "mongoose";

const tutorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },   // private
    college: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    subjects: { type: [String], required: true },
    classes: { type: [Number], required: true },            // e.g. [6,7,8,9,10]
    area: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    mode: { type: String, enum: ["At Student's Home", "At Tutor's Home", "Online"], required: true },
    verified: { type: Boolean, default: false }             // only admin can set true
}, { timestamps: true });

export default mongoose.model("Tutor", tutorSchema);