# Looper API Documentation

## Overview

The Looper API is a comprehensive RESTful service for the sustainable food redistribution platform. It enables businesses to list surplus food items and consumers to purchase them at discounted prices, helping reduce food waste while creating economic opportunities.

## Base URL

- Development: `http://localhost:5000`


## Authentication

The API uses session-based authentication with Replit Auth (OpenID Connect). Users authenticate via `/api/login` and receive a session cookie that must be included in subsequent requests.

## Core API Endpoints

### Authentication Endpoints

#### `GET /api/auth/user`
Get current authenticated user profile
- **Authentication**: Required
- **Response**: User object with profile details
- **Status Codes**: 200 (Success), 401 (Unauthorized)

#### `GET /api/login`
Initiate OAuth login flow
- **Authentication**: None
- **Redirects**: To Replit OAuth provider

#### `GET /api/logout`
End user session
- **Authentication**: Required
- **Redirects**: To landing page

### User Management Endpoints

#### `GET /api/users/{id}`
Retrieve user profile by ID
- **Authentication**: Required
- **Parameters**: `id` (string) - User ID
- **Response**: User profile object

#### `PUT /api/users/{id}`
Update user profile
- **Authentication**: Required (own profile only)
- **Body**: User update object
- **Response**: Updated user profile

#### `GET /api/users/{id}/favorites`
Get user's favorite businesses and listings
- **Authentication**: Required
- **Query**: `type` (optional) - "business" or "listing"
- **Response**: Array of favorite items

#### `POST /api/users/{id}/favorites`
Add item to user's favorites
- **Authentication**: Required
- **Body**: `{ entityId: string, type: "business" | "listing" }`

### Business Management Endpoints

#### `GET /api/businesses`
List all active businesses with filtering
- **Authentication**: Optional
- **Query Parameters**:
  - `type` - Business type filter
  - `city` - City filter
  - `latitude` & `longitude` - Location-based search
  - `radius` - Search radius in kilometers
- **Response**: Array of business objects

#### `POST /api/businesses`
Create new business (business owners only)
- **Authentication**: Required
- **Body**: Business creation object
- **Response**: Created business object

#### `GET /api/businesses/{id}`
Get specific business details
- **Parameters**: `id` - Business ID
- **Response**: Business object with listings

#### `PUT /api/businesses/{id}`
Update business information
- **Authentication**: Required (business access only)
- **Body**: Business update object

#### `GET /api/businesses/{id}/analytics`
Get business analytics and performance metrics
- **Authentication**: Required (business access only)
- **Query**: `startDate`, `endDate` for date range
- **Response**: Analytics data object

### Food Listing Endpoints

#### `GET /api/listings`
Search and filter food listings
- **Query Parameters**:
  - `businessType` - Filter by business type
  - `maxPrice` - Maximum price filter
  - `expiringBefore` - Expiration time filter
  - `category` - Food category
  - `latitude` & `longitude` - Location search
  - `radius` - Search radius
- **Response**: Array of food listing objects

#### `POST /api/businesses/{businessId}/listings`
Create new food listing
- **Authentication**: Required (business access only)
- **Body**: Food listing object
- **Response**: Created listing object

#### `GET /api/listings/{id}`
Get specific listing details
- **Parameters**: `id` - Listing ID
- **Response**: Detailed listing object

#### `PUT /api/listings/{id}`
Update food listing
- **Authentication**: Required (business access only)
- **Body**: Listing update object

#### `DELETE /api/listings/{id}`
Remove food listing
- **Authentication**: Required (business access only)

### Order Management Endpoints

#### `POST /api/orders`
Create new order
- **Authentication**: Required
- **Body**: Order creation object with items
- **Response**: Created order with payment details

#### `GET /api/orders`
Get user's orders
- **Authentication**: Required
- **Query**: `status` - Filter by order status
- **Response**: Array of order objects

#### `GET /api/orders/{id}`
Get specific order details
- **Authentication**: Required
- **Parameters**: `id` - Order ID
- **Response**: Detailed order object

#### `PUT /api/orders/{id}/status`
Update order status (business only)
- **Authentication**: Required (business access only)
- **Body**: `{ status: string }`

#### `POST /api/orders/{id}/verify-pickup`
Verify order pickup with QR code
- **Authentication**: Required (business access only)
- **Body**: `{ pickupCode: string }`

### Payment & Wallet Endpoints

#### `GET /api/wallet/balance`
Get user's wallet balance
- **Authentication**: Required
- **Response**: `{ balance: number, currency: string }`

#### `GET /api/wallet/transactions`
Get wallet transaction history
- **Authentication**: Required
- **Query**: `limit`, `offset` for pagination
- **Response**: Array of transaction objects

#### `POST /api/wallet/add-funds`
Add funds to wallet
- **Authentication**: Required
- **Body**: `{ amount: number, paymentMethod: string }`

#### `POST /api/payments/process`
Process payment for order
- **Authentication**: Required
- **Body**: Payment processing object
- **Response**: Payment result

### Review & Rating Endpoints

#### `GET /api/businesses/{id}/reviews`
Get business reviews
- **Parameters**: `id` - Business ID
- **Query**: `limit`, `offset` for pagination
- **Response**: Array of review objects

#### `POST /api/reviews`
Create review for business/listing
- **Authentication**: Required
- **Body**: Review object with rating and comment
- **Response**: Created review object

