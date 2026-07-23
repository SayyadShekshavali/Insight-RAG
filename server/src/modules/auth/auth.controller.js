import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pino from 'pino';
import User from '../users/user.model.js';
import Org from '../orgs/org.model.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Helper to generate access & refresh tokens
const generateTokens = (user) => {
  const payload = {
    userId: user._id,
    role: user.role,
    orgId: user.orgId
  };

  const accessSecret = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-32-chars-at-least-please-change-in-production';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-32-chars-at-least-please-change-in-production';

  const accessToken = jwt.sign(payload, accessSecret, { expiresIn: '30d' });
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: '90d' });

  return { accessToken, refreshToken };
};

export const signup = async (req, res) => {
  try {
    const { email, password, role, orgName, orgId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'DuplicateEmail',
        message: 'A user with this email address already exists.'
      });
    }

    let targetOrgId = orgId;

    // If orgName is provided, create a new organization
    if (orgName) {
      const newOrg = new Org({
        name: orgName,
        domainAllowlist: [email.split('@')[1]],
      });
      await newOrg.save();
      targetOrgId = newOrg._id;
      logger.info(`Created new organization '${orgName}' during signup`);
    } else {
      // Ensure provided orgId exists
      const existingOrg = await Org.findById(orgId);
      if (!existingOrg) {
        return res.status(404).json({
          error: 'OrgNotFound',
          message: 'The specified organization does not exist.'
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      email,
      passwordHash,
      role: role || 'employee',
      orgId: targetOrgId,
      status: 'active'
    });

    await newUser.save();
    logger.info(`Successfully signed up user: ${email} with role: ${newUser.role}`);

    const { accessToken, refreshToken } = generateTokens(newUser);

    return res.status(201).json({
      message: 'Signup successful',
      accessToken,
      refreshToken,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        orgId: newUser.orgId
      }
    });

  } catch (error) {
    logger.error(`Signup controller error: ${error.message}`);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'An error occurred during account registration.'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role = 'employee' } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email address is required.'
      });
    }

    const emailClean = email.trim().toLowerCase();
    const requestedRole = (role === 'admin' || emailClean.includes('admin')) ? 'admin' : 'employee';

    // Get default or first Org ID
    let defaultOrg = await Org.findOne();
    if (!defaultOrg) {
      defaultOrg = new Org({ name: 'Insight RAG Workspace', domainAllowlist: [] });
      await defaultOrg.save();
    }

    let user = await User.findOne({ email: emailClean });

    if (!user) {
      if (requestedRole === 'admin') {
        // Create a NEW, isolated organization for each new Admin!
        const adminPrefix = emailClean.split('@')[0];
        const formattedName = adminPrefix.charAt(0).toUpperCase() + adminPrefix.slice(1);
        
        const newAdminOrg = new Org({
          name: `${formattedName}'s Workspace`,
          domainAllowlist: [emailClean.split('@')[1] || 'default'],
        });
        await newAdminOrg.save();

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password || 'password123', salt);

        user = new User({
          email: emailClean,
          passwordHash,
          role: 'admin',
          orgId: newAdminOrg._id,
          status: 'active'
        });
        await user.save();
        logger.info(`Auto-provisioned new Admin account '${emailClean}' with isolated org '${newAdminOrg.name}' (${newAdminOrg._id})`);
      } else {
        // Employees MUST be added/invited by Admin first
        return res.status(401).json({
          error: 'UserNotInvited',
          message: 'This employee email has not been added or invited by your organization administrator yet. Do you want to log in as Admin?'
        });
      }
    } else {
      // Respect explicitly requested role selection on login screen
      user.role = role;

      // Isolate non-seed admin accounts from default seed org if logging in as Admin
      if (role === 'admin' && emailClean !== 'admin@insightrag.dev' && user.orgId?.toString() === '6a5f26d2834977f5e5560b85') {
        const adminPrefix = emailClean.split('@')[0];
        const formattedName = adminPrefix.charAt(0).toUpperCase() + adminPrefix.slice(1);
        const newAdminOrg = new Org({
          name: `${formattedName}'s Workspace`,
          domainAllowlist: [emailClean.split('@')[1] || 'default'],
        });
        await newAdminOrg.save();
        user.orgId = newAdminOrg._id;
        logger.info(`Migrated Admin '${emailClean}' to new isolated org '${newAdminOrg.name}' (${newAdminOrg._id})`);
      }

      user.status = 'active';
      user.lastActive = new Date();
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user);

    logger.info(`User logged in: ${emailClean} (${user.role})`);

    return res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        orgId: user.orgId
      }
    });

  } catch (error) {
    logger.error(`Login controller error: ${error.message}`);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'An error occurred during authentication.'
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        error: 'TokenRequired',
        message: 'Refresh token is required.'
      });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          error: 'InvalidRefreshToken',
          message: 'Refresh token is invalid or expired.'
        });
      }

      const user = await User.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        return res.status(401).json({
          error: 'UserUnavailable',
          message: 'User account is inactive or deleted.'
        });
      }

      const tokens = generateTokens(user);
      return res.json({
        message: 'Tokens rotated successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    });

  } catch (error) {
    logger.error(`Refresh controller error: ${error.message}`);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'An error occurred during token rotation.'
    });
  }
};

export const logout = async (req, res) => {
  // Client discards tokens on logout.
  return res.json({ message: 'Logout successful' });
};
