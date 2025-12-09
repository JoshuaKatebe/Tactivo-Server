# Stock Management Guide

## Current Status ✅

Stock management is **fully functional** and ready to use! You can add new products, manage inventory, track stock levels, and handle restocking operations.

## Database Schema

The `shop_products` table includes:
- `id` (UUID) - Unique product identifier
- `station_id` (UUID, nullable) - Station-specific or global products
- `sku` (text, nullable) - Stock Keeping Unit / Barcode
- `name` (text, required) - Product name
- `price` (decimal, required) - Selling price
- `cost` (decimal, nullable) - Cost price (for profit calculation)
- `unit` (text, nullable) - Unit of measurement (e.g., "bottle", "pack", "kg")
- `stock_qty` (decimal) - Current stock quantity (default: 0)
- `active` (boolean) - Whether product is active (default: true)
- `created_at`, `updated_at` - Timestamps

## API Endpoints

### 1. Create New Product

**POST** `/api/shop/products`

Add a new product to inventory with all details.

**Request Body:**
```json
{
  "station_id": "uuid-here",  // Optional: null for global products
  "sku": "PROD-001",           // Optional: Barcode/SKU
  "name": "Coca Cola 500ml",   // Required
  "price": 2.50,              // Required: Selling price
  "cost": 1.80,               // Optional: Cost price
  "unit": "bottle",           // Optional: Unit of measurement
  "stock_qty": 100,           // Optional: Initial quantity (default: 0)
  "active": true              // Optional: Active status (default: true)
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "uuid",
    "station_id": "uuid",
    "sku": "PROD-001",
    "name": "Coca Cola 500ml",
    "price": 2.50,
    "cost": 1.80,
    "unit": "bottle",
    "stock_qty": 100,
    "active": true,
    "created_at": "2025-01-06T12:00:00Z",
    "updated_at": "2025-01-06T12:00:00Z"
  }
}
```

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/api/shop/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coca Cola 500ml",
    "price": 2.50,
    "cost": 1.80,
    "unit": "bottle",
    "stock_qty": 100,
    "sku": "COKE-500"
  }'
