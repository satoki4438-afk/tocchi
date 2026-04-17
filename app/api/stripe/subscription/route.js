import Stripe from 'stripe'
import { adminAuth } from '@/lib/firebaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const body = await request.json()
  const { idToken } = body

  let decoded
  try {
    decoded = await adminAuth().verifyIdToken(idToken)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: process.env.STRIPE_MONTHLY_PRICE_ID,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${appUrl}/?subscribed=1`,
    cancel_url: `${appUrl}/`,
    customer_email: decoded.email,
    metadata: { uid: decoded.uid },
  })

  return Response.json({ url: session.url })
}
