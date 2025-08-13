# Overview

This is a full-stack food waste reduction marketplace application called "Looper" built with modern web technologies. The platform connects businesses (restaurants, hotels, bakeries, etc.) with consumers to sell surplus food at discounted prices, helping reduce food waste while providing affordable meals. The application features a comprehensive business management system, user authentication, real-time messaging, order management, payment processing, and impact tracking.

## Recent Changes (January 2025)

✅ **API Documentation Complete**: Implemented comprehensive Swagger/OpenAPI 3.0 documentation covering all 50+ endpoints
✅ **Technical Requirements Document**: Created detailed TRD with system architecture, database design, and implementation specifications  
✅ **Swagger UI Integration**: Added interactive API documentation at `/api/docs` with complete endpoint specifications
✅ **Production-Ready Backend**: All 9 service modules implemented with proper error handling and validation
✅ **Database Schema Optimized**: PostgreSQL schema with proper indexing and relationship modeling
✅ **Authentication Flow**: Complete Replit Auth integration with session management and role-based access control
✅ **Business-Only Registration**: Implemented separate business account registration without requiring consumer account
✅ **Production Email Service**: Integrated Resend API for welcome emails, business verification notifications, and order confirmations
✅ **Advanced File Upload**: Cloudinary integration with image optimization, multiple formats, and progressive loading
✅ **Production Logging**: Comprehensive error tracking and performance monitoring with admin dashboard access
✅ **Background Jobs**: Automated cron jobs for listing cleanup, analytics processing, and email campaigns
✅ **Performance Optimization**: Response compression, rate limiting, security headers, and database connection pooling
✅ **Real-time Messaging**: Enhanced WebSocket messaging system with notification integration
✅ **Admin Dashboard**: System health monitoring, business verification workflow, and comprehensive analytics

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming and brand colors
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Design System**: Component-based architecture with design tokens for colors, spacing, and typography

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect (OIDC) using Passport.js
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful APIs with service layer pattern
- **Real-time Features**: WebSocket support for live messaging and notifications
- **File Handling**: Custom file upload service with support for images, documents, and videos

## Database Design
- **Database**: PostgreSQL with connection pooling via Neon serverless
- **Schema Management**: Drizzle migrations with comprehensive relational schema
- **Key Entities**: Users, Businesses, Food Listings, Orders, Reviews, Messages, Payments, Wallet Transactions
- **Business Logic**: Multi-tenant business access with role-based permissions (owner, manager, staff)
- **Session Storage**: PostgreSQL-based session store for authentication persistence

## Service Layer Architecture
- **Modular Services**: Separated business logic into focused service classes
  - UserService: Profile management, favorites, referrals
  - BusinessService: Business operations, verification, analytics
  - ListingService: Food listing management, search, dietary tags
  - OrderService: Order lifecycle, pickup verification, QR codes
  - PaymentService: Paystack integration, wallet transactions
  - MessageService: Real-time messaging, business communication
  - NotificationService: Push notifications, bulk messaging
  - ReviewService: Review management, verified purchases
  - ImpactService: Environmental impact tracking, analytics
  - WalletService: Digital wallet, transaction history

## Authentication & Authorization
- **Primary Auth**: Replit OIDC integration with automatic user provisioning
- **Session Management**: Secure HTTP-only cookies with PostgreSQL persistence
- **Role-Based Access**: Multi-level permissions (consumer, business_owner, manager, staff, admin)
- **Business Access Control**: Middleware for verifying user access to specific businesses
- **API Security**: Request validation with Zod schemas and authentication middleware

## Payment & Wallet System
- **Payment Gateway**: Paystack integration for Nigerian market
- **Digital Wallet**: Internal credit system for user convenience
- **Transaction Types**: Credits, debits, refunds, bonuses, referral rewards
- **Hybrid Payments**: Support for partial wallet + card payment combinations
- **Financial Tracking**: Comprehensive transaction history and balance management

# External Dependencies

## Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Library**: 'ws' package for real-time communication features

## Payment Processing
- **Paystack**: Nigerian payment gateway for card transactions and bank transfers
- **Digital Wallet**: Internal credit system built on top of PostgreSQL transactions

## Authentication
- **Replit Auth**: OpenID Connect provider for seamless user authentication
- **Passport.js**: Authentication middleware with OIDC strategy

## File & Media Management
- **Canvas**: Server-side image processing and QR code generation
- **File Upload**: Custom service supporting images, documents, and video files
- **CDN Integration**: Configurable base URLs for asset delivery

## Development & Deployment
- **Vite**: Frontend build tool with React plugin and development server
- **Replit Platform**: Development environment with cartographer plugin for debugging
- **TypeScript**: Type safety across frontend, backend, and shared schemas

## UI & Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Icon library for consistent visual elements

## Utilities & Tools
- **Date-fns**: Date manipulation and formatting
- **Zod**: Runtime type validation for API requests and responses
- **Memoizee**: Function memoization for performance optimization
- **Geolocation**: Custom service for distance calculations and location-based features