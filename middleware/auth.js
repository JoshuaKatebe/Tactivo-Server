/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const userService = require('../services/user.service');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            is_superuser: user.is_superuser
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Authentication middleware
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required'
            });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                error: true,
                message: 'Invalid or expired token'
            });
        }

        // Attach user to request
        req.user = decoded;
        
        // Load employee info if user is linked to an employee
        try {
            const employees = await employeeService.getAll({ user_id: decoded.id });
            if (employees.length > 0) {
                req.employee = employees[0];
                
                // Load employee roles and permissions
                const roles = await roleService.getEmployeeRoles(employees[0].id);
                const permissions = await roleService.getEmployeePermissions(employees[0].id);
                req.employee.roles = roles;
                req.employee.permissions = permissions.map(p => p.code);
            }
        } catch (error) {
            logger.debug('Could not load employee info', error);
            // Not critical, continue without employee info
        }
        
        next();
    } catch (error) {
        logger.error('Authentication error', error);
        res.status(401).json({
            error: true,
            message: 'Authentication failed'
        });
    }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            if (decoded) {
                req.user = decoded;
            }
        }
        next();
    } catch (error) {
        next();
    }
}

/**
 * Require superuser
 */
function requireSuperuser(req, res, next) {
    if (!req.user || !req.user.is_superuser) {
        return res.status(403).json({
            error: true,
            message: 'Superuser access required'
        });
    }
    next();
}

/**
 * Require permission
 */
function requirePermission(permissionCode) {
    return async (req, res, next) => {
        // Superusers bypass permission checks
        if (req.user && req.user.is_superuser) {
            return next();
        }

        // Check if user has the required permission
        if (req.employee && req.employee.permissions) {
            if (req.employee.permissions.includes(permissionCode)) {
                return next();
            }
        }

        return res.status(403).json({
            error: true,
            message: `Permission required: ${permissionCode}`
        });
    };
}

/**
 * Require any of the specified permissions
 */
function requireAnyPermission(...permissionCodes) {
    return async (req, res, next) => {
        // Superusers bypass permission checks
        if (req.user && req.user.is_superuser) {
            return next();
        }

        // Check if user has any of the required permissions
        if (req.employee && req.employee.permissions) {
            for (const code of permissionCodes) {
                if (req.employee.permissions.includes(code)) {
                    return next();
                }
            }
        }

        return res.status(403).json({
            error: true,
            message: `One of these permissions required: ${permissionCodes.join(', ')}`
        });
    };
}

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    optionalAuth,
    requireSuperuser,
    requirePermission,
    requireAnyPermission
};

