const { validateToken } = require("../services/authentication");

function checkForAuthenticationCookie(cookieName) {
    return (req, res, next) => {
        const tokenCookieValue = req.cookies[cookieName];

        // No token = guest user
        if (!tokenCookieValue) {
            req.user = null;
            return next();
        }

        try {
            const userPayload = validateToken(tokenCookieValue);

            if (userPayload) {
                req.user = userPayload;
            } else {
                req.user = null;
                // Optional: Clear invalid cookie
                // res.clearCookie(cookieName);
            }
        } catch (error) {
            console.error("Token validation failed:", error.message);
            req.user = null;
            // res.clearCookie(cookieName);   // Uncomment if you want to clear bad tokens
        }

        next();
    };
}

// Add this function
const restrictTo = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.redirect("/user/signin");
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).send("Access Denied: Admins Only");
        }
        next();
    };
};

module.exports = { checkForAuthenticationCookie, restrictTo };
