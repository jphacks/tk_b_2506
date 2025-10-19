"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import LocationMap from "@/components/LocationMap";

interface Conference {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

export default function NewPresentationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    conference_id: "",
    title: "",
    abstract: "",
    presentation_type: "oral" as "oral" | "poster",
    location_id: "",
    presenter_name: "",
    presenter_affiliation: "",
    scheduled_at: "",
  });

  // Data from Supabase
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // PDF file
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);

  // AI-generated content
  const [aiSummary, setAiSummary] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load locations when conference changes
  useEffect(() => {
    if (formData.conference_id) {
      loadLocations(formData.conference_id);
    }
  }, [formData.conference_id]);

  const loadInitialData = async () => {
    try {
      const [conferencesData, tagsData] = await Promise.all([
        db.getConferences(true),
        db.getTags(),
      ]);
      setConferences(conferencesData);
      setTags(tagsData);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("データの読み込みに失敗しました");
    }
  };

  const loadLocations = async (conferenceId: string) => {
    try {
      const locationsData = await db.getLocations(conferenceId);
      setLocations(locationsData);
    } catch (err) {
      console.error("Failed to load locations:", err);
    }
  };

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    setPdfUploading(true);
    setError("");

    try {
      // Upload PDF to Supabase Storage
      const timestamp = new Date().getTime();
      const filePath = `presentations/${timestamp}_${file.name}`;
      const { publicUrl } = await db.uploadFile("pdfs", filePath, file);

      // Call AI API to analyze PDF
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("PDF解析に失敗しました");
      }

      const analysis = await response.json();

      // Update form with extracted data
      setFormData((prev) => ({
        ...prev,
        pdf_url: publicUrl,
        abstract: prev.abstract || analysis.abstract,
      }));
      setAiSummary(analysis.summary);
      setSuggestedTags(analysis.suggestedTags || []);
    } catch (err) {
      console.error("PDF upload failed:", err);
      setError("PDFのアップロードまたは解析に失敗しました");
    } finally {
      setPdfUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!formData.conference_id || !formData.title || !formData.presentation_type) {
        setError("必須項目を入力してください");
        return;
      }

      // Create presentation
      const presentation = await db.createPresentation({
        ...formData,
        ai_summary: aiSummary || undefined,
        location_id: formData.location_id || undefined,
        scheduled_at: formData.scheduled_at || undefined,
      });

      // Add tags if selected
      if (selectedTags.length > 0) {
        await db.addPresentationTags(presentation.id, selectedTags);
      }

      // Redirect to presentations list or detail page
      router.push("/presentations");
    } catch (err) {
      console.error("Failed to create presentation:", err);
      setError("プレゼンテーションの登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">プレゼンテーション登録</h1>
          <p className="text-sm text-muted-foreground mt-2">
            新しいプレゼンテーションを登録します
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

            <Select
              label="学会"
              required
              options={[
                { value: "", label: "学会を選択してください" },
                ...conferences.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={formData.conference_id}
              onChange={(e) =>
                setFormData({ ...formData, conference_id: e.target.value })
              }
            />

            <Input
              label="タイトル"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="発表タイトルを入力"
            />

            <Select
              label="発表形式"
              required
              options={[
                { value: "oral", label: "口頭発表" },
                { value: "poster", label: "ポスター発表" },
              ]}
              value={formData.presentation_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  presentation_type: e.target.value as "oral" | "poster",
                })
              }
            />

            <Input
              label="発表者名"
              value={formData.presenter_name}
              onChange={(e) =>
                setFormData({ ...formData, presenter_name: e.target.value })
              }
              placeholder="発表者名を入力"
            />

            <Input
              label="所属"
              value={formData.presenter_affiliation}
              onChange={(e) =>
                setFormData({ ...formData, presenter_affiliation: e.target.value })
              }
              placeholder="所属機関を入力"
            />

            <Input
              label="発表日時"
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) =>
                setFormData({ ...formData, scheduled_at: e.target.value })
              }
            />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">場所</h2>

            <Select
              label="発表場所"
              options={[
                { value: "", label: "場所を選択してください" },
                ...locations.map((l) => ({ value: l.id, label: l.name })),
              ]}
              value={formData.location_id}
              onChange={(e) =>
                setFormData({ ...formData, location_id: e.target.value })
              }
              description="学会を選択すると、その学会の場所が表示されます"
            />

            {formData.conference_id && (
              <div className="pt-4">
                <LocationMap
                  conferenceId={formData.conference_id}
                  selectedLocationId={formData.location_id}
                  onLocationSelect={(locationId) =>
                    setFormData({ ...formData, location_id: locationId })
                  }
                />
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">抄録とPDF</h2>

            <Textarea
              label="抄録"
              value={formData.abstract}
              onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
              placeholder="抄録を入力、またはPDFをアップロードすると自動的に抽出されます"
              rows={6}
            />

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                PDFアップロード
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfUpload(file);
                }}
                className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {pdfUploading && (
                <p className="text-sm text-muted-foreground mt-2">
                  PDFをアップロード中...
                </p>
              )}
              {pdfFile && !pdfUploading && (
                <p className="text-sm text-success mt-2">
                  ✓ {pdfFile.name} をアップロードしました
                </p>
              )}
            </div>

            {aiSummary && (
              <Textarea
                label="AI要約"
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                placeholder="AI生成された要約"
                rows={4}
                description="PDFから自動生成された要約です。必要に応じて編集できます"
              />
            )}
          </div>

          <div className="bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">タグ</h2>

            <MultiSelect
              label="タグを選択"
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              value={selectedTags}
              onChange={setSelectedTags}
              description="プレゼンテーションに関連するタグを選択してください"
            />

            {suggestedTags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  AI推奨タグ
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    return tag ? (
                      <button
                        key={tagId}
                        type="button"
                        onClick={() => {
                          if (!selectedTags.includes(tagId)) {
                            setSelectedTags([...selectedTags, tagId]);
                          }
                        }}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20"
                      >
                        + {tag.name}
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
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
