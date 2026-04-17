import Stripe from 'stripe'
import { adminDb as getAdminDb } from '@/lib/firebaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    if (session.mode === 'subscription' && session.metadata?.uid) {
      const sub = await stripe.subscriptions.retrieve(session.subscription)
      const expiry = new Date(sub.current_period_end * 1000)
      await getAdminDb().collection('users').doc(session.metadata.uid).update({
        plan: 'monthly',
        planExpiry: expiry,
        stripeSubscriptionId: session.subscription,
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const snap = await getAdminDb().collection('users').where('stripeSubscriptionId', '==', sub.id).get()
    if (!snap.empty) {
      await snap.docs[0].ref.update({ plan: 'none', planExpiry: null })
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object
    if (invoice.subscription) {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription)
      const expiry = new Date(sub.current_period_end * 1000)
      const snap = await getAdminDb().collection('users').where('stripeSubscriptionId', '==', invoice.subscription).get()
      if (!snap.empty) {
        await snap.docs[0].ref.update({ planExpiry: expiry })
      }
    }
  }

  return Response.json({ received: true })
}
