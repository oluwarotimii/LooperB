# Looper

Looper is a full-stack application designed to address food waste by connecting businesses with surplus inventory to consumers seeking discounted food items. This platform allows businesses to upload their excess goods, which consumers can then browse and purchase, creating a sustainable and economically beneficial solution for managing surplus food.

## Features

- **User and Business Authentication:** Secure registration and login for both consumers and businesses.
- **Food Listings:** Businesses can create, manage, and track their food listings.
- **Search and Discovery:** Consumers can easily find and filter food items based on location, price, and category.
- **Ordering and Payments:** A seamless checkout process with order tracking and payment processing.
- **Real-time Messaging:** Direct communication between consumers and businesses.
- **Reviews and Ratings:** A feedback system to maintain quality and trust.
- **Digital Wallet and Points:** A loyalty system to reward users.
- **Environmental Impact Tracking:** Users can see the positive environmental impact of their purchases.
- **Admin Dashboard:** A comprehensive dashboard for platform management..

## Technology Stack

### Backend

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** JWT-based with Google OAuth
- **Real-time Communication:** WebSockets
- **File Storage:** Cloudinary
- **Payment Processing:** Paystack
- **Email Service:** Resend

### Frontend

- **Framework:** React with Vite and TypeScript
- **UI Components:** shadcn/ui and Radix UI
- **Styling:** Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Routing:** Wouter

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A running PostgreSQL instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/looper-backend.git
   cd looper-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and populate it with the necessary environment variables. You can use the `.env.example` file as a template.

### Running the Application

- **Development:**
  ```bash
  npm run dev
  ```
  This will start the development server with hot-reloading.

- **Production:**
  ```bash
  npm run build
  npm run start
  ```
  This will build the application for production and start the server.

### Database

To apply the latest database schema changes, run:
```bash
npm run db:push
```

## API Documentation

The API is documented using Swagger/OpenAPI. When the application is running, you can access the interactive API documentation at `/api/docs`.

## Project Structure

The project is organized into the following main directories:

- `/client`: Contains the frontend React application.
- `/server`: Contains the backend Express.js application.
- `/shared`: Contains shared code, such as validation schemas.
- `/docs`: Contains detailed documentation about the project.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

This is a proprietary project. All rights are reserved.
