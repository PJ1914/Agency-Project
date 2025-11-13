# Huggies Export Dashboard

A comprehensive dashboard for tracking orders, shipments, inventory, and payments for an exporting business.

## Features

- 📊 Real-time order and inventory tracking
- 💰 Razorpay payment integration
- 📈 Analytics and reporting (daily, weekly, monthly, yearly)
- 🚚 Shipment tracking
- 📱 Responsive design
- 🔐 Secure admin authentication
- 📄 Export reports in PDF and Excel

## Tech Stack

- **Framework:** Next.js 14 with TypeScript
- **Styling:** TailwindCSS + ShadCN UI
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Charts:** Recharts
- **Reports:** jsPDF + ExcelJS
- **Payments:** Razorpay API
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project set up
- Razorpay account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd huggies-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase and Razorpay credentials.

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Add your Firebase config to `.env.local`

### Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Get your API keys from the dashboard
3. Add keys to `.env.local`

## Project Structure

```
huggies-dashboard/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── orders/            # Orders management
│   ├── inventory/         # Inventory management
│   ├── shipments/         # Shipments tracking
│   ├── payments/          # Payments tracking
│   ├── reports/           # Reports generation
│   └── login/             # Authentication
├── components/            # React components
├── lib/                   # Utility libraries
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
└── styles/                # Global styles
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## Security

- Firebase Authentication for access control
- Firestore security rules
- Environment variables for sensitive data
- HTTPS-only communication

## License

Private - All rights reserved

## Support

For support, contact: [your-email@example.com]
