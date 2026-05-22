import Anthropic from '@anthropic-ai/sdk'

// 使用モデル — 必要に応じて変更
const MODEL = 'claude-sonnet-4-6'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Vercel タイムアウト延長（Hobby: 10s / Pro: 60s の範囲で有効）
export const maxDuration = 30

const SYSTEM_PROMPT = `あなたは不動産の物件調査メモ作成を補助するAIです。
提供された公開データ・外部API結果のみを整理してください。
以下は絶対に禁止です：
- 法的判断・専門的助言・建築可否・再建築可否の断定
- 「問題なし」「問題ない」「安全」「大丈夫」「確定」「建築可能」「再建築可能」「接道あり」「適合」などの断定表現
必ず「参考情報」「要確認」「原典資料確認」「自治体確認」「現地確認」の文脈で記載してください。
重要事項説明書への転記前には、必ず宅地建物取引士が原典資料を確認し、最終的な判断を行ってください。
【役所で確認すること】では以下を参考に記載してください（取得済みデータがあれば「参考値あり・現地確認推奨」と明記し、未取得は「要確認」）：
- 建築指導課：前面道路の建築基準法上の道路種別・幅員・接道長さ・セットバック要否
- 都市計画課：都市計画道路・防火準防火地域・高度地区・地区計画
- 上下水道担当課：前面配管の有無・引込状況・口径
- 文化財担当課：埋蔵文化財包蔵地の該当有無`

export async function POST(request) {
  let address, summaryData
  try {
    const body = await request.json()
    address = body.address
    summaryData = body.summaryData
  } catch {
    return Response.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  if (!address || !summaryData) {
    return Response.json({ error: 'データが不足しています' }, { status: 400 })
  }

  const userMessage = buildPrompt(address, summaryData)

  try {
    const message = await client.messages.create({
      model: MODEL,
      // TODO: Vercel Hobby 10s タイムアウトが出る場合は 800 に戻す
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const summary = message.content[0]?.text || ''
    return Response.json({ summary })
  } catch {
    return Response.json(
      { error: 'AI要点整理の生成に失敗しました。時間をおいて再度お試しください。' },
      { status: 500 }
    )
  }
}

function buildPrompt(address, d) {
  const lines = []
  lines.push(`対象住所：${address}`)
  lines.push('')

  // 用途地域
  lines.push('【用途地域・都市計画】')
  lines.push(`用途地域：${d.zoning?.useArea || '取得できず'}`)
  lines.push(`建ぺい率：${d.zoning?.buildingCoverageRatio || '取得できず'}`)
  lines.push(`容積率：${d.zoning?.floorAreaRatio || '取得できず'}`)
  lines.push('')

  // ハザード
  lines.push('【ハザード情報（タイル範囲内の参考値）】')
  if (d.hazard) {
    for (const val of Object.values(d.hazard)) {
      const status = val.hit
        ? `区域内（${val.detail || '詳細は原典要確認'}）`
        : 'タイル範囲内でデータなし'
      lines.push(`${val.label}：${status}`)
    }
  }
  lines.push('')

  // 接道候補
  lines.push('【接道候補（OSM / Overpass API 参考値・自治体資料・道路台帳での確認が必要）】')
  if (d.roads?.length) {
    for (const r of d.roads) {
      const w = r.width
        ? `幅員${r.width}m（${r.widthSource === 'estimated' ? '推定値' : '取得値'}）`
        : '幅員不明'
      lines.push(`${r.name}：${w}${r.oneway ? '・一方通行' : ''}`)
    }
  } else {
    lines.push('データなし')
  }
  lines.push('')

  // 地価
  lines.push('【地価公示（最近接・参考値）】')
  lines.push(d.landprice ? `${d.landprice.location}：${d.landprice.price || '価格不明'}` : 'データなし')
  lines.push('')

  // 実取引価格
  lines.push('【周辺実取引価格（直近・国交省データ・約3ヶ月遅れ）】')
  if (d.tradeItems?.length) {
    for (const t of d.tradeItems) {
      lines.push(`${t.type}（${t.year}年）：${t.price}`)
    }
  } else {
    lines.push('データなし')
  }
  lines.push('')

  // 学区
  lines.push('【学区（国交省 XKT004/005 参考値）】')
  lines.push(`小学校区：${d.school?.elementary || 'データなし'}`)
  lines.push(`中学校区：${d.school?.junior || 'データなし'}`)
  lines.push('')

  // 周辺施設
  lines.push('【周辺施設（Google Places API / 最寄り）】')
  if (d.nearby?.length) {
    for (const n of d.nearby) {
      const dist = n.distance
        ? n.distance < 1000 ? `${n.distance}m` : `${(n.distance / 1000).toFixed(1)}km`
        : '距離不明'
      lines.push(`${n.label}：${n.name}（${dist}）`)
    }
  } else {
    lines.push('データなし')
  }
  lines.push('')

  lines.push('上記データをもとに、以下の見出しで物件調査メモとして要点整理してください。')
  lines.push('断定表現は使わず、すべて「参考情報」「要確認」のスタンスで記載してください。')
  lines.push('各見出しの内容は簡潔に3行以内にしてください。')
  lines.push('')
  lines.push('【概要】')
  lines.push('【重説前に確認したいポイント】')
  lines.push('【接道に関する確認事項】')
  lines.push('【不足・要確認データ】')
  lines.push('【役所で確認すること】')
  lines.push('【コピペ用メモ】')

  return lines.join('\n')
}
