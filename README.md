# Makarios Church Management System

A comprehensive church management system built with Next.js 14, specifically designed for Makarios Church.

## Features

### Core Technologies
- 🔐 Authentication using Clerk
- 📤 File uploads using Uploadthing
- 🗄️ Database integration with Supabase
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

The application is structured with a modern React architecture using TypeScript and follows a "client-first" approach with many components marked as "use client". It's built to gracefully handle cases where authentication (Clerk) isn't configured, showing appropriate fallback UI elements.

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
   git clone https://github.com/your-username/makarios-church-management.git
   cd makarios-church-management
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
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
   CLERK_SECRET_KEY=your_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

   # Supabase (optional but recommended)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Uploadthing (optional but recommended)
   UPLOADTHING_SECRET=your_uploadthing_secret
   UPLOADTHING_APP_ID=your_uploadthing_app_id
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
