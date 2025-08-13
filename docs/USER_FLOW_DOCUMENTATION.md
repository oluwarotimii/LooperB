# Looper User Flow Documentation

## Document Overview

This document maps out the complete user flows for all user types in the Looper food redistribution platform, from registration to advanced features.

---

## 1. Account Types & Registration Flows

### 1.1 Consumer Registration Flow

**Entry Points:**
- Website/App homepage
- Social media links
- Referral links from existing users

**Flow Steps:**
1. **Landing Page** → Click "Sign Up as Consumer"
2. **Registration Form**
   - Email address
   - Full name
   - Phone number
   - Password (with strength requirements)
   - Optional: Referral code
3. **Email Verification**
   - Automated welcome email sent via Resend
   - Click verification link
   - Account activated
4. **Profile Setup**
   - Location preferences
   - Dietary restrictions
   - Notification preferences
5. **Onboarding Tutorial**
   - How to search for deals
   - Understanding pickup codes
   - Environmental impact tracking

**Database Actions:**
```sql
INSERT INTO users (email, full_name, phone, role, account_type, referral_code)
VALUES (?, ?, ?, 'consumer', 'consumer', generated_code);
```

### 1.2 Business-Only Registration Flow

**Entry Points:**
- "Business Sign Up" page
- Partner referral links
- Business directory listings

**Flow Steps:**
1. **Business Landing Page** → Click "Register Your Business"
2. **Business Registration Form**
   - Business owner personal details (email, name, phone)
   - Business information (name, type, address)
   - Business documents upload (via Cloudinary)
   - Operating hours setup
3. **Account Creation**
   - Creates user account with `account_type: "business"`
   - Creates business record
   - Links user as business owner
4. **Verification Process**
   - Admin review of documents
   - Automated checks (address verification, document validation)
   - Email notification of approval/rejection via Resend
5. **Business Dashboard Setup**
   - Payment method setup (Paystack integration)
   - Staff invitation system
   - First listing creation tutorial

**Database Actions:**
```sql
-- User account
INSERT INTO users (email, full_name, phone, role, account_type)
VALUES (?, ?, ?, 'business_owner', 'business');

-- Business record
INSERT INTO businesses (business_name, owner_id, verification_status)
VALUES (?, ?, 'pending');

-- Business user relationship
INSERT INTO business_users (user_id, business_id, role)
VALUES (?, ?, 'owner');
```

### 1.3 Hybrid Account Flow

**Scenario:** Consumer wants to also list business items

**Flow Steps:**
1. **Existing Consumer Account** → Navigate to "Become a Business Partner"
2. **Business Information Addition**
   - Business verification form
   - Upload business documents
   - Set up business profile
3. **Account Type Upgrade**
   - Update `account_type` to "hybrid"
   - Maintain consumer features
   - Add business capabilities
4. **Verification Process** (same as business-only)

---

## 2. Admin User Flows

### 2.1 Admin Dashboard Access

**Authentication Flow:**
1. **Admin Login** → Special admin login portal
2. **Multi-Factor Authentication** (if enabled)
3. **Role Verification** → Check `role = 'admin'`
4. **Dashboard Access** → Full system overview

**Dashboard Sections:**
- **System Health**
  - Server status
  - Database metrics
  - API response times
  - Error rates (from logger service)
- **Business Management**
  - Pending verifications
  - Business analytics
  - Support tickets
- **User Management**
  - User statistics
  - Account issues
  - Referral tracking
- **Content Moderation**
  - Reported listings
  - Review moderation
  - Inappropriate content flags

### 2.2 Business Verification Workflow

**Flow Steps:**
1. **Pending Applications List** → View all pending businesses
2. **Business Review Page**
   - Business details verification
   - Document review (via Cloudinary links)
   - Google Maps address verification
   - Owner identity verification
3. **Verification Decision**
   - Approve → Sets `verification_status = 'verified'`
   - Reject → Sets `verification_status = 'rejected'` + reason
   - Request More Info → Email notification to business
4. **Automated Email Notification** → Sent via emailService
5. **Audit Trail** → Log all admin actions via logger service

---

## 3. Consumer User Flows

### 3.1 Food Discovery & Search

**Primary Flow:**
1. **Home Page** → See nearby deals
2. **Search Interface**
   - Location-based filtering
   - Business type filtering (restaurant, bakery, etc.)
   - Price range selection
   - Dietary tag filtering
   - Distance radius
3. **Results Display**
   - List/Grid view toggle
   - Sort options (distance, price, expiry time)
   - Map view integration
4. **Listing Detail View**
   - Food images (optimized via Cloudinary)
   - Description & ingredients
   - Allergen information
   - Pickup window
   - Business information
   - Reviews & ratings

