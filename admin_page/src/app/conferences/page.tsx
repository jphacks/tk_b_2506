"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

interface Conference {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  is_active: boolean;
  join_password: string;
}

export default function ConferencesPage() {
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadConferences();
  }, [showInactive]);

  const loadConferences = async () => {
    setLoading(true);
    try {
      const data = await db.getConferences(showInactive);
      setConferences(data);
    } catch (err) {
      console.error("Failed to load conferences:", err);
      setError("学会の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">学会管理</h1>
            <p className="text-sm text-muted-foreground mt-2">
              学会情報と会場を管理します
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? "有効な学会のみ" : "すべて表示"}
            </Button>
            <Button onClick={() => router.push("/conferences/new")}>
              新規学会を追加
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-error/10 text-error border border-error/30 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : conferences.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl shadow-soft">
            <p className="text-muted-foreground mb-4">
              学会が登録されていません
            </p>
            <Button onClick={() => router.push("/conferences/new")}>
              最初の学会を追加
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {conferences.map((conference) => (
              <div
                key={conference.id}
                className="bg-card border border-border rounded-xl shadow-soft p-6 hover:shadow-medium transition-shadow cursor-pointer"
                onClick={() => router.push(`/conferences/${conference.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">
                        {conference.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          conference.is_active
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {conference.is_active ? "有効" : "無効"}
                      </span>
                      {conference.join_password && (
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-warning/10 text-warning">
                          パスワード保護
                        </span>
                      )}
                    </div>

                    {conference.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {conference.description}
                      </p>
                    )}

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        期間: {formatDate(conference.start_date)} 〜{" "}
                        {formatDate(conference.end_date)}
                      </p>
                      {conference.location && (
                        <p>場所: {conference.location}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/conferences/${conference.id}`);
                      }}
                    >
                      詳細
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
