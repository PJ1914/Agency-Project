'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Package, 
  TrendingUp, 
  Users, 
  BarChart3, 
  ShieldCheck, 
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Image
                src="/TapasyaFlow-Logo.png"
                alt="TapasyaFlow Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="ml-2 text-xl font-bold text-gray-900">TapasyaFlow</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6">
            Manage Your Business with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600"> TapasyaFlow</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Complete business management platform for orders, inventory, shipments, and payments. 
            Scale your operations with real-time insights and automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need to Run Your Business
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Package className="h-8 w-8 text-indigo-600" />}
              title="Order Management"
              description="Track and manage orders from creation to delivery with automated workflows."
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8 text-indigo-600" />}
              title="Inventory Control"
              description="Real-time inventory tracking with automatic stock alerts and history logs."
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8 text-indigo-600" />}
              title="Analytics & Reports"
              description="Comprehensive insights into sales, revenue, and business performance."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-indigo-600" />}
              title="Multi-Organization"
              description="Manage multiple businesses or clients from a single dashboard."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-8 w-8 text-indigo-600" />}
              title="Secure & Reliable"
              description="Enterprise-grade security with role-based access control."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-indigo-600" />}
              title="Automation"
              description="Automate shipments, notifications, and inventory updates."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              name="Free"
              price="0"
              features={[
                'Up to 100 orders/month',
                '1 Organization',
                'Basic Analytics',
                'Email Support'
              ]}
            />
            <PricingCard
              name="Basic"
              price="29"
              features={[
                'Up to 1,000 orders/month',
                '3 Organizations',
                'Advanced Analytics',
                'Priority Support',
                'Custom Branding'
              ]}
              highlighted
            />
            <PricingCard
              name="Premium"
              price="99"
              features={[
                'Unlimited orders',
                'Unlimited Organizations',
                'Advanced Analytics',
                '24/7 Support',
                'API Access',
                'Custom Integrations'
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of businesses managing their operations efficiently
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary">
              Start Free Trial - No Credit Card Required
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 DashboardOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function PricingCard({ name, price, features, highlighted }: { name: string; price: string; features: string[]; highlighted?: boolean }) {
  return (
    <div className={`bg-white p-8 rounded-xl ${highlighted ? 'ring-2 ring-indigo-600 shadow-xl' : 'shadow-sm'}`}>
      {highlighted && (
        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
          Most Popular
        </span>
      )}
      <h3 className="text-2xl font-bold text-gray-900 mt-4 mb-2">{name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-extrabold text-gray-900">${price}</span>
        <span className="text-gray-600">/month</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>
      <Button className="w-full" variant={highlighted ? 'default' : 'outline'}>
        Get Started
      </Button>
    </div>
  );
}
