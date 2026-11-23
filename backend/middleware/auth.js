const User = require('../models/User');
const { verifyToken } = require('../services/tokens');
const { AppError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

/** Loads the user for a decoded token and enforces revocation (tokenVersion). */
async function userFromToken(decoded, select = '-password') {
  const user = await User.findById(decoded.id).select(select);
  if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) return null;
  return user;
}

const protect = asyncHandler(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) throw new AppError(401, 'Not authorized');
  let decoded;
  try {
    decoded = verifyToken(auth.slice(7), 'access');
  } catch {
    throw new AppError(401, 'Invalid or expired token', { code: 'token_expired' });
  }
  const user = await userFromToken(decoded);
  if (!user) throw new AppError(401, 'Invalid or expired token', { code: 'token_expired' });
  req.user = user;
  next();
});

module.exports = { protect, userFromToken };
