import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const body = await request.json()
  const { address, lat, lng } = body

  if (!address || !lat || !lng) {
    return Response.json({ error: 'パラメータが不足しています' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const dashboardUrl = `${appUrl}/dashboard?address=${encodeURIComponent(address)}&lat=${lat}&lng=${lng}&session_id={CHECKOUT_SESSION_ID}`

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: 'トッチー 住所検索',
            description: `${address} の相場・法令・ハザード情報`,
          },
          unit_amount: 200,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: dashboardUrl,
    cancel_url: `${appUrl}/`,
    metadata: { address, lat: String(lat), lng: String(lng) },
  })

  return Response.json({ url: session.url })
}
