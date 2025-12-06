/**
 * User Service
 */

const bcrypt = require('bcrypt');
const db = require('../lib/db');
const logger = require('../utils/logger');

class UserService {
    /**
     * Get all users
     */
    async getAll() {
        const result = await db.query('SELECT id, username, email, is_superuser, created_at FROM users ORDER BY created_at DESC');
        return result.rows;
    }

    /**
     * Get user by ID
     */
    async getById(id) {
        const result = await db.query('SELECT id, username, email, is_superuser, created_at FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    /**
     * Get user by username
     */
    async getByUsername(username) {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0] || null;
    }

    /**
     * Create user
     */
    async create(data) {
        const { username, password, email, is_superuser } = data;
        
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);
        
        const result = await db.query(
            'INSERT INTO users (username, password_hash, email, is_superuser) VALUES ($1, $2, $3, $4) RETURNING id, username, email, is_superuser, created_at',
            [username, password_hash, email || null, is_superuser || false]
        );
        return result.rows[0];
    }

    /**
     * Update user
     */
    async update(id, data) {
        const { username, password, email, is_superuser } = data;
        
        let query = 'UPDATE users SET';
        const params = [];
        let paramIndex = 1;

        if (username !== undefined) {
            query += ` username = $${paramIndex++},`;
            params.push(username);
        }
        if (email !== undefined) {
            query += ` email = $${paramIndex++},`;
            params.push(email);
        }
        if (is_superuser !== undefined) {
            query += ` is_superuser = $${paramIndex++},`;
            params.push(is_superuser);
        }
        if (password) {
            const password_hash = await bcrypt.hash(password, 10);
            query += ` password_hash = $${paramIndex++},`;
            params.push(password_hash);
        }

        query += ' updated_at = now()';
        query += ` WHERE id = $${paramIndex++} RETURNING id, username, email, is_superuser, created_at`;
        params.push(id);

        const result = await db.query(query, params);
        return result.rows[0] || null;
    }

    /**
     * Delete user
     */
    async delete(id) {
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }

    /**
     * Verify password
     */
    async verifyPassword(username, password) {
        const user = await this.getByUsername(username);
        if (!user) {
            logger.debug('User not found', { username });
            return null;
        }
        
        logger.debug('Verifying password', {
            username: user.username,
            passwordLength: password.length,
            passwordHashLength: user.password_hash ? user.password_hash.length : 0,
            hashStartsWith: user.password_hash ? user.password_hash.substring(0, 7) : 'null'
        });
        
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        logger.debug('Password comparison result', {
            username: user.username,
            isValid: isValid
        });
        
        if (!isValid) {
            logger.warn('Password verification failed', {
                username: user.username,
                passwordLength: password.length,
                storedHashPrefix: user.password_hash.substring(0, 30)
            });
            return null;
        }
        
        // Return user without password hash
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            is_superuser: user.is_superuser
        };
    }
}

module.exports = new UserService();

