import mongoose from "mongoose";

const demoSchema = new mongoose.Schema({
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    parentPhone: { type: String, required: true, trim: true },
    message: { type: String, trim: true, maxlength: 300 }
}, { timestamps: true });

export default mongoose.model("DemoRequest", demoSchema);