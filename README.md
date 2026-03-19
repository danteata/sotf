# Floc Church Management System

A comprehensive church management system built with Vite + React + Convex.

## Features

### Core Technologies

- 🔐 Authentication using Clerk
- 🧠 Backend + database via Convex
- 🎨 UI components from Radix UI and shadcn/ui
- 💅 Styling with Tailwind CSS

### Key Functionalities

- 👥 Member management
- ✓ Attendance tracking
- 📅 Event management
- 👤 User profiles
- 📊 Dashboard with analytics
- 📱 Responsive layout with sidebar navigation

## Technical Overview

The application is structured with a modern React architecture using TypeScript and is bundled with Vite. It integrates Convex for data storage and realtime queries, and Clerk for authentication. It's built to gracefully handle cases where authentication isn't configured, showing appropriate fallback UI elements.

### Development Practices

- ⚙️ Environment-based configuration
- 🚀 Dynamic imports for better performance
- 📝 Type safety with TypeScript
- 🧩 Component-based architecture
- 📱 Responsive design principles

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- pnpm (recommended) or npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/danteata/sotf.git
   cd sotf
   ```

2. Install dependencies:

   ```bash
   pnpm install
   # or
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:

   ```
    # Clerk Authentication (optional but recommended)
    VITE_CLERK_PUBLISHABLE_KEY=your_publishable_key

    # Convex (required)
    VITE_CONVEX_URL=https://your-deployment.convex.cloud

    # Google Maps (optional)
    VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. Run the development server:

   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

```bash
pnpm build
# or
npm run build
```

Then start the production server:

```bash
pnpm start
# or
npm start
```

## Contributing

[Add contribution guidelines here]

## License

[Add license information here]
