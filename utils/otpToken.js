import crypto from 'crypto';

// Secret key for HMAC signing — uses env variable or fallback
const SECRET = process.env.OTP_SECRET || 'dutch-point-hotel-otp-secret-key-2025';

// Time window in seconds (60 seconds)
const WINDOW_SIZE = 60;

/**
 * Get the current time window (Unix timestamp rounded down to nearest WINDOW_SIZE)
 */
const getCurrentWindow = () => Math.floor(Date.now() / 1000 / WINDOW_SIZE);

/**
 * Generate HMAC signature for a given employeeId + timeWindow
 */
const sign = (employeeId, timeWindow) => {
    return crypto
        .createHmac('sha256', SECRET)
        .update(`${employeeId}:${timeWindow}`)
        .digest('hex')
        .slice(0, 8); // Shortened to 8 chars for compact QR
};

/**
 * Generate a time-based OTP token for an employee
 * Format: "EMP-001:1746556800:a3f9c2d1"
 */
export const generateToken = (employeeId) => {
    const window = getCurrentWindow();
    const sig = sign(employeeId, window);
    return `${employeeId}:${window}:${sig}`;
};

/**
 * Verify a scanned OTP token
 * Accepts current window AND previous window (±1 grace period = up to 120s leeway)
 * Returns { valid: true, employeeId } or { valid: false, reason }
 */
export const verifyToken = (token) => {
    if (!token || typeof token !== 'string') {
        return { valid: false, reason: 'Invalid token format' };
    }

    const parts = token.split(':');

    // New OTP format: "EMP-001:1746556800:a3f9c2d1"
    if (parts.length === 3) {
        const match = token.match(/^(.+):(\d+):([a-f0-9]+)$/);
        if (!match) {
            return { valid: false, reason: 'Token parse error' };
        }

        const employeeId = match[1];
        const tokenWindow = parseInt(match[2]);
        const sig = match[3];
        const currentWindow = getCurrentWindow();

        // Accept current and previous window (grace period of up to 2 minutes)
        const isWindowValid = Math.abs(currentWindow - tokenWindow) <= 1;
        if (!isWindowValid) {
            return { valid: false, reason: 'QR code has expired. Please refresh.' };
        }

        // Verify HMAC signature against the token's own time window
        const expectedSig = sign(employeeId, tokenWindow);
        if (sig !== expectedSig) {
            return { valid: false, reason: 'Invalid QR signature' };
        }

        return { valid: true, employeeId };
    }

    // Old static format (plain employeeId like "EMP-001") — REJECT
    return { valid: false, reason: 'Static QR codes are no longer accepted. Please use the live QR from your employee dashboard.' };
};
