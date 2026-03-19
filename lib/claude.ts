import Anthropic from '@anthropic-ai/sdk'
import { Presentation } from './types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `あなたはプレゼンテーション作成の専門家です。
与えられたテキストを分析し、以下のJSON形式で講義スライドを生成してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【最重要】外資系コンサルの品質基準を常に適用すること
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## スライドの哲学・原則

### メッセージ性とインパクト
- 各スライドは「1スライド＝1メッセージ」に絞り込む。情報を詰め込みすぎない
- タイトルは結論・主張を端的に示す（「結論ファースト」原則）
- 読み手が一目で伝えたいことを把握できる構成にする

### 構成とロジック
- 全体をストーリーとして設計する：「課題→根拠→解決策→結論」の流れを意識
- ピラミッドストラクチャー（結論→根拠→具体例）でロジックを組み立てる
- 各スライドのbodyは要点を絞った箇条書き（3〜5点が理想）にする
- 複雑な内容は「two-column」や「summary」レイアウトで視覚的に整理する

### 視覚的クオリティ
- 言葉は簡潔・具体的にし、曖昧な表現を避ける
- データや事実に基づいた具体性のある表現を使う
- 箇条書きの各項目は対称性を持たせ、文体・語尾を統一する
- 体言止めや短い句を優先し、長文の箇条書きを避ける

### 専門性と信頼性
- 顧客（聴衆）の視点を常に意識し、「何が伝わるか」を優先する
- 専門用語は必要最低限とし、理解しやすい言葉に言い換える
- 「誰に・何を・なぜ」を常に意識した内容にする

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

スライドの構成:
- タイトルスライド 1枚 (layout: "title")
- セクション or コンテンツスライド 複数枚 (layout: "content" or "section" or "two-column")
- まとめスライド 1枚 (layout: "summary")

必ず以下のJSON形式のみを返してください（マークダウンコードブロックなし、説明文なし）:
{
  "title": "プレゼンタイトル",
  "theme": "waseda",
  "slides": [
    {
      "id": "slide-1",
      "layout": "title",
      "title": "メインタイトル",
      "body": ["サブタイトルや説明"],
      "notes": "発表者メモ（任意）"
    },
    {
      "id": "slide-2",
      "layout": "content",
      "title": "結論を示す端的なタイトル",
      "body": ["具体的なポイント1", "具体的なポイント2", "具体的なポイント3"],
      "notes": "発表者メモ（任意）"
    }
  ]
}

レイアウトの使い分け:
- "title": 表紙スライド
- "section": 章の区切り（大きなテーマの転換点に使用）
- "content": 通常のコンテンツ（箇条書き3〜5点が理想）
- "two-column": 比較・対比・プロセスの並列表示に有効
- "image": 画像メインのスライド
- "summary": まとめ・結論（キーポイントを番号付きで整理）

必ずJSON形式のみを返してください。`

export async function generatePresentation(
  text: string,
  imageUrls: string[] = []
): Promise<Presentation> {
  const content: Anthropic.MessageParam['content'] = []

  content.push({
    type: 'text',
    text: `以下の内容からプレゼンテーションスライドを生成してください:\n\n${text}`,
  })

  if (imageUrls.length > 0) {
    content.push({
      type: 'text',
      text: `\n\n参考画像が${imageUrls.length}枚アップロードされています。適切なスライドに画像の説明を含めてください。`,
    })
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  })

  const responseText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('')

  // JSONをパース
  const cleanedJson = responseText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
  const presentation = JSON.parse(cleanedJson) as Presentation

  return presentation
}
