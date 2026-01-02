const User = require('../database/models/User');
const { generateToken } = require('../utils/jwt');
const { validateLoginInput, validateRegisterInput } = require('../utils/validation');
const AuditLog = require('../database/models/AuditLog');

let AuthService;
let AppError;

const getAuthService = () => {
  if (!AuthService) {
    AuthService = require('../services/AuthService');
  }
  return new AuthService();
};

const getAppError = () => {
  if (!AppError) {
    ({ AppError } = require('../utils/errors'));
  }
  return AppError;
};

const authController = {
  /**
   * Register endpoint
   */
  async register(req, res) {
    try {
      console.log("when rgister then not store in db why?",req.body);
      
      const { username, email, password } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;

      // Validate input
      const validation = validateRegisterInput(username, email, password);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          message: validation.errors.join(', '),
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: existingUser.email === email ? 'Email already registered' : 'Username already taken',
        });
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        role: 'user',
        tenantId: req.body.tenantId || null,
      });

      await user.save();

      // Log audit event
      await AuditLog.create({
        userId: user._id,
        ip: clientIp,
        endpoint: '/api/auth/register',
        action: 'REGISTER',
        status: 'SUCCESS',
        timestamp: new Date(),
      });

      const token = generateToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to register user',
      });
    }
  },

  /**
   * Login endpoint
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress;

      // Validate input
      const validation = validateLoginInput(email, password);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          message: validation.errors.join(', '),
        });
      }

      // Find user by email and include password
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        // Log failed attempt
        await AuditLog.create({
          userId: null,
          ip: clientIp,
          endpoint: '/api/auth/login',
          action: 'LOGIN_FAILED',
          status: 'USER_NOT_FOUND',
          timestamp: new Date(),
        });

        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'User account is inactive',
        });
      }

      // Compare passwords
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Log failed attempt
        await AuditLog.create({
          userId: user._id,
          ip: clientIp,
          endpoint: '/api/auth/login',
          action: 'LOGIN_FAILED',
          status: 'INVALID_PASSWORD',
          timestamp: new Date(),
        });

        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Log successful login
      await AuditLog.create({
        userId: user._id,
        ip: clientIp,
        endpoint: '/api/auth/login',
        action: 'LOGIN',
        status: 'SUCCESS',
        timestamp: new Date(),
      });

      // Generate token
      const token = generateToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to login',
      });
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
      }

      res.json({
        user: {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to fetch user',
      });
    }
  },
};

module.exports = authController;
