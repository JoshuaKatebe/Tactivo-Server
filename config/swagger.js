/**
 * Swagger/OpenAPI Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const os = require('os');
require('dotenv').config();

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const port = process.env.PORT || 3000;
const localIP = getLocalIP();

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Tactivo Server API',
            version: '1.0.0',
            description: 'REST API for Tactivo Fuel Station Management System',
            contact: {
                name: 'Tactivo Engineering',
                email: 'support@tactivo.com'
            },
            license: {
                name: 'ISC',
                url: 'https://opensource.org/licenses/ISC'
            }
        },
        servers: [
            {
                url: `http://${localIP}:${port}`,
                description: 'Local Network Server'
            },
            {
                url: `https://www.z360solutions.com`,
                description: 'Production domain'
            },
            {
                url: 'https://tactivo-server-1.onrender.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from /api/auth/login'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Error message'
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'boolean',
                            example: false
                        },
                        data: {
                            type: 'object'
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        username: {
                            type: 'string'
                        },
                        email: {
                            type: 'string'
                        },
                        is_superuser: {
                            type: 'boolean'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Employee: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        company_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        station_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        user_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        first_name: {
                            type: 'string'
                        },
                        last_name: {
                            type: 'string'
                        },
                        badge_tag: {
                            type: 'string'
                        },
                        employee_code: {
                            type: 'string'
                        },
                        active: {
                            type: 'boolean'
                        }
                    }
                },
                Organization: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        name: {
                            type: 'string'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Company: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        organization_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        name: {
                            type: 'string'
                        },
                        contact: {
                            type: 'object'
                        }
                    }
                },
                Station: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        company_id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        code: {
                            type: 'string'
                        },
                        name: {
                            type: 'string'
                        },
                        address: {
                            type: 'string'
                        },
                        timezone: {
                            type: 'string'
                        },
                        pts_hostname: {
                            type: 'string'
                        },
                        pts_port: {
                            type: 'integer'
                        }
                    }
                },
                PumpStatus: {
                    type: 'object',
                    properties: {
                        Status: {
                            type: 'string',
                            enum: ['Idle', 'Filling', 'EndOfTransaction', 'Offline']
                        },
                        Transaction: {
                            type: 'integer'
                        },
                        Nozzle: {
                            type: 'integer'
                        },
                        Volume: {
                            type: 'number'
                        },
                        Amount: {
                            type: 'number'
                        }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'boolean',
                            example: false
                        },
                        data: {
                            type: 'object',
                            properties: {
                                token: {
                                    type: 'string'
                                },
                                user: {
                                    $ref: '#/components/schemas/User'
                                },
                                employee: {
                                    $ref: '#/components/schemas/Employee'
                                }
                            }
                        }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        station_id: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true
                        },
                        sku: {
                            type: 'string',
                            nullable: true,
                            description: 'Stock Keeping Unit (barcode/SKU)'
                        },
                        name: {
                            type: 'string',
                            description: 'Product name'
                        },
                        price: {
                            type: 'number',
                            format: 'decimal',
                            description: 'Selling price'
                        },
                        cost: {
                            type: 'number',
                            format: 'decimal',
                            nullable: true,
                            description: 'Cost price (for profit calculation)'
                        },
                        unit: {
                            type: 'string',
                            nullable: true,
                            description: 'Unit of measurement (e.g., "bottle", "pack", "kg")'
                        },
                        stock_qty: {
                            type: 'number',
                            format: 'decimal',
                            description: 'Current stock quantity',
                            default: 0
                        },
                        active: {
                            type: 'boolean',
                            description: 'Whether product is active',
                            default: true
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                }
            }
        },
        tags: [
            { name: 'Authentication', description: 'User authentication endpoints' },
            { name: 'Organizations', description: 'Organization management' },
            { name: 'Companies', description: 'Company management' },
            { name: 'Stations', description: 'Station management' },
            { name: 'Users', description: 'User management' },
            { name: 'Employees', description: 'Employee management' },
            { name: 'Shifts', description: 'Employee shift management' },
            { name: 'Fuel', description: 'PTS pump control and monitoring' },
            { name: 'Fuel Transactions', description: 'Fuel transaction tracking' },
            { name: 'Shop', description: 'Shop POS operations' },
            { name: 'Reports', description: 'Reporting and analytics' },
            { name: 'Handovers', description: 'Cash handover management' },
            { name: 'Payments', description: 'Payment processing (placeholders)' },
            { name: 'PTS Controllers', description: 'PTS controller registry' },
            { name: 'Pumps', description: 'Pump configuration' },
            { name: 'Nozzles', description: 'Nozzle configuration' },
            { name: 'Station Shifts', description: 'PTS hardware shift management' },
            { name: 'Debtors', description: 'Credit customer management (placeholders)' },
            { name: 'Stock', description: 'Stock and inventory management' },
            { name: 'Roles', description: 'Role management' },
            { name: 'Permissions', description: 'Permission management' },
            { name: 'Health', description: 'System health checks' },
            { name: 'Demo', description: 'Simulation and Demo Mode APIs' },
            { name: 'PTS Remote', description: 'PTS-2 Controller push data endpoints (Remote Server mode)' }
        ]
    },
    apis: ['./routes/*.js', './index.js'] // Path to the API files
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

