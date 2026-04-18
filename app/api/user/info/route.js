import { adminAuth, adminDb } from '@/lib/firebaseAdmin'

export async function GET(request) {
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

  const d = doc.data()
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const isMonthlyActive = d.plan === 'monthly' && d.planExpiry && d.planExpiry.toDate() > now
  const usageCount = d.monthlyUsagePeriod === currentPeriod ? (d.monthlyUsageCount || 0) : 0

  return Response.json({
    email: d.email,
    plan: d.isAdmin ? 'admin' : d.plan || 'none',
    isAdmin: d.isAdmin || false,
    freeUsed: d.freeUsed || false,
    isMonthlyActive,
    usageCount,
    usageLimit: 10,
    planExpiry: d.planExpiry ? d.planExpiry.toDate().toISOString() : null,
    stripeSubscriptionId: d.stripeSubscriptionId || null,
  })
}