#### `GET /api/reviews/{id}`
Get specific review
- **Parameters**: `id` - Review ID
- **Response**: Review object

### Messaging Endpoints

#### `GET /api/messages`
Get user's messages
- **Authentication**: Required
- **Query**: `businessId` - Filter by business
- **Response**: Array of message objects

#### `POST /api/messages`
Send message to business
- **Authentication**: Required
- **Body**: Message object
- **Response**: Created message object

#### `PUT /api/messages/{id}/read`
Mark message as read
- **Authentication**: Required
- **Parameters**: `id` - Message ID

### Notification Endpoints

#### `GET /api/notifications`
Get user's notifications
- **Authentication**: Required
- **Response**: Array of notification objects

#### `PUT /api/notifications/{id}/read`
Mark notification as read
- **Authentication**: Required
- **Parameters**: `id` - Notification ID

#### `PUT /api/notifications/read-all`
Mark all notifications as read
- **Authentication**: Required

### Impact & Analytics Endpoints

#### `GET /api/users/{id}/impact`
Get user's environmental impact stats
- **Authentication**: Required
- **Parameters**: `id` - User ID
- **Response**: Impact statistics object

#### `GET /api/analytics/platform`
Get platform-wide analytics (admin only)
- **Authentication**: Required (admin role)
- **Response**: Platform analytics object

### File Upload Endpoints

#### `POST /api/upload`
Upload file (images, documents)
- **Authentication**: Required
- **Body**: Multipart form data with file
- **Response**: `{ url: string, fileName: string }`

#### `DELETE /api/files/{filename}`
Delete uploaded file
- **Authentication**: Required
- **Parameters**: `filename` - File name to delete

## WebSocket Endpoints

### Real-time Messaging: `/ws`
- **Connection**: WebSocket connection for real-time features
- **Events**: 
  - `message` - New message received
  - `order_update` - Order status changes
  - `notification` - New notification

## Error Handling

All endpoints return standardized error responses:

```json
{
  "message": "Human-readable error message",
  "error": "Technical error details (development only)"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Authentication endpoints: 5 requests per minute
- General API endpoints: 100 requests per minute per user
- File upload endpoints: 10 requests per minute

## Data Models

### User Object
```json
{
  "id": "string",
  "email": "string",
  "firstName": "string", 
  "lastName": "string",
  "fullName": "string",
  "profileImageUrl": "string",
  "phoneNumber": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "latitude": "number",
  "longitude": "number",
  "points": "integer",
  "referralCode": "string",
  "createdAt": "ISO8601 date",
  "updatedAt": "ISO8601 date"
}
```

### Business Object
```json
{
  "id": "string",
  "name": "string",
  "businessType": "restaurant|bakery|cafe|hotel|catering|grocery_store|food_truck|other",
  "description": "string",
  "address": "string", 
  "city": "string",
  "state": "string",
  "latitude": "number",
  "longitude": "number",
  "phoneNumber": "string",
  "email": "string",
  "website": "string",
  "logoUrl": "string",
  "coverImageUrl": "string",
  "rating": "number",
  "totalReviews": "integer",
  "isVerified": "boolean",
  "isActive": "boolean",
  "operatingHours": "object",
  "createdAt": "ISO8601 date"
}
```

### Food Listing Object
```json
{
  "id": "string",
  "businessId": "string", 
  "title": "string",
  "description": "string",
  "category": "meals|baked_goods|beverages|snacks|produce|prepared_foods|other",
  "originalPrice": "number",
  "discountedPrice": "number",
  "discountPercentage": "number",
  "quantity": "integer",
  "availableQuantity": "integer",
  "status": "active|paused|sold_out|expired",
  "pickupWindowStart": "ISO8601 date",
  "pickupWindowEnd": "ISO8601 date",
  "allergens": ["string"],
  "createdAt": "ISO8601 date"
}
```

### Order Object
```json
{
  "id": "string",
  "userId": "string",
  "businessId": "string",
  "status": "pending|confirmed|ready|completed|cancelled",
  "totalAmount": "number",
  "paymentMethod": "card|wallet|hybrid",
  "paymentStatus": "pending|completed|failed|refunded",
  "pickupCode": "string",
  "qrCode": "string",
  "scheduledPickupStart": "ISO8601 date",
  "scheduledPickupEnd": "ISO8601 date",
  "items": ["OrderItem objects"],
  "createdAt": "ISO8601 date"
}
```

## SDK and Integration

### JavaScript/Node.js Example

```javascript
const LooperAPI = {
  baseUrl: 'http://localhost:5000',
  
  async getListings(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseUrl}/api/listings?${params}`, {
      credentials: 'include'
    });
    return response.json();
  },
  
  async createOrder(orderData) {
    const response = await fetch(`${this.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(orderData)
    });
    return response.json();
  }
};
```

### Python Example

```python
import requests

class LooperAPI:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def get_listings(self, **filters):
        response = self.session.get(f"{self.base_url}/api/listings", params=filters)
        return response.json()
    
    def create_order(self, order_data):
        response = self.session.post(f"{self.base_url}/api/orders", json=order_data)
        return response.json()
```

## Support and Documentation

- **Swagger UI**: Available at `/api/docs` when running the application
- **Raw OpenAPI JSON**: Available at `/api/docs.json`
- **Technical Support**: Contact the development team for integration assistance