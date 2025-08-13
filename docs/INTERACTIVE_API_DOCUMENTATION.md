# Looper Interactive API Documentation

## Overview

This document provides comprehensive interactive documentation for the Looper food waste reduction marketplace API. The API follows RESTful principles and provides complete CRUD operations for all platform features.

## Authentication

The Looper API uses JWT (JSON Web Tokens) for authentication with support for Google OAuth integration.

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.replit.app/api
```

### Authentication Methods

#### 1. Email/Password Authentication

**Register**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "phone": "+1234567890"
}
```

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "consumer",
    "isVerified": false
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 2. Google OAuth Authentication

**Get Google Auth URL**
```bash
GET /api/auth/google
```

**Google Callback**
```bash
POST /api/auth/google/callback
Content-Type: application/json

{
  "code": "google_authorization_code"
}
```

#### 3. Token Management

**Refresh Access Token**
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Logout**
```bash
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Using Authentication

Include the access token in the Authorization header for protected endpoints:

```bash
Authorization: Bearer <access_token>
```

## Core API Endpoints

### User Management

#### Get Current User Profile
```bash
GET /api/auth/me
Authorization: Bearer <access_token>
```

#### Update User Profile
```bash
PUT /api/users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "phone": "+1234567890"
}
```

#### Get User Impact Statistics
```bash
GET /api/users/impact
Authorization: Bearer <access_token>
```

### Business Management

#### Create Business
```bash
POST /api/businesses
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

businessName: "Green Eats Restaurant"
description: "Sustainable restaurant reducing food waste"
address: "123 Main St, City, State"
businessType: "restaurant"
latitude: 40.7128
longitude: -74.0060
```

#### Get My Businesses
```bash
GET /api/businesses/my
Authorization: Bearer <access_token>
```

#### Update Business
```bash
PUT /api/businesses/{businessId}
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

businessName: "Updated Business Name"
description: "Updated description"
```

### Food Listing Management

#### Create Food Listing
```bash
POST /api/listings
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

businessId: "business-uuid"
title: "Fresh Sandwiches"
description: "Delicious sandwiches made today"
listingType: "individual"
originalPrice: 12.99
discountedPrice: 6.99
quantity: 5
pickupWindowStart: "2025-08-14T18:00:00Z"
pickupWindowEnd: "2025-08-14T20:00:00Z"
estimatedCo2Savings: 2.5
```

#### Search Food Listings
```bash
GET /api/listings/search?query=pizza&businessType=restaurant&maxDistance=10&lat=40.7128&lng=-74.0060
```

#### Update Food Listing
```bash
PUT /api/listings/{listingId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "discountedPrice": 5.99,
  "quantity": 3
}
```

### Order Management

#### Create Order
```bash
POST /api/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "items": [
    {
      "listingId": "listing-uuid",
      "quantity": 2,
      "unitPrice": 6.99
    }
  ],
  "paymentMethod": "card",
  "useWalletCredit": false
}
```

#### Get My Orders
```bash
GET /api/orders/my
Authorization: Bearer <access_token>
```

#### Update Order Status
```bash
PUT /api/orders/{orderId}/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "ready_for_pickup"
}
```

### Payment & Wallet

#### Initialize Payment
```bash
POST /api/payments/initialize
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "orderId": "order-uuid",
  "amount": 13.98,
  "paymentMethod": "card"
}
```

#### Get Wallet Balance
```bash
GET /api/wallet/balance
Authorization: Bearer <access_token>
```

#### Top Up Wallet
```bash
POST /api/wallet/topup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 50.00,
  "paymentMethod": "card"
}
```

### Reviews & Ratings

#### Create Review
```bash
POST /api/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "entityType": "business",
  "entityId": "business-uuid",
  "rating": 5,
  "reviewText": "Excellent service and quality food!",
  "orderId": "order-uuid"
}
```

### Messaging

#### Send Message
```bash
POST /api/messages
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "receiverId": "user-uuid",
  "businessId": "business-uuid",
  "messageText": "Hello, I have a question about my order.",
  "messageType": "text"
}
```

#### Get Messages
```bash
GET /api/messages?businessId=business-uuid&page=1&limit=20
Authorization: Bearer <access_token>
```

### File Upload

#### Upload File
```bash
POST /api/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: <binary_file_data>
```

**Response**
```json
{
  "url": "https://cloudinary-url/image.jpg"
}
```

## Interactive Testing

### Using Swagger UI

Access the interactive API documentation at:
- Development: `http://localhost:5000/api/docs`
- Production: `https://your-domain.replit.app/api/docs`

The Swagger UI provides:
- Complete API endpoint documentation
- Interactive request/response testing
- Authentication integration
- Request/response schema validation
- Code generation in multiple languages

### Using Curl Examples

All endpoints include complete curl examples with proper authentication headers and request bodies.

### Using Postman Collection

A complete Postman collection is available with:
- Pre-configured environments (development/production)
- Automatic authentication token management
- Complete endpoint coverage
- Response validation tests

## Error Handling

### Standard Error Responses

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

### Validation Errors

```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per authenticated user
- **File upload endpoints**: 10 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1627847400
```

## WebSocket Integration

Real-time features are available through WebSocket connections:

```javascript
const ws = new WebSocket('ws://localhost:5000');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));

// Subscribe to order updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'orders',
  businessId: 'business-uuid'
}));
```

## SDK and Client Libraries

Official client libraries are available for:
- JavaScript/Node.js
- Python
- React/React Native
- Swift (iOS)
- Kotlin (Android)

## Support and Resources

- **Technical Support**: Contact development team
- **API Status**: Monitor at status page
- **Developer Community**: Join our Discord
- **Updates**: Subscribe to changelog

---

For more detailed information about specific endpoints, business logic, and integration examples, refer to the complete API documentation at `/api/docs`.