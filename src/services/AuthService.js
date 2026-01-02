let User, generateToken, hashPassword, comparePassword;

class AuthService {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      ({ User } = require('../database/models'));
      ({ generateToken } = require('../utils/jwt'));
      ({ hashPassword, comparePassword } = require('../utils/password'));
      this.initialized = true;
    }
  }
  /**
   * Register a new user
   */
  async register(email, password, role = 'user', tenantId) {
    await this.init();
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        role,
        tenantId,
      });

      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || undefined,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        token,
      };
    } catch (error) {
      console.error('Error registering user:', { email, role, error: error.message });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    await this.init();
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || undefined,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      token,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    await this.init();
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
      };
    } catch (error) {
      console.error('Error getting user by ID:', { userId, error: error.message });
      throw error;
    }
  }
}

module.exports = AuthService;
