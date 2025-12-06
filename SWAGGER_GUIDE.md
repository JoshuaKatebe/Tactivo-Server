# Swagger API Documentation Guide

## Overview

Swagger/OpenAPI documentation has been added to the Tactivo Server. You can now view and test all API endpoints through an interactive documentation interface.

## Accessing Swagger UI

Once the server is running, access Swagger UI at:

```
http://localhost:3000/api-docs
```

## Features

### Interactive API Documentation
- **Browse all endpoints** - See all available APIs organized by tags
- **Try it out** - Test endpoints directly from the browser
- **View schemas** - See request/response models
- **Authentication** - Test with JWT tokens

### API Organization
Endpoints are organized into the following tags:
- Authentication
- Organizations
- Companies
- Stations
- Users
- Employees
- Shifts
- Fuel
- Fuel Transactions
- Shop
- Reports
- Handovers
- Payments
- PTS Controllers
- Pumps
- Nozzles
- Station Shifts
- Debtors
- Stock
- Roles
- Permissions
- Health

## Using Swagger UI

### 1. Authentication

1. **Get your token:**
   - Use the `POST /api/auth/login` endpoint
   - Enter your username and password
   - Click "Execute"
   - Copy the `token` from the response

2. **Authorize in Swagger:**
   - Click the "Authorize" button (top right)
   - Enter: `Bearer YOUR_TOKEN_HERE`
   - Click "Authorize"
   - Click "Close"

Now all protected endpoints will use your token automatically.

### 2. Testing Endpoints

1. **Expand an endpoint** - Click on any endpoint to see details
2. **Click "Try it out"** - Enables editing of parameters
3. **Fill in parameters** - Enter path params, query params, or request body
4. **Click "Execute"** - Sends the request
5. **View response** - See status code, headers, and response body

### 3. Example: Creating an Organization

1. Navigate to `POST /api/organizations`
2. Click "Try it out"
3. Enter request body:
   ```json
   {
     "name": "Test Organization"
   }
   ```
4. Click "Execute"
5. View the response with the created organization

## Swagger Configuration

The Swagger configuration is in `config/swagger.js`:

- **OpenAPI 3.0.0** specification
- **Server URLs** configured (localhost and production)
- **Security schemes** (JWT Bearer token)
- **Common schemas** defined (User, Employee, Organization, etc.)
- **Tags** for organizing endpoints

## Adding Swagger Annotations

To add Swagger documentation to a route:

```javascript
/**
 * @swagger
 * /api/endpoint:
 *   get:
 *     summary: Brief description
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
```

## Common Patterns

### GET with Query Parameters
```javascript
/**
 * @swagger
 * /api/resource:
 *   get:
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 */
```

### POST with Request Body
```javascript
/**
 * @swagger
 * /api/resource:
 *   post:
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - field1
 *             properties:
 *               field1:
 *                 type: string
 */
```

### Path Parameters
```javascript
/**
 * @swagger
 * /api/resource/{id}:
 *   get:
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
```

## Benefits

1. **Self-Documenting API** - Always up-to-date documentation
2. **Interactive Testing** - Test endpoints without Postman
3. **Client Code Generation** - Generate API clients from spec
4. **Team Collaboration** - Share API documentation easily
5. **Validation** - See expected request/response formats

## Exporting OpenAPI Spec

You can export the OpenAPI specification as JSON:

```javascript
// In your code
const swaggerSpec = require('./config/swagger');
console.log(JSON.stringify(swaggerSpec, null, 2));
```

Or access it via:
```
http://localhost:3000/api-docs.json
```

## Integration with Frontend

### Generate TypeScript Types

Use tools like `openapi-typescript` to generate TypeScript types:

```bash
npx openapi-typescript http://localhost:3000/api-docs.json -o src/types/api.ts
```

### Generate API Client

Use `openapi-generator` to generate API clients:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/api-docs.json \
  -g typescript-axios \
  -o src/api
```

## Customization

### Change Swagger UI Theme

Edit `index.js`:

```javascript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Tactivo API Documentation',
    customCssUrl: '/custom-swagger.css' // Optional custom CSS file
}));
```

### Add More Schemas

Edit `config/swagger.js` and add to `components.schemas`:

```javascript
components: {
    schemas: {
        YourNewSchema: {
            type: 'object',
            properties: {
                // ...
            }
        }
    }
}
```

## Tips

1. **Keep annotations updated** - Update Swagger docs when changing APIs
2. **Use tags** - Organize endpoints logically
3. **Add examples** - Include example values in schemas
4. **Document errors** - Include all possible error responses
5. **Use $ref** - Reference common schemas to avoid duplication

## Troubleshooting

### Swagger UI not loading
- Check server is running on port 3000
- Verify `/api-docs` route is registered
- Check browser console for errors

### Endpoints not showing
- Verify route files are in `./routes/*.js`
- Check Swagger annotations are correct
- Restart server after adding annotations

### Authentication not working
- Ensure token format: `Bearer YOUR_TOKEN`
- Check token hasn't expired
- Verify JWT_SECRET matches

---

**Access Swagger UI:** http://localhost:3000/api-docs

