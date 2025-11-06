"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function NewConferencePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    is_active: true,
    join_password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!formData.name || !formData.start_date || !formData.end_date) {
        setError("必須項目を入力してください");
        return;
      }

      // Validate dates
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        setError("終了日は開始日以降である必要があります");
        return;
      }

      // Create conference
      const conference = await db.createConference({
        name: formData.name,
        description: formData.description || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        location: formData.location || undefined,
        is_active: formData.is_active,
        join_password: formData.join_password || undefined,
      });

      // Redirect to conference detail page
      router.push(`/conferences/${conference.id}`);
    } catch (err) {
      console.error("Failed to create conference:", err);
      setError("学会の登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">新規学会登録</h1>
          <p className="text-sm text-muted-foreground mt-2">
            新しい学会を登録します
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-error/10 text-error border border-error/30 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">基本情報</h2>

            <Input
              label="学会名"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: 第10回情報処理学会"
            />

            <Textarea
              label="説明"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="学会の概要を入力してください"
              rows={4}
            />

            <Input
              label="会場"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="例: 東京国際フォーラム"
            />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">開催期間</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="開始日"
                type="date"
                required
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />

              <Input
                label="終了日"
                type="date"
                required
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">設定</h2>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <label
                htmlFor="is_active"
                className="text-sm font-medium text-foreground"
              >
                有効な学会として表示する
              </label>
            </div>

            <Input
              label="参加パスワード"
              type="password"
              value={formData.join_password}
              onChange={(e) =>
                setFormData({ ...formData, join_password: e.target.value })
              }
              placeholder="パスワードを設定しない場合は空欄"
              description="参加者が学会に参加する際に必要なパスワードです。設定しない場合は誰でも参加できます。"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="success"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button type="submit" loading={loading}>
              登録
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
