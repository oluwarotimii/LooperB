import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userTypeEnum = pgEnum("user_type", ["consumer", "business_owner", "manager", "staff", "admin"]);
export const businessTypeEnum = pgEnum("business_type", ["restaurant", "hotel", "bakery", "supermarket", "cafe", "caterer"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const listingTypeEnum = pgEnum("listing_type", ["individual", "whoop_bag", "chef_special", "mystery_box"]);
export const listingStatusEnum = pgEnum("listing_status", ["active", "sold_out", "expired", "cancelled"]);
export const orderStatusEnum = pgEnum("order_status", ["pending_payment", "paid", "confirmed", "ready_for_pickup", "completed", "cancelled", "disputed"]);
export const businessRoleEnum = pgEnum("business_role", ["owner", "manager", "staff"]);
export const entityTypeEnum = pgEnum("entity_type", ["business", "listing", "user"]);
export const notificationTypeEnum = pgEnum("notification_type", ["order_update", "new_listing", "deal_expiring", "payment", "review", "system"]);

// Users table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  fullName: varchar("full_name").notNull(),
  phone: varchar("phone", { length: 50 }).unique(),
  passwordHash: varchar("password_hash"),
  userType: userTypeEnum("user_type").notNull().default("consumer"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  pointsBalance: integer("points_balance").default(0),
  totalMealsRescued: integer("total_meals_rescued").default(0),
  referralCode: varchar("referral_code", { length: 10 }).unique(),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  lastActiveAt: timestamp("last_active_at"),
});

// Password resets
export const passwordResets = pgTable("password_resets", {
  email: varchar("email").primaryKey(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Businesses
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: varchar("business_name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  businessType: businessTypeEnum("business_type").notNull(),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  hygieneBadge: boolean("hygiene_badge").default(false),
  logoUrl: text("logo_url"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  openingHours: jsonb("opening_hours"),
  paystackSubaccountCode: varchar("paystack_subaccount_code"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business users (staff hierarchy)
export const businessUsers = pgTable("business_users", {
  userId: varchar("user_id").notNull(),
  businessId: varchar("business_id").notNull(),
  role: businessRoleEnum("role").notNull(),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
}, (table) => ({
  pk: { primaryKey: [table.userId, table.businessId] }
}));

// Food listings
export const foodListings = pgTable("food_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  listingType: listingTypeEnum("listing_type").notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  availableQuantity: integer("available_quantity").notNull(),
  pickupWindowStart: timestamp("pickup_window_start").notNull(),
  pickupWindowEnd: timestamp("pickup_window_end").notNull(),
  estimatedCo2Savings: decimal("estimated_co2_savings", { precision: 10, scale: 2 }).notNull(),
  status: listingStatusEnum("status").notNull().default("active"),
  allergenInfo: text("allergen_info"),
  ingredients: text("ingredients"),
  nutritionInfo: jsonb("nutrition_info"),
  preparationTime: integer("preparation_time"), // minutes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Listing media
export const listingMedia = pgTable("listing_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull(),
  mediaUrl: text("media_url").notNull(),
  mediaType: varchar("media_type", { length: 20 }).notNull(), // 'image', 'video'
  isPrimary: boolean("is_primary").default(false),
  altText: varchar("alt_text"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Dietary tags
export const dietaryTags = pgTable("dietary_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tagName: varchar("tag_name", { length: 100 }).unique().notNull(),
  description: text("description"),
  iconUrl: varchar("icon_url"),
  color: varchar("color", { length: 7 }), // hex color
});

// Listing dietary tags (many-to-many)
export const listingDietaryTags = pgTable("listing_dietary_tags", {
  listingId: varchar("listing_id").notNull(),
  tagId: varchar("tag_id").notNull(),
}, (table) => ({
  pk: { primaryKey: [table.listingId, table.tagId] }
}));

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  businessId: varchar("business_id").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending_payment"),
  pickupCode: varchar("pickup_code", { length: 10 }).unique().notNull(),
  qrCodeUrl: text("qr_code_url"),
  isDonation: boolean("is_donation").default(false),
  paymentReference: varchar("payment_reference"),
  pickupTime: timestamp("pickup_time"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  listingId: varchar("listing_id"),
  quantity: integer("quantity").notNull(),
  pricePerItem: decimal("price_per_item", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").unique().notNull(),
  userId: varchar("user_id").notNull(),
  businessId: varchar("business_id").notNull(),
  ratingFood: integer("rating_food").notNull(), // 1-5
  ratingService: integer("rating_service").notNull(), // 1-5
  ratingPackaging: integer("rating_packaging"), // 1-5
  ratingValue: integer("rating_value"), // 1-5
  comment: text("comment"),
  photos: jsonb("photos"), // array of photo URLs
  isVerifiedPurchase: boolean("is_verified_purchase").default(true),
  businessResponse: text("business_response"),
  businessResponseAt: timestamp("business_response_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  referredId: varchar("referred_id").unique().notNull(),
  bonusAwarded: boolean("bonus_awarded").default(false),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Points history
export const pointsHistory = pgTable("points_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  pointsChange: integer("points_change").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  orderId: varchar("order_id"), // if points earned from order
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wallet transactions
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'credit', 'debit'
  source: varchar("source", { length: 50 }).notNull(), // 'order_refund', 'top_up', 'referral_bonus', 'purchase'
  reference: varchar("reference").unique(),
  orderId: varchar("order_id"),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User favorites
export const userFavorites = pgTable("user_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  businessId: varchar("business_id"),
  listingId: varchar("listing_id"),
  type: varchar("type", { length: 20 }).notNull(), // 'business', 'listing'
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages (for customer support and business communication)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id"),
  orderId: varchar("order_id"),
  businessId: varchar("business_id"),
  subject: varchar("subject"),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 50 }).notNull(), // 'support', 'order_inquiry', 'business_chat'
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  attachments: jsonb("attachments"), // array of attachment URLs
  createdAt: timestamp("created_at").defaultNow(),
});

// Reports and moderation
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id"),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  evidence: jsonb("evidence"), // screenshots, etc.
  isResolved: boolean("is_resolved").default(false),
  resolvedByUserId: varchar("resolved_by_user_id"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  type: notificationTypeEnum("type").notNull(),
  relatedEntityId: varchar("related_entity_id"),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  actionUrl: varchar("action_url"),
  priority: varchar("priority", { length: 20 }).default("normal"), // 'low', 'normal', 'high', 'urgent'
  expiresAt: timestamp("expires_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business analytics cache
export const businessAnalytics = pgTable("business_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  date: timestamp("date").notNull(),
  totalListings: integer("total_listings").default(0),
  totalOrders: integer("total_orders").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0"),
  foodWasteSaved: decimal("food_waste_saved", { precision: 10, scale: 2 }).default("0"), // kg
  co2Saved: decimal("co2_saved", { precision: 10, scale: 2 }).default("0"), // kg
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  newCustomers: integer("new_customers").default(0),
  repeatCustomers: integer("repeat_customers").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  businessUsers: many(businessUsers),
  orders: many(orders),
  reviews: many(reviews),
  referralsGiven: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  pointsHistory: many(pointsHistory),
  walletTransactions: many(walletTransactions),
  favorites: many(userFavorites),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  reports: many(reports),
  notifications: many(notifications),
}));

export const businessesRelations = relations(businesses, ({ many }) => ({
  businessUsers: many(businessUsers),
  foodListings: many(foodListings),
  orders: many(orders),
  reviews: many(reviews),
  analytics: many(businessAnalytics),
}));

export const businessUsersRelations = relations(businessUsers, ({ one }) => ({
  user: one(users, {
    fields: [businessUsers.userId],
    references: [users.id],
  }),
  business: one(businesses, {
    fields: [businessUsers.businessId],
    references: [businesses.id],
  }),
}));

export const foodListingsRelations = relations(foodListings, ({ one, many }) => ({
  business: one(businesses, {
    fields: [foodListings.businessId],
    references: [businesses.id],
  }),
  media: many(listingMedia),
  dietaryTags: many(listingDietaryTags),
  orderItems: many(orderItems),
}));

export const listingMediaRelations = relations(listingMedia, ({ one }) => ({
  listing: one(foodListings, {
    fields: [listingMedia.listingId],
    references: [foodListings.id],
  }),
}));

export const listingDietaryTagsRelations = relations(listingDietaryTags, ({ one }) => ({
  listing: one(foodListings, {
    fields: [listingDietaryTags.listingId],
    references: [foodListings.id],
  }),
  tag: one(dietaryTags, {
    fields: [listingDietaryTags.tagId],
    references: [dietaryTags.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  business: one(businesses, {
    fields: [orders.businessId],
    references: [businesses.id],
  }),
  orderItems: many(orderItems),
  review: one(reviews),
  messages: many(messages),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  listing: one(foodListings, {
    fields: [orderItems.listingId],
    references: [foodListings.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  business: one(businesses, {
    fields: [reviews.businessId],
    references: [businesses.id],
  }),
}));

// Insert and Select schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  averageRating: true,
  totalReviews: true,
});

export const insertFoodListingSchema = createInsertSchema(foodListings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  pickupCode: true,
  qrCodeUrl: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  isVerifiedPurchase: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
  readAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
  readAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

export type FoodListing = typeof foodListings.$inferSelect;
export type InsertFoodListing = z.infer<typeof insertFoodListingSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type DietaryTag = typeof dietaryTags.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type BusinessUser = typeof businessUsers.$inferSelect;
