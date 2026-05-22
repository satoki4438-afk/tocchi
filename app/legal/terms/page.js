export const metadata = { title: '利用規約 | Tocchi' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white" style={{ padding: '80px 32px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 className="font-bold text-stone-800 mb-2" style={{ fontSize: '24px' }}>利用規約</h1>
        <p className="text-sm text-stone-400 mb-10">最終更新：2026年4月18日</p>

        <div className="space-y-8 text-sm text-stone-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>1. サービス概要</h2>
            <p>Tocchi（トッチー）は、住所を入力することで不動産に関する相場・法令・ハザード・周辺施設情報を一画面に集約して提供するWebサービスです。表示される情報は国土交通省等の公開データに基づくものであり、内容の正確性・完全性を保証するものではありません。</p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>2. 料金・支払い</h2>
            <ul className="ml-4 space-y-1 list-disc">
              <li>初回のみ無料でご利用いただけます（ログイン不要）</li>
              <li>2回目以降はスポットプラン（¥300/件）またはライトプラン（¥2,980/月）をご利用ください</li>
              <li>決済はStripeを通じてクレジットカードで行います</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>3. 禁止事項</h2>
            <ul className="ml-4 space-y-1 list-disc">
              <li>サービスの不正利用・大量アクセス</li>
              <li>取得した情報の無断転載・二次配布</li>
              <li>法令または公序良俗に反する行為</li>
              <li>当社または第三者への損害を与える行為</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>4. 免責事項</h2>
            <p>本サービスが提供する情報は、国土交通省等の公開データおよび外部APIをもとに自動集計した参考情報です。情報の正確性・完全性・最新性を保証するものではありません。重要事項説明書の作成にあたっては、必ず宅地建物取引士が原典資料を確認し、最終的な判断を行ってください。本サービスは参考情報の提供を目的としており、法的判断・専門的助言を行うものではありません。</p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>5. 解約</h2>
            <p>スタンダードプランはマイページからいつでも解約できます。解約後は当月末まで引き続きご利用いただけます。返金は原則として行いません。</p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>6. 規約の変更</h2>
            <p>当社は必要に応じて本規約を変更できるものとします。変更後もサービスを継続してご利用された場合、変更後の規約に同意したものとみなします。</p>
          </section>

          <section>
            <h2 className="font-semibold text-stone-800 mb-3" style={{ fontSize: '16px' }}>7. お問い合わせ</h2>
            <p>メール：satoki4438@gmail.com</p>
          </section>
        </div>
      </div>
    </div>
  )
}
