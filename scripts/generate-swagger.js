import swaggerJSDoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Looper Food Waste Reduction API',
      version: '1.0.0',
      description: `
# Looper API Documentation

Welcome to the comprehensive API documentation for Looper, the food waste reduction marketplace platform.

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. To access protected endpoints:

1. Register or login to get an access token
2. Include the token in the Authorization header: \`Bearer <your-token>\`
3. Tokens expire in 15 minutes - use the refresh endpoint to get new tokens

## Features

- **User Management**: Registration, authentication, profile management
- **Business Operations**: Create and manage food businesses  
- **Food Listings**: List surplus food items with discounts
- **Order Management**: Complete order lifecycle with pickup verification
- **Payment Processing**: Integrated payment gateway with digital wallet
- **Real-time Messaging**: Communication between users and businesses
- **Impact Tracking**: Monitor environmental impact and savings
      `,
      contact: {
        name: 'Looper API Support',
        email: 'api-support@looper.com',
        url: 'https://looper.com/support'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['consumer', 'business_owner', 'admin'] },
            isVerified: { type: 'boolean' },
            pointsBalance: { type: 'integer' },
            walletBalance: { type: 'string' },
            totalMealsRescued: { type: 'integer' }
          }
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        },
        Business: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            businessName: { type: 'string' },
            description: { type: 'string' },
            address: { type: 'string' },
            businessType: { 
              type: 'string', 
              enum: ['restaurant', 'hotel', 'bakery', 'supermarket', 'cafe', 'caterer'] 
            },
            verificationStatus: { 
              type: 'string', 
              enum: ['pending', 'verified', 'rejected'] 
            },
            averageRating: { type: 'number' },
            totalReviews: { type: 'integer' }
          }
        },
        FoodListing: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            businessId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            listingType: { 
              type: 'string', 
              enum: ['individual', 'whoop_bag', 'chef_special', 'mystery_box'] 
            },
            originalPrice: { type: 'number' },
            discountedPrice: { type: 'number' },
            quantity: { type: 'integer' },
            availableQuantity: { type: 'integer' },
            pickupWindowStart: { type: 'string', format: 'date-time' },
            pickupWindowEnd: { type: 'string', format: 'date-time' },
            estimatedCo2Savings: { type: 'number' },
            status: { 
              type: 'string', 
              enum: ['active', 'sold_out', 'expired', 'cancelled'] 
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            businessId: { type: 'string', format: 'uuid' },
            totalAmount: { type: 'number' },
            status: { 
              type: 'string', 
              enum: ['pending_payment', 'paid', 'confirmed', 'ready_for_pickup', 'completed', 'cancelled', 'disputed'] 
            },
            pickupCode: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        WalletTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['credit', 'debit'] },
            amount: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            entityType: { type: 'string', enum: ['business', 'listing'] },
            entityId: { type: 'string', format: 'uuid' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            reviewText: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            senderId: { type: 'string', format: 'uuid' },
            receiverId: { type: 'string', format: 'uuid' },
            businessId: { type: 'string', format: 'uuid' },
            messageText: { type: 'string' },
            messageType: { type: 'string', enum: ['text', 'image'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
            code: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./server/routes/*.ts', './server/routes.ts']
};

const specs = swaggerJSDoc(options);

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Write the swagger.json file
fs.writeFileSync('dist/swagger.json', JSON.stringify(specs, null, 2));

console.log('✅ Swagger JSON generated successfully at dist/swagger.json');
console.log(`📊 Found ${Object.keys(specs.paths || {}).length} API endpoints`);