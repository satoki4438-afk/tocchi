export const metadata = { title: 'プライバシーポリシー | Tocchi' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ padding: '80px 32px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 className="font-bold text-stone-800 mb-2" style={{ fontSize: '24px' }}>プライバシーポリシー</h1>
        <p className="text-sm text-stone-400 mb-10">最終更新：2026年4月18日</p>

        <div className="space-y-8 text-sm text-stone-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>1. 収集する情報</h2>
            <p>当サービス（Tocchi）は、以下の情報を収集します。</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>メールアドレス（アカウント登録時）</li>
              <li>サービスの利用履歴（検索した住所・利用回数）</li>
              <li>決済情報（Stripeが管理し、当社は保持しません）</li>
              <li>ブラウザのCookie・ローカルストレージ（認証維持のため）</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>2. 利用目的</h2>
            <ul className="ml-4 space-y-1 list-disc">
              <li>サービスの提供・維持・改善</li>
              <li>課金・プラン管理</li>
              <li>お問い合わせへの対応</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>3. 第三者への提供</h2>
            <p>当社は、以下の場合を除き、個人情報を第三者に提供しません。</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>法令に基づく場合</li>
              <li>サービス運営に必要な業務委託先（Firebase、Stripe、Vercel）への提供</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>4. 情報の管理</h2>
            <p>収集した情報はGoogle Firebase上で管理し、不正アクセス防止のため適切なセキュリティ対策を講じます。</p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>5. お問い合わせ</h2>
            <p>個人情報の開示・訂正・削除のご請求は下記までご連絡ください。</p>
            <p className="mt-2">メール：satoki4438@gmail.com</p>
          </section>
        </div>
      </div>
    </div>
  )
}
