"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            学会管理システム
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            プレゼンテーション登録とマップ管理を行います
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
            <div
              className="bg-card border border-border rounded-xl shadow-soft p-8 hover:shadow-medium transition-shadow cursor-pointer"
              onClick={() => router.push("/conferences")}
            >
              <div className="text-5xl mb-4">🎓</div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                学会管理
              </h2>
              <p className="text-muted-foreground mb-6">
                学会の登録・編集と会場情報の管理を行います。
              </p>
              <Button onClick={(e) => {e.stopPropagation(); router.push("/conferences/new");}}>
                新規学会登録
              </Button>
            </div>

            <div
              className="bg-card border border-border rounded-xl shadow-soft p-8 hover:shadow-medium transition-shadow cursor-pointer"
              onClick={() => router.push("/presentations")}
            >
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                プレゼンテーション管理
              </h2>
              <p className="text-muted-foreground mb-6">
                学会のプレゼンテーションを登録・管理します。PDFアップロードとAI要約機能を利用できます。
              </p>
              <Button onClick={(e) => {e.stopPropagation(); router.push("/presentations/new");}}>
                新規登録
              </Button>
            </div>

            <div
              className="bg-card border border-border rounded-xl shadow-soft p-8 hover:shadow-medium transition-shadow cursor-pointer"
              onClick={() => router.push("/conferences")}
            >
              <div className="text-5xl mb-4">🗺️</div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                会場・場所管理
              </h2>
              <p className="text-muted-foreground mb-6">
                会場のマップと場所を管理します。各プレゼンテーションに場所を割り当てることができます。
              </p>
              <Button variant="outline" onClick={(e) => {e.stopPropagation(); router.push("/conferences");}}>
                学会から選択
              </Button>
            </div>
          </div>

          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">機能概要</h3>
              <ul className="text-sm text-left space-y-2 text-foreground">
                <li>✓ 学会の登録・編集・削除</li>
                <li>✓ 会場と場所の管理（QRコード対応）</li>
                <li>✓ プレゼンテーション情報の登録・編集</li>
                <li>✓ PDFアップロードと自動抄録抽出</li>
                <li>✓ AI要約とタグ生成（実装中）</li>
                <li>✓ 会場マップからの場所選択</li>
                <li>✓ タグによる分類管理</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