### 3.2 Order Placement Flow

**Flow Steps:**
1. **Add to Cart** → Select quantity
2. **Cart Review** → Modify quantities, remove items
3. **Checkout Process**
   - Pickup time selection
   - Special instructions
   - Payment method selection (wallet/card)
4. **Payment Processing**
   - Paystack integration for card payments
   - Wallet balance deduction
   - Payment confirmation
5. **Order Confirmation**
   - Generate unique pickup code
   - QR code generation (via qrCode utility)
   - Email confirmation (via Resend)
   - SMS notification (optional)

### 3.3 Order Fulfillment

**Flow Steps:**
1. **Order Tracking** → Real-time status updates
2. **Pickup Preparation**
   - Business notifies when ready
   - Push notification to consumer
3. **Pickup Process**
   - Present pickup code/QR at business
   - Business scans QR or enters code
   - Order marked as completed
4. **Post-Pickup**
   - Review prompt notification
   - Impact tracking update
   - Points/rewards credited

---

## 4. Business User Flows

### 4.1 Business Owner Complete Flow

**Daily Operations:**
1. **Dashboard Login** → View today's summary
2. **Inventory Management**
   - Create new listings
   - Update existing quantities
   - Set expiry times
   - Upload food images (Cloudinary)
3. **Order Management**
   - View incoming orders
   - Confirm order readiness
   - Process pickups (QR scanning)
   - Handle cancellations/refunds
4. **Analytics Review**
   - Daily/weekly sales reports
   - Environmental impact metrics
   - Customer feedback analysis
   - Financial summaries

### 4.2 Staff Management Flow

**Owner Actions:**
1. **Staff Invitation**
   - Send invitation email (via emailService)
   - Set role (manager/staff)
   - Define permissions
2. **Staff Onboarding**
   - New staff receives invitation email
   - Creates account or links existing account
   - Role assignment and training materials
3. **Permission Management**
   - View/edit staff roles
   - Revoke access when needed
   - Activity monitoring

### 4.3 Listing Management Flow

**Create Listing Process:**
1. **Listing Form**
   - Food title & description
   - Original & discounted prices
   - Quantity available
   - Pickup window
   - Category selection
   - Allergen information
2. **Media Upload**
   - Multiple images via Cloudinary
   - Automatic optimization
   - Alt text for accessibility
3. **Dietary Tags**
   - Select applicable tags (vegan, gluten-free, etc.)
   - Create custom tags if needed
4. **Pricing Strategy**
   - Dynamic pricing options
   - Bulk discount rules
   - Time-based price adjustments
5. **Publication**
   - Review and publish
   - Automatic availability calculation
   - Search engine optimization

---

## 5. Advanced Features & Workflows

### 5.1 Real-time Messaging System

**Consumer-Business Communication:**
1. **Message Initiation** → From order or business page
2. **Real-time Chat** → WebSocket connection
3. **Message Types**
   - Text messages
   - Image attachments
   - Order-specific discussions
4. **Notification System** → Push notifications for new messages

### 5.2 Review & Rating System

**Review Flow:**
1. **Review Eligibility** → Only after completed orders
2. **Review Form**
   - Multiple rating categories (food, service, packaging, value)
   - Written review
   - Photo attachments
3. **Review Moderation** → Automatic and admin review
4. **Business Response** → Businesses can respond to reviews
5. **Rating Aggregation** → Weighted average calculation

### 5.3 Wallet & Points System

**Digital Wallet:**
1. **Wallet Top-up** → Paystack integration
2. **Transaction History** → All credits/debits logged
3. **Automatic Refunds** → For cancelled orders
4. **Points Earning**
   - Order completion points
   - Referral bonuses
   - Review rewards
   - Environmental impact milestones

### 5.4 Impact Tracking

**Environmental Impact:**
1. **CO2 Calculations** → Based on food type and quantity
2. **Personal Dashboard** → Individual impact metrics
3. **Community Impact** → Platform-wide statistics
4. **Gamification** → Achievements and milestones
5. **Social Sharing** → Share impact on social media

---

## 6. Background Processes & Automation

### 6.1 Automated Email Campaigns

**Email Types (via Resend):**
- Welcome emails for new users
- Order confirmations and updates
- Business verification notifications
- Daily deal newsletters
- Abandoned cart reminders
- Staff invitations
- Password reset emails

### 6.2 Background Jobs (via node-cron)

**Daily Jobs:**
- Expire outdated listings
- Calculate business analytics
- Send deal expiry reminders
- Update user engagement metrics

