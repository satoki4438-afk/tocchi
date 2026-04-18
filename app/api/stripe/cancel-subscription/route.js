import Stripe from 'stripe'
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const auth = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded
  try {
    decoded = await adminAuth().verifyIdToken(auth)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const doc = await adminDb().collection('users').doc(decoded.uid).get()
  if (!doc.exists) return Response.json({ error: 'Not found' }, { status: 404 })

  const { stripeSubscriptionId } = doc.data()
  if (!stripeSubscriptionId) return Response.json({ error: 'No subscription' }, { status: 400 })

  await stripe.subscriptions.cancel(stripeSubscriptionId)
  await adminDb().collection('users').doc(decoded.uid).update({
    plan: 'none',
    planExpiry: null,
    stripeSubscriptionId: null,
  })

  return Response.json({ success: true })
}
