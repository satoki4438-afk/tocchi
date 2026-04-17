import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return Response.json({ valid: false }, { status: 400 })
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid') {
    return Response.json({ valid: false })
  }

  return Response.json({
    valid: true,
    address: session.metadata?.address,
    lat: session.metadata?.lat,
    lng: session.metadata?.lng,
  })
}