**Weekly Jobs:**
- Generate business performance reports
- Clean up old notifications
- Update trending businesses
- Process referral rewards

**Monthly Jobs:**
- Archive old orders
- Generate compliance reports
- Update business ratings
- Clean up unused media files

### 6.3 Real-time Notifications

**Notification Types:**
- Order status updates
- New messages
- Deal alerts
- Payment confirmations
- System announcements

**Delivery Channels:**
- In-app notifications
- Email notifications (Resend)
- Push notifications (if mobile app)
- SMS notifications (optional)

---

## 7. Security & Compliance Flows

### 7.1 Authentication Security

**Login Security:**
1. **Rate Limiting** → Prevent brute force attacks
2. **JWT Management** → Short-lived access tokens
3. **Refresh Token Rotation** → Enhanced security
4. **Session Management** → Secure session handling
5. **Multi-device Support** → Independent session management

### 7.2 Data Protection

**Privacy Compliance:**
1. **Data Minimization** → Collect only necessary data
2. **Consent Management** → Clear privacy policies
3. **Right to Deletion** → Complete data removal
4. **Data Export** → User data portability
5. **Audit Trails** → Log all data access

### 7.3 Business Verification Security

**Verification Process:**
1. **Document Upload** → Secure Cloudinary storage
2. **Identity Verification** → Multi-step verification
3. **Address Verification** → Google Maps integration
4. **Financial Verification** → Bank account validation
5. **Ongoing Monitoring** → Regular compliance checks

---

## 8. Error Handling & Recovery

### 8.1 Payment Error Flows

**Payment Failure Scenarios:**
1. **Card Declined** → Retry with different method
2. **Network Issues** → Automatic retry with backoff
3. **Insufficient Wallet Funds** → Top-up prompt
4. **Payment Gateway Issues** → Alternative payment methods

### 8.2 Order Error Recovery

**Common Error Scenarios:**
1. **Food Unavailable** → Automatic refund + notification
2. **Business Closed** → Order cancellation + refund
3. **Pickup Code Issues** → Manual verification process
4. **Quality Issues** → Dispute resolution flow

### 8.3 System Error Monitoring

**Error Tracking (via Logger Service):**
1. **Real-time Error Alerts** → Admin notifications
2. **Error Categorization** → Automatic error grouping
3. **Performance Monitoring** → API response time tracking
4. **User Impact Assessment** → Error impact analysis

---

## 9. Mobile App Considerations

### 9.1 Mobile-Specific Features

**Enhanced Mobile Experience:**
1. **Location Services** → Automatic location detection
2. **Camera Integration** → Easy photo uploads
3. **Push Notifications** → Real-time updates
4. **Offline Functionality** → Basic app functionality offline
5. **QR Code Scanning** → Built-in QR scanner

### 9.2 Mobile Payment Integration

**Mobile Payment Options:**
1. **Paystack Mobile SDK** → Native payment experience
2. **Digital Wallet** → Quick payments
3. **Biometric Authentication** → Secure payment confirmation
4. **Mobile-optimized Checkout** → Streamlined process

---

## 10. Integration Patterns

### 10.1 Third-party Integrations

**Current Integrations:**
- **Paystack**: Payment processing
- **Cloudinary**: Media management
- **Resend**: Email delivery
- **Google Maps**: Location services (to be implemented)

**Integration Flow Patterns:**
1. **API Key Management** → Secure credential storage
2. **Webhook Handling** → Real-time event processing
3. **Error Recovery** → Graceful failure handling
4. **Rate Limiting** → Respect third-party limits

### 10.2 Webhook Processing

**Paystack Webhooks:**
1. **Payment Success** → Update order status
2. **Payment Failed** → Handle payment failures
3. **Refund Processed** → Update wallet balance

**Cloudinary Webhooks:**
1. **Upload Complete** → Update media URLs
2. **Transformation Complete** → Notify optimization completion

---

## 11. Performance Optimization Strategies

### 11.1 Database Optimization

**Query Optimization:**
- Strategic indexing on frequently queried fields
- Query result caching for expensive operations
- Connection pooling with health checks
- Read/write splitting for scalability

### 11.2 API Performance

**Response Optimization:**
- Gzip compression for all responses
- Cursor-based pagination for large datasets
- Response caching for static content
- API versioning for backward compatibility

### 11.3 Media Optimization

**Cloudinary Optimizations:**
- Automatic format selection (WebP, AVIF)
- Dynamic image resizing
- Progressive image loading
- CDN distribution globally

---

This comprehensive user flow documentation serves as the blueprint for understanding how all user types interact with the Looper platform, ensuring a smooth experience from registration through advanced feature usage.