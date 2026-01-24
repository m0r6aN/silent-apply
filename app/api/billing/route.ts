import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe lazily
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-12-15.clover',
    });
  }
  return stripe;
}

const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY || 'price_monthly_mvp',
  yearly: process.env.STRIPE_PRICE_ID_YEARLY || 'price_yearly_mvp',
};

const PLANS = {
  free: {
    name: 'Free',
    features: [
      '1 profile',
      'Basic analytics',
      '10 Q&A questions/month',
      '1 booking slot/month',
    ],
    limits: {
      profiles: 1,
      questionsPerMonth: 10,
      bookingsPerMonth: 1,
    },
  },
  pro: {
    name: 'Pro',
    features: [
      'Unlimited profiles',
      'Advanced analytics',
      'Unlimited Q&A questions',
      'Unlimited booking slots',
      'Priority support',
      'Custom branding',
    ],
    limits: {
      profiles: 999,
      questionsPerMonth: 9999,
      bookingsPerMonth: 9999,
    },
  },
};

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profiles: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine current plan based on profiles count
    const profileCount = user.profiles.length;
    const currentPlan = profileCount > 1 ? 'pro' : 'free';
    
    // Check for active subscription (simplified for MVP)
    const hasActiveSubscription = false; // TODO: Implement actual subscription check

    return NextResponse.json({
      currentPlan,
      hasActiveSubscription,
      plans: PLANS,
      usage: {
        profiles: profileCount,
        profilesLimit: PLANS[currentPlan].limits.profiles,
        // TODO: Add actual usage tracking for questions and bookings
      },
      canUpgrade: currentPlan === 'free' && profileCount >= 1,
    });

  } catch (error) {
    console.error('Error getting billing info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priceId, interval = 'monthly' } = body;

    if (!priceId && !STRIPE_PRICE_IDS[interval as keyof typeof STRIPE_PRICE_IDS]) {
      return NextResponse.json(
        { error: 'Price ID or interval required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const finalPriceId = priceId || STRIPE_PRICE_IDS[interval as keyof typeof STRIPE_PRICE_IDS];

    // Create Stripe checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/candidate/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/candidate/dashboard?canceled=true`,
      metadata: {
        userId: user.id,
        plan: 'pro',
        interval,
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Webhook handler for Stripe events
// This would typically be a separate endpoint, but included here for MVP
export async function PUT(request: NextRequest) {
  try {
    const sig = request.headers.get('stripe-signature');
    const body = await request.text();

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        
        if (userId) {
          // Update user to pro plan
          // TODO: Implement actual subscription tracking
          console.log(`User ${userId} upgraded to pro plan`);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription cancellation
        console.log(`Subscription ${subscription.id} cancelled`);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
