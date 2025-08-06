import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Looper API',
      version: '1.0.0',
      description: 'Comprehensive API for Looper - Sustainable Food Redistribution Platform',
      contact: {
        name: 'Looper Team',
        email: 'support@looper.app'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' ? 'https://your-domain.replit.app' : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        SessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication using cookies'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            fullName: { type: 'string' },
            profileImageUrl: { type: 'string', format: 'uri' },
            phoneNumber: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            latitude: { type: 'number', format: 'double' },
            longitude: { type: 'number', format: 'double' },
            points: { type: 'integer', minimum: 0 },
            referralCode: { type: 'string' },
            lastActiveAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Business: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            businessType: { 
              type: 'string',
              enum: ['restaurant', 'bakery', 'cafe', 'hotel', 'catering', 'grocery_store', 'food_truck', 'other']
            },
            description: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            latitude: { type: 'number', format: 'double' },
            longitude: { type: 'number', format: 'double' },
            phoneNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },
            website: { type: 'string', format: 'uri' },
            logoUrl: { type: 'string', format: 'uri' },
            coverImageUrl: { type: 'string', format: 'uri' },
            rating: { type: 'number', format: 'double', minimum: 0, maximum: 5 },
            totalReviews: { type: 'integer', minimum: 0 },
            isVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            operatingHours: { type: 'object' },
            socialMedia: { type: 'object' },
            certifications: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        FoodListing: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            businessId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { 
              type: 'string',
              enum: ['meals', 'baked_goods', 'beverages', 'snacks', 'produce', 'prepared_foods', 'other']
            },
            originalPrice: { type: 'number', format: 'double', minimum: 0 },
            discountedPrice: { type: 'number', format: 'double', minimum: 0 },
            discountPercentage: { type: 'number', format: 'double', minimum: 0, maximum: 100 },
            quantity: { type: 'integer', minimum: 0 },
            availableQuantity: { type: 'integer', minimum: 0 },
            unit: { type: 'string' },
            allergens: { type: 'array', items: { type: 'string' } },
            ingredients: { type: 'array', items: { type: 'string' } },
            nutritionalInfo: { type: 'object' },
            status: { 
              type: 'string',
              enum: ['active', 'paused', 'sold_out', 'expired']
            },
            pickupWindowStart: { type: 'string', format: 'date-time' },
            pickupWindowEnd: { type: 'string', format: 'date-time' },
            preparationTime: { type: 'integer', minimum: 0 },
            specialInstructions: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            businessId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'ready', 'completed', 'cancelled']
            },
            totalAmount: { type: 'number', format: 'double', minimum: 0 },
            tax: { type: 'number', format: 'double', minimum: 0 },
            platformFee: { type: 'number', format: 'double', minimum: 0 },
            paymentMethod: {
              type: 'string',
              enum: ['card', 'wallet', 'hybrid']
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'refunded']
            },
            pickupCode: { type: 'string' },
            qrCode: { type: 'string' },
            scheduledPickupStart: { type: 'string', format: 'date-time' },
            scheduledPickupEnd: { type: 'string', format: 'date-time' },
            actualPickupTime: { type: 'string', format: 'date-time' },
            specialInstructions: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        WalletTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            type: {
              type: 'string',
              enum: ['credit', 'debit', 'refund', 'bonus', 'referral']
            },
            amount: { type: 'number', format: 'double' },
            description: { type: 'string' },
            reference: { type: 'string' },
            orderId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed']
            },
            balanceAfter: { type: 'number', format: 'double' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            businessId: { type: 'string' },
            orderId: { type: 'string' },
            listingId: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
            imageUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
            isVerified: { type: 'boolean' },
            helpfulCount: { type: 'integer', minimum: 0 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            senderId: { type: 'string' },
            businessId: { type: 'string' },
            content: { type: 'string' },
            type: {
              type: 'string',
              enum: ['text', 'image', 'file', 'order_update', 'system']
            },
            metadata: { type: 'object' },
            isRead: { type: 'boolean' },
            readAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        SessionAuth: []
      }
    ]
  },
  apis: ['./server/routes.ts', './server/services/*.ts']
};

const specs = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Looper API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  // Serve raw swagger JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

export default specs;