import { adminAuth, adminDb } from '@/lib/firebaseAdmin'

export async function POST(request) {
  const body = await request.json()
  const { idToken } = body

  let decoded
  try {
    decoded = await adminAuth().verifyIdToken(idToken)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = decoded.uid
  const email = decoded.email || ''
  const userRef = adminDb().collection('users').doc(uid)
  const userDoc = await userRef.get()

  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 新規ユーザー → 無料枠を使用
  if (!userDoc.exists) {
    await userRef.set({
      email,
      freeUsed: true,
      plan: 'none',
      planExpiry: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      monthlyUsageCount: 0,
      monthlyUsagePeriod: currentPeriod,
      createdAt: new Date(),
    })
    return Response.json({ status: 'free' })
  }

  const user = userDoc.data()

  // 管理者は無制限
  if (user.isAdmin) {
    return Response.json({ status: 'monthly' })
  }

  // 無料枠が残っている
  if (!user.freeUsed) {
    await userRef.update({ freeUsed: true })
    return Response.json({ status: 'free' })
  }

  // 月額プランのチェック
  if (user.plan === 'monthly' && user.planExpiry && user.planExpiry.toDate() > now) {
    let count = user.monthlyUsageCount || 0
    const period = user.monthlyUsagePeriod || ''

    // 月が変わったらリセット
    if (period !== currentPeriod) {
      count = 0
    }

    if (count < 10) {
      await userRef.update({
        monthlyUsageCount: count + 1,
        monthlyUsagePeriod: currentPeriod,
      })
      return Response.json({ status: 'monthly', remaining: 10 - count - 1 })
    } else {
      return Response.json({ status: 'need_payment_100' })
    }
  }

  return Response.json({ status: 'need_payment_200' })
}
