import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id, accountType = 'local') => {
    return jwt.sign({ id, accountType }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

const isDuplicateKeyError = (error) => error?.code === 11000;

const logServerError = (scope, error) => {
    console.error(`[${scope}]`, error?.message || error);
};

const parseName = (displayName = '') => {
    const parts = displayName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) {
        return { firstName: 'Guest', lastName: 'User' };
    }
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: 'User' };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
};

const verifyGoogleIdToken = async (idToken) => {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
        throw new Error('Invalid Google token');
    }

    const tokenData = await response.json();
    if (!(tokenData.email_verified === 'true' || tokenData.email_verified === true)) {
        throw new Error('Google account email is not verified');
    }

    // If GOOGLE_CLIENT_ID is configured, enforce audience match for stronger validation.
    if (process.env.GOOGLE_CLIENT_ID && tokenData.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Google token audience mismatch');
    }

    return tokenData;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            password
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                accountType: 'local',
                token: generateToken(user._id, 'local')
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        logServerError('registerUser', error);
        if (isDuplicateKeyError(error)) {
            return res.status(400).json({ message: 'User already exists' });
        }
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                accountType: 'local',
                token: generateToken(user._id, 'local')
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        logServerError('loginUser', error);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
};

// @desc    Authenticate or register a Google user
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
    try {
        const { idToken, googleId: rawGoogleId, email: rawEmail, displayName, photoURL } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: 'Google idToken is required' });
        }

        const tokenData = await verifyGoogleIdToken(idToken);
        const googleId = tokenData.sub || rawGoogleId;
        const email = (tokenData.email || rawEmail || '').toLowerCase();

        if (!googleId || !email) {
            return res.status(400).json({ message: 'Invalid Google account payload' });
        }

        let googleUser = await GoogleUser.findOne({ $or: [{ googleId }, { email }] });
        if (!googleUser) {
            const parsed = parseName(tokenData.name || displayName || 'Guest User');
            googleUser = await GoogleUser.create({
                googleId,
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                email,
                photoURL: tokenData.picture || photoURL || '',
            });
        } else {
            if (googleUser.googleId !== googleId) {
                googleUser.googleId = googleId;
            }
            if (!googleUser.photoURL && (tokenData.picture || photoURL)) {
                googleUser.photoURL = tokenData.picture || photoURL;
            }
            await googleUser.save();
        }

        res.status(200).json({
            _id: googleUser._id,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            email: googleUser.email,
            phone: googleUser.phone,
            role: googleUser.role,
            photoURL: googleUser.photoURL,
            accountType: 'google',
            token: generateToken(googleUser._id, 'google'),
        });
    } catch (error) {
        logServerError('googleAuth', error);
        if (
            error?.message === 'Invalid Google token' ||
            error?.message === 'Google account email is not verified' ||
            error?.message === 'Google token audience mismatch'
        ) {
            return res.status(401).json({ message: error.message });
        }
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({ message: 'Google account already exists. Please sign in again.' });
        }
        res.status(500).json({ message: 'Google authentication failed. Please try again.' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const model = req.user?.accountType === 'google' ? GoogleUser : User;
        const user = await model.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                photoURL: user.photoURL || '',
                accountType: req.user?.accountType || 'local',
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        logServerError('getUserProfile', error);
        res.status(500).json({ message: 'Failed to load profile.' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    try {
        const isGoogleUser = req.user?.accountType === 'google';
        const model = isGoogleUser ? GoogleUser : User;
        const user = await model.findById(req.user._id);

        if (user) {
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.phone = req.body.phone || user.phone;

            if (!isGoogleUser && req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                photoURL: updatedUser.photoURL || '',
                accountType: isGoogleUser ? 'google' : 'local',
                token: generateToken(updatedUser._id, isGoogleUser ? 'google' : 'local')
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        logServerError('updateUserProfile', error);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
};