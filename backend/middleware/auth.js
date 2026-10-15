import jwt from "jsonwebtoken";

export function requireAuth(role) {
    return (req, res, next) => {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;
        if (!token) return res.status(401).json({ message: "Please login first" });

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            if (role && payload.role !== role) {
                return res.status(403).json({ message: "Not allowed for your account type" });
            }
            req.user = payload;
            next();
        } catch {
            return res.status(401).json({ message: "Session expired, login again" });
        }
    };
}

export function requireAdmin(req, res, next) {
    if (!process.env.ADMIN_KEY || req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
        return res.status(403).json({ message: "Admin only" });
    }
    next();
}