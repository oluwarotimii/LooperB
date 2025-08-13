# Looper Project Context

This document provides a quick overview of the Looper project for developers.

## Project Overview

Looper is a sustainable food redistribution platform that connects businesses with surplus food to consumers at discounted prices. The goal is to reduce food waste and create economic value.

## Technology Stack

*   **Backend:** Node.js, Express.js, TypeScript, PostgreSQL, Drizzle ORM, WebSockets
*   **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Radix UI
*   **Authentication:** Replit Auth (OpenID Connect)

## Getting Started

### Prerequisites

*   Node.js (v18+)
*   npm (or your preferred package manager)
*   A PostgreSQL database

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

*   **Development:**
    ```bash
    npm run dev
    ```
    This will start the backend server in development mode with hot-reloading.

*   **Production:**
    1.  Build the application:
        ```bash
        npm run build
        ```
    2.  Start the server:
        ```bash
        npm run start
        ```

### Database

The project uses Drizzle ORM for database interactions.

*   **Configuration:** The database connection is configured in `drizzle.config.ts`.
*   **Pushing Changes:** To apply schema changes to the database, run:
    ```bash
    npm run db:push
    ```

## API

The backend provides a RESTful API documented using Swagger/OpenAPI.

*   **API Documentation:** When the server is running, you can access the API documentation at `/api/docs`.
*   **API Documentation File:** The raw OpenAPI specification can be found in `docs/API_DOCUMENTATION.md`.

## Project Structure

*   `client/`: Contains the frontend React application.
*   `server/`: Contains the backend Express.js application.
*   `shared/`: Contains shared code between the client and server, such as validation schemas.
*   `docs/`: Contains project documentation.
