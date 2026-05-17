const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET         || 'super_secret_access_key_min32chars!!';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_min32chars!';
const ACCESS_EXPIRES  = process.env.JWT_EXPIRES_IN         || '8h';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate an access token for the given user
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
};

/**
 * Generate a refresh token for the given user
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
};

/**
 * Generate both access + refresh tokens at once
 * (used by auth.controller.js)
 */
const generateTokenPair = (user) => {
  return {
    accessToken:  generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

/**
 * Verify an access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verify a refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
};