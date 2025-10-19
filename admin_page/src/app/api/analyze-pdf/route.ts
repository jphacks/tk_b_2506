// src/app/api/analyze-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ===== Dify API =====
// 例: DIFY_API_URL=https://api.dify.ai/v1
const DIFY_API_URL = process.env.DIFY_API_URL;
const DIFY_UPLOAD_KEY = process.env.DIFY_API_KEY;       // /files/upload 用（Universal API Key）
const DIFY_WORKFLOW_KEY =
  process.env.DIFY_WORKFLOW_KEY || process.env.DIFY_API_KEY; // /workflows/run 用（App API Key 推奨）

if (!DIFY_API_URL || !DIFY_UPLOAD_KEY) {
  console.error("DIFY_API_URL or DIFY_API_KEY is not set in environment variables");
}

// Difyの file 入力オブジェクト
function makeDifyFileInput(uploadFileId: string) {
  return {
    transfer_method: "local_file",
    upload_file_id: uploadFileId,
    type: "document", // PDFはdocumentタイプ
  };
}

export async function POST(request: NextRequest) {
  try {
    // ---- 0) 設定確認 ----
    if (!DIFY_API_URL || !DIFY_UPLOAD_KEY) {
      return NextResponse.json(
        {
          error:
            "DIFY API設定が不足しています。.envに DIFY_API_URL と DIFY_API_KEY を設定してください。",
          abstract: "",
          summary: "",
          suggestedTagNames: [],
        },
        { status: 400 }
      );
    }

    // ---- 1) クライアントのmultipart/form-dataからファイル取得 ----
    const form = await request.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "PDFファイルが提供されていません" }, { status: 400 });
    }

    // ---- 2) PDFチェック（MIME/拡張子）----
    const filename = (file as any)?.name ?? "uploaded.pdf";
    const isPdfByMime = file.type === "application/pdf";
    const isPdfByName = /\.pdf$/i.test(filename);
    if (!isPdfByMime && !isPdfByName) {
      return NextResponse.json({ error: "PDFファイルのみアップロード可能です" }, { status: 400 });
    }

    // ---- 3) Difyへアップロード（Content-Typeは自動付与に任せる）----
    const uploadForm = new FormData();
    uploadForm.append("file", file, filename);
    uploadForm.append("user", "admin-user"); // 任意

    const uploadRes = await fetch(`${DIFY_API_URL}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_UPLOAD_KEY}`,
        // Content-Type は指定しない（boundary 自動付与）
      },
      body: uploadForm,
    });

    // レスポンステキストを一度だけ読む
    const uploadText = await uploadRes.text();
    if (uploadRes.status !== 201) {
      // ここで throw したら body は既に読了しているのでOK
      throw new Error(`DIFY file upload error: ${uploadRes.status} - ${uploadText}`);
    }

    // OK時はテキストをJSON.parse
    let uploadJson: any;
    try {
      uploadJson = JSON.parse(uploadText);
    } catch {
      throw new Error(`Invalid JSON from Dify upload: ${uploadText}`);
    }

    const fileId: string | undefined = uploadJson?.id;
    if (!fileId) {
      throw new Error("Failed to get file ID from Dify upload response");
    }

    // ---- 4) Workflow 実行（input_file は単一 file 型）----
    const payload = {
      inputs: {
        input_file: makeDifyFileInput(fileId), // ← 単一オブジェクト
      },
      response_mode: "blocking",
      user: "admin-user",
    };

    const wfRes = await fetch(`${DIFY_API_URL}/workflows/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_WORKFLOW_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // ここも body は一度だけ読む
    const wfText = await wfRes.text();

    if (!wfRes.ok) {
      // デバッグ用ログ（bodyはすでに文字列で保持）
      console.error("Dify workflow error body:", wfText);
      console.error("Dify workflow payload:", JSON.stringify(payload, null, 2));
      throw new Error(`DIFY API error: ${wfRes.status} - ${wfText}`);
    }

    let wfJson: any;
    try {
      wfJson = JSON.parse(wfText);
    } catch {
      throw new Error(`Invalid JSON from Dify workflow: ${wfText}`);
    }

    // ---- 5) 出力整形 ----
    const outputs = wfJson?.data?.outputs ?? {};
    const summary: string = outputs?.ai_summary ?? "";
    const tagsRaw = outputs?.tags ?? [];

    const suggestedTagNames: string[] = Array.isArray(tagsRaw)
      ? tagsRaw.map((t: unknown) => String(t).trim()).filter(Boolean)
      : typeof tagsRaw === "string"
      ? tagsRaw.split(/[、,]/).map((t) => t.trim()).filter(Boolean)
      : [];

    return NextResponse.json({
      abstract: "",
      summary,
      suggestedTagNames,
      confidence: 0.85,
      difyFileId: fileId,
      workflowRunId: wfJson?.workflow_run_id ?? null,
    });
  } catch (err: any) {
    console.error("PDF analysis error:", err);
    return NextResponse.json(
      {
        error: `PDFの解析中にエラーが発生しました: ${err?.message ?? "Unknown error"}`,
        abstract: "",
        summary: "",
        suggestedTagNames: [],
      },
      { status: 500 }
    );
  }
}