```

### 2. Get All Products

**GET** `/api/shop/products`

Retrieve all products with optional filters.

**Query Parameters:**
- `station_id` (UUID, optional) - Filter by station
- `active` (boolean, optional) - Filter by active status

**Example:**
```bash
GET /api/shop/products?station_id=uuid&active=true
```

### 3. Get Product by ID

**GET** `/api/shop/products/:id`

Get detailed information about a specific product.

### 4. Update Product

**PUT** `/api/shop/products/:id`

Update product details including name, price, cost, stock quantity, etc.

**Request Body:**
```json
{
  "name": "Updated Product Name",
  "price": 3.00,
  "stock_qty": 150,
  "active": true
}
```

### 5. Delete Product

**DELETE** `/api/shop/products/:id`

Delete a product from inventory.

## Stock Management Operations

### 1. View Products with Stock Levels

**GET** `/api/stock/products`

Get all products with their current stock levels.

**Query Parameters:**
- `station_id` (UUID, optional)
- `category` (string, optional) - Future feature
- `active` (boolean, optional)
- `low_stock` (boolean) - Show only low stock items
- `low_stock_threshold` (integer, default: 10)

**Example:**
```bash
GET /api/stock/products?station_id=uuid&low_stock=true&low_stock_threshold=20
```

### 2. Get Low Stock Items

**GET** `/api/stock/low-stock`

Get products that are running low on stock.

**Query Parameters:**
- `station_id` (UUID, required)
- `threshold` (integer, default: 10)

**Example:**
```bash
GET /api/stock/low-stock?station_id=uuid&threshold=15
```

### 3. Restock Products (Stock In)

**POST** `/api/stock/stock-in`

Record a restock operation to increase inventory.

**Request Body:**
```json
{
  "station_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 50
    },
    {
      "product_id": "uuid",
      "quantity": 30
    }
  ],
  "supplier_id": "uuid",        // Optional: Future feature
  "receipt_number": "REC-001",  // Optional
  "notes": "Restocked from supplier"  // Optional
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "receipt_number": "REC-001",
    "items": [...],
    "created_at": "2025-01-06T12:00:00Z"
  }
}
```

### 4. Manual Stock Adjustment

**POST** `/api/stock/adjust`

Manually adjust stock quantity (for corrections, damaged items, etc.).

**Request Body:**
```json
{
  "product_id": "uuid",
  "quantity": -5,  // Positive to increase, negative to decrease
  "reason": "Damaged items found"
}
```

**Example Scenarios:**
- **Increase stock:** `"quantity": 10` - Adds 10 units
- **Decrease stock:** `"quantity": -5` - Removes 5 units (e.g., damaged items)

### 5. Get Stock Movements

**GET** `/api/stock/movements`

View stock movement history (currently shows stock out from sales).

**Query Parameters:**
- `product_id` (UUID, optional
- `station_id` (UUID, optional)
- `start_date` (datetime, optional)
- `end_date` (datetime, optional)
- `type` (string, optional) - "in", "out", "adjustment"

## Automatic Stock Management

### Sales Integration

When a sale is created via **POST** `/api/shop/sales`, the system automatically:
1. Reduces stock quantity for each sold item
2. Prevents overselling (you may want to add validation)
3. Records the transaction in `shop_sale_items`

**Example Sale:**
```json
{
  "station_id": "uuid",
  "employee_id": "uuid",
  "total_amount": 5.00,
  "items": [
    {
      "product_id": "uuid",
      "qty": 2,
      "unit_price": 2.50,
      "line_total": 5.00
    }
  ]
}
```

This automatically reduces `stock_qty` by 2 for the product.

## Testing Stock Management

### 1. Create a Test Product

```bash
POST /api/shop/products
{
  "name": "Test Product",
  "price": 10.00,
  "cost": 7.50,
  "unit": "piece",
  "stock_qty": 50,
  "sku": "TEST-001"
}
```

### 2. Check Stock Levels

```bash
GET /api/stock/products?station_id=your-station-id
```

### 3. Restock the Product

```bash
POST /api/stock/stock-in
{
  "station_id": "your-station-id",
  "items": [
    {
      "product_id": "product-uuid",
      "quantity": 25
    }
  ]
}
```

### 4. Create a Sale (Stock Auto-Reduction)

```bash
POST /api/shop/sales
{
  "station_id": "your-station-id",
  "employee_id": "employee-uuid",
  "total_amount": 10.00,
  "items": [
    {
      "product_id": "product-uuid",
      "qty": 1,
      "unit_price": 10.00,
      "line_total": 10.00
    }
  ]
}
```

### 5. Check Stock Movements

```bash
GET /api/stock/movements?station_id=your-station-id&type=out
```

## Best Practices

1. **Always set initial stock quantity** when creating products
2. **Use SKU/barcode** for easier product identification
3. **Set cost price** to enable profit calculations
4. **Use units** consistently (e.g., "bottle", "pack", "kg")
5. **Monitor low stock** regularly using `/api/stock/low-stock`
6. **Record restocks** using `/api/stock/stock-in` for audit trail
7. **Use manual adjustments** sparingly and always provide a reason

## Future Enhancements (Not Yet Implemented)

- Product categories
- Barcode scanning support
- Stock movement history table (currently uses sales as proxy)
- Stock receipts table for better audit trail
- Supplier management
- Reorder points and automatic alerts
- Batch/lot tracking
- Expiry date management
- Product images

## Swagger Documentation

Visit `http://localhost:3000/api-docs` to see interactive API documentation with:
- Full request/response schemas
- Try-it-out functionality
- All available endpoints

## Common Use Cases

### Adding a New Product to Inventory

1. **Create the product:**
   ```json
   POST /api/shop/products
   {
     "name": "New Product",
     "price": 5.00,
     "cost": 3.00,
     "stock_qty": 0,
     "sku": "NEW-001"
   }
   ```

2. **Restock it:**
   ```json
   POST /api/stock/stock-in
   {
     "station_id": "uuid",
     "items": [{"product_id": "uuid", "quantity": 100}]
   }
   ```

### Checking Inventory Status

1. **Get all products with stock:**
   ```bash
   GET /api/stock/products?station_id=uuid
   ```

2. **Get low stock alerts:**
   ```bash
   GET /api/stock/low-stock?station_id=uuid&threshold=20
   ```

### Restocking After Delivery

```json
POST /api/stock/stock-in
{
  "station_id": "uuid",
  "items": [
    {"product_id": "uuid-1", "quantity": 50},
    {"product_id": "uuid-2", "quantity": 30},
    {"product_id": "uuid-3", "quantity": 25}
  ],
  "receipt_number": "DELIVERY-2025-01-06",
  "notes": "Weekly delivery from supplier"
}
```

## Troubleshooting

### Product Not Showing Up
- Check if `active` is set to `true`
- Verify `station_id` filter matches
- Ensure product was created successfully (check response)

### Stock Quantity Not Updating
- Verify product ID is correct
- Check if sale was created successfully
- Ensure transaction completed (check for errors)

### Low Stock Not Alerting
- Verify `threshold` parameter is set correctly
- Check if `station_id` is provided
- Ensure products have `active = true`

---

**Need Help?** Check the Swagger UI at `http://localhost:3000/api-docs` for interactive API testing!

