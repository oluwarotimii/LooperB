CREATE TABLE `users` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) UNIQUE,
  `phone` VARCHAR(50) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `profile_picture_url` TEXT,
  `user_type` VARCHAR(100) NOT NULL,
  `is_verified` BOOLEAN DEFAULT false,
  `created_at` TIMESTAMPTZ DEFAULT (now()),
  `updated_at` TIMESTAMPTZ DEFAULT (now()),
  `points_balance` INTEGER DEFAULT 0,
  `total_meals_rescued` INTEGER DEFAULT 0,
  `referral_code` VARCHAR(10) UNIQUE
);

CREATE TABLE `password_resets` (
  `email` VARCHAR(255) PRIMARY KEY,
  `token` TEXT NOT NULL,
  `expires_at` TIMESTAMPTZ NOT NULL
);

CREATE TABLE `businesses` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `business_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `address` TEXT NOT NULL,
  `location` GEOGRAPHY(Point,4326) NOT NULL,
  `business_type` VARCHAR(100) NOT NULL,
  `verification_status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `hygiene_badge` BOOLEAN DEFAULT false,
  `logo_url` TEXT,
  `average_rating` DECIMAL(3,2) DEFAULT 0,
  `opening_hours` JSONB,
  `paystack_subaccount_code` VARCHAR(255),
  `created_at` TIMESTAMPTZ DEFAULT (now()),
  `updated_at` TIMESTAMPTZ DEFAULT (now())
);

CREATE TABLE `business_users` (
  `user_id` UUID NOT NULL,
  `business_id` UUID NOT NULL,
  `role` ENUM ('owner', 'manager', 'staff') NOT NULL,
  `PRIMARY` KEY(user_id,business_id)
);

CREATE TABLE `food_listings` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `business_id` UUID NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `listing_type` VARCHAR(50) NOT NULL,
  `original_price` DECIMAL(10,2) NOT NULL,
  `discounted_price` DECIMAL(10,2) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `available_quantity` INTEGER NOT NULL,
  `pickup_window_start` TIMESTAMPTZ NOT NULL,
  `pickup_window_end` TIMESTAMPTZ NOT NULL,
  `estimated_co2_savings` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMPTZ DEFAULT (now()),
  `updated_at` TIMESTAMPTZ DEFAULT (now())
);

CREATE TABLE `listing_media` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `listing_id` UUID NOT NULL,
  `media_url` TEXT NOT NULL,
  `media_type` VARCHAR(20) NOT NULL,
  `is_primary` BOOLEAN DEFAULT false
);

CREATE TABLE `dietary_tags` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `tag_name` VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE `listing_dietary_tags` (
  `listing_id` UUID,
  `tag_id` UUID,
  `PRIMARY` KEY(listing_id,tag_id)
);

CREATE TABLE `orders` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `user_id` UUID,
  `business_id` UUID,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM ('pending_payment', 'paid', 'confirmed', 'ready_for_pickup', 'completed', 'cancelled', 'disputed') NOT NULL DEFAULT 'pending_payment',
  `pickup_code` VARCHAR(10) UNIQUE NOT NULL,
  `is_donation` BOOLEAN DEFAULT false,
  `created_at` TIMESTAMPTZ DEFAULT (now())
);

CREATE TABLE `order_items` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `order_id` UUID NOT NULL,
  `listing_id` UUID,
  `quantity` INTEGER NOT NULL,
  `price_per_item` DECIMAL(10,2) NOT NULL
);

CREATE TABLE `reviews` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `order_id` UUID UNIQUE NOT NULL,
  `user_id` UUID NOT NULL,
  `business_id` UUID NOT NULL,
  `rating_food` INTEGER NOT NULL,
  `rating_service` INTEGER NOT NULL,
  `comment` TEXT,
  `created_at` TIMESTAMPTZ DEFAULT (now())
);

CREATE TABLE `referrals` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `referrer_id` UUID NOT NULL,
  `referred_id` UUID UNIQUE NOT NULL,
  `bonus_awarded` BOOLEAN DEFAULT false,
  `created_at` TIMESTAMPTZ DEFAULT (now())
);

CREATE TABLE `points_history` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `user_id` UUID NOT NULL,
  `points_change` INTEGER NOT NULL,
  `reason` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMPTZ DEFAULT (now())
);

CREATE TABLE `reports` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `reporter_id` UUID,
  `entity_type` ENUM ('business', 'listing', 'user') NOT NULL,
  `entity_id` UUID NOT NULL,
  `reason` TEXT NOT NULL,
  `is_resolved` BOOLEAN DEFAULT false,
  `resolved_by_user_id` UUID,
  `created_at` TIMESTAMPTZ DEFAULT (now())
);

CREATE TABLE `notifications` (
  `id` UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  `user_id` UUID NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT false,
  `type` VARCHAR(50),
  `related_entity_id` UUID,
  `created_at` TIMESTAMPTZ DEFAULT (now())
);

ALTER TABLE `business_users` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `business_users` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `food_listings` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `listing_media` ADD FOREIGN KEY (`listing_id`) REFERENCES `food_listings` (`id`);

ALTER TABLE `listing_dietary_tags` ADD FOREIGN KEY (`listing_id`) REFERENCES `food_listings` (`id`);

ALTER TABLE `listing_dietary_tags` ADD FOREIGN KEY (`tag_id`) REFERENCES `dietary_tags` (`id`);

ALTER TABLE `orders` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `orders` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `order_items` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

ALTER TABLE `order_items` ADD FOREIGN KEY (`listing_id`) REFERENCES `food_listings` (`id`);

ALTER TABLE `reviews` ADD FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

ALTER TABLE `reviews` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `reviews` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `referrals` ADD FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`);

ALTER TABLE `referrals` ADD FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`);

ALTER TABLE `points_history` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `reports` ADD FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`);

ALTER TABLE `reports` ADD FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`id`);

ALTER TABLE `notifications` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `users` ADD FOREIGN KEY (`phone`) REFERENCES `users` (`id`);

ALTER TABLE `users` ADD FOREIGN KEY (`is_verified`) REFERENCES `users` (`password_hash`);
