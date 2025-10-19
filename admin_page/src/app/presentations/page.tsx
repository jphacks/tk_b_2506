"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

interface Presentation {
  id: string;
  title: string;
  presentation_type: "oral" | "poster";
  presenter_name: string;
  scheduled_at: string;
  location: {
    id: string;
    name: string;
  } | null;
}

interface Conference {
  id: string;
  name: string;
}

export default function PresentationsPage() {
  const router = useRouter();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadConferences();
  }, []);

  useEffect(() => {
    if (selectedConference) {
      loadPresentations(selectedConference);
    }
  }, [selectedConference]);

  const loadConferences = async () => {
    try {
      const data = await db.getConferences(true);
      setConferences(data);
      if (data.length > 0) {
        setSelectedConference(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load conferences:", err);
      setError("学会の読み込みに失敗しました");
    }
  };

  const loadPresentations = async (conferenceId: string) => {
    setLoading(true);
    try {
      const data = await db.getPresentations(conferenceId);
      setPresentations(data as any);
    } catch (err) {
      console.error("Failed to load presentations:", err);
      setError("プレゼンテーションの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">プレゼンテーション管理</h1>
            <p className="text-sm text-muted-foreground mt-2">
              登録されているプレゼンテーションを管理します
            </p>
          </div>
          <Button onClick={() => router.push("/presentations/new")}>
            新規登録
          </Button>
        </div>

        {error && (
          <div className="mb-6 bg-error/10 text-error border border-error/30 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="mb-6">
          <Select
            label="学会を選択"
            options={conferences.map((c) => ({ value: c.id, label: c.name }))}
            value={selectedConference}
            onChange={(e) => setSelectedConference(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : presentations.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl shadow-soft">
            <p className="text-muted-foreground mb-4">
              プレゼンテーションが登録されていません
            </p>
            <Button onClick={() => router.push("/presentations/new")}>
              最初のプレゼンテーションを登録
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {presentations.map((presentation) => (
              <div
                key={presentation.id}
                className="bg-card border border-border rounded-xl shadow-soft p-6 hover:shadow-medium transition-shadow cursor-pointer"
                onClick={() => router.push(`/presentations/${presentation.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {presentation.title}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          presentation.presentation_type === "oral"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        {presentation.presentation_type === "oral" ? "口頭" : "ポスター"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {presentation.presenter_name && (
                        <p>発表者: {presentation.presenter_name}</p>
                      )}
                      {presentation.location && (
                        <p>場所: {presentation.location.name}</p>
                      )}
                      {presentation.scheduled_at && (
                        <p>
                          日時:{" "}
                          {new Date(presentation.scheduled_at).toLocaleString("ja-JP")}
                        </p>
                      )}
                    </div>
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
