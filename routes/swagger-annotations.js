/**
 * Common Swagger Annotations
 * Reusable annotation snippets for routes
 */

module.exports = {
    /**
     * Standard success response
     */
    successResponse: {
        '200': {
            description: 'Success',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            error: { type: 'boolean', example: false },
                            data: { type: 'object' }
                        }
                    }
                }
            }
        }
    },

    /**
     * Standard error responses
     */
    errorResponses: {
        '400': {
            description: 'Bad Request',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                }
            }
        },
        '401': {
            description: 'Unauthorized',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                }
            }
        },
        '403': {
            description: 'Forbidden',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                }
            }
        },
        '404': {
            description: 'Not Found',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                }
            }
        },
        '500': {
            description: 'Internal Server Error',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                }
            }
        }
    },

    /**
     * UUID path parameter
     */
    uuidParam: {
        in: 'path',
        name: 'id',
        required: true,
        schema: {
            type: 'string',
            format: 'uuid'
        },
        description: 'Resource ID'
    },

    /**
     * Bearer auth security
     */
    bearerAuth: {
        security: [{ bearerAuth: [] }]
    },

    /**
     * Station ID query parameter
     */
    stationIdQuery: {
        in: 'query',
        name: 'station_id',
        schema: {
            type: 'string',
            format: 'uuid'
        },
        description: 'Filter by station ID'
    },

    /**
     * Date range query parameters
     */
    dateRangeQueries: [
        {
            in: 'query',
            name: 'start_date',
            schema: {
                type: 'string',
                format: 'date-time'
            },
            description: 'Start date for filtering'
        },
        {
            in: 'query',
            name: 'end_date',
            schema: {
                type: 'string',
                format: 'date-time'
            },
            description: 'End date for filtering'
        }
    ]
};

