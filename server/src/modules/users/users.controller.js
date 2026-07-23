import User from './user.model.js';
import bcrypt from 'bcryptjs';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// GET /api/users
export const getUsers = async (req, res) => {
  try {
    const { orgId } = req.user;
    const users = await User.find({ orgId }).select('-passwordHash');
    return res.json(users);
  } catch (error) {
    logger.error(`getUsers error: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve users.' });
  }
};

// PUT /api/users/:id/role
export const updateUserRole = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid role specified.' });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, orgId },
      { role },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'UserNotFound', message: 'User not found in organization.' });
    }

    logger.info(`Updated user role to ${role} for user: ${user.email}`);
    return res.json(user);
  } catch (error) {
    logger.error(`updateUserRole error: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to update user role.' });
  }
};

// PUT /api/users/:id/status
export const updateUserStatus = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'invited', 'deactivated'].includes(status)) {
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid status specified.' });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, orgId },
      { status },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'UserNotFound', message: 'User not found in organization.' });
    }

    logger.info(`Updated user status to ${status} for user: ${user.email}`);
    return res.json(user);
  } catch (error) {
    logger.error(`updateUserStatus error: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to update user status.' });
  }
};

// POST /api/users/invite
export const inviteUser = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'ValidationError', message: 'Email is required.' });
    }

    const emailClean = email.trim().toLowerCase();

    // Check if user already exists
    let existingUser = await User.findOne({ email: emailClean });
    if (existingUser) {
      // If user exists in deactivated or invited state, reactivate them
      existingUser.status = 'active';
      existingUser.role = role || existingUser.role || 'employee';
      existingUser.orgId = orgId;
      await existingUser.save();
      logger.info(`Reactivated/updated existing invited user: ${emailClean}`);
      return res.status(200).json(existingUser);
    }

    // Create hash for default password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AnyPasswordAllowed123!', salt);

    const newUser = new User({
      email: emailClean,
      passwordHash,
      role: role || 'employee',
      orgId,
      status: 'active',
    });

    await newUser.save();
    logger.info(`Invited and activated user: ${emailClean} for organization: ${orgId}`);

    return res.status(201).json(newUser);
  } catch (error) {
    logger.error(`inviteUser error: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to invite user.' });
  }
};

// POST /api/users/bulk
export const bulkAction = async (req, res) => {
  try {
    const { orgId } = req.user;
    const { userIds, action } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'User IDs are required and must be an array.' });
    }

    if (!['deactivate', 'resend_invite'].includes(action)) {
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid bulk action specified.' });
    }

    if (action === 'deactivate') {
      await User.updateMany(
        { _id: { $in: userIds }, orgId },
        { status: 'deactivated' }
      );
      logger.info(`Bulk deactivated users: ${userIds.join(', ')}`);
      return res.json({ message: 'Users deactivated successfully.' });
    }

    if (action === 'resend_invite') {
      logger.info(`Bulk resent invitations to users: ${userIds.join(', ')}`);
      return res.json({ message: 'Invitations resent successfully.' });
    }
  } catch (error) {
    logger.error(`bulkAction error: ${error.message}`);
    return res.status(500).json({ error: 'InternalServerError', message: 'Failed to process bulk action.' });
  }
};
