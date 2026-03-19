import UploadForm from '@/components/UploadForm'
import PresentationHistory from '@/components/PresentationHistory'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ヘッダー */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#8C0D3F] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-900 text-sm">早稲田AI研究会</span>
              <span className="text-gray-300 text-sm">/</span>
              <span className="text-gray-500 text-sm">スライド作成ツール</span>
            </div>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
            Powered by Claude AI
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-14">
        {/* ヒーローセクション */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3 leading-tight tracking-tight">
            講義内容からスライドを自動生成
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
            テキストを入力するだけで高品質の<br />
            PowerPointスライドをAIが数秒で生成します。
          </p>
        </div>

        {/* フォームカード */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <UploadForm />
        </div>

        {/* 保存済みプレゼンテーション */}
        <div className="mt-12">
          <h3 className="text-gray-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#8C0D3F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            保存済みのプレゼンテーション
          </h3>
          <PresentationHistory />
        </div>

        {/* 機能紹介 */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          {[
            {
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />,
              title: 'AI自動生成',
              desc: 'Claude AIがテキストを解析し、最適なスライド構成を提案',
            },
            {
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
              title: 'ビジュアル編集',
              desc: 'ドラッグ&ドロップで並び替え、テキストをリアルタイム編集',
            },
            {
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
              title: 'PPTXエクスポート',
              desc: '早稲田テーマのPowerPointファイルとしてダウンロード',
            },
          ].map((feature, i) => (
            <div key={i} className="p-5 rounded-xl border border-gray-200 bg-gray-50">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                <svg className="w-4 h-4 text-[#8C0D3F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {feature.icon}
                </svg>
              </div>
              <h4 className="text-gray-900 font-semibold text-sm mb-1">{feature.title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-100 py-5">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-400 text-xs">
          © 2024 早稲田AI研究会
        </div>
      </footer>
    </div>
  )
}
