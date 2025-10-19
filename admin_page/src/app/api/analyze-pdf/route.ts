import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

export const runtime = "nodejs";

// OpenAI APIキーの確認
const OPENAI_API_KEY = process.env.NEXT_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in environment variables");
}

/**
 * PDF分析APIエンドポイント
 * LangChainとOpenAI APIを使用してPDFから抄録の抽出、要約の生成、タグの提案を行います
 */
export async function POST(request: NextRequest) {
  try {
    // OpenAI APIキーのチェック
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json(
        {
          error: "OpenAI APIキーが設定されていません。.envファイルにOPENAI_API_KEYを設定してください。",
          abstract: "",
          summary: "",
          suggestedTags: []
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "PDFファイルが提供されていません" },
        { status: 400 }
      );
    }

    // ファイルタイプの検証
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "PDFファイルのみアップロード可能です" },
        { status: 400 }
      );
    }

    // PDFをバッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractedText = await extractPdfText(buffer);

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        {
          error: "PDFからテキストを抽出できませんでした。画像のみのPDFの可能性があります。",
          abstract: "",
          summary: "",
          suggestedTags: []
        },
        { status: 400 }
      );
    }

    // LangChainでOpenAI APIを使用
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.3,
      openAIApiKey: OPENAI_API_KEY,
    });

    // 要約生成用のプロンプトテンプレート
    const summaryPrompt = PromptTemplate.fromTemplate(
      `以下は学術論文または研究発表の抄録です。この内容を200文字程度の日本語で簡潔に要約してください。
研究の目的、方法、結果、結論を含めてください。

抄録:
{text}

要約:`
    );

    // タグ生成用のプロンプトテンプレート
    const tagsPrompt = PromptTemplate.fromTemplate(
      `以下は学術論文または研究発表の抄録です。この内容に関連するキーワードを5個程度抽出してください。
キーワードはカンマ区切りで日本語で出力してください。

抄録:
{text}

キーワード（カンマ区切り）:`
    );

    // テキストが長すぎる場合は最初の3000文字に制限
    const textForAnalysis = extractedText.substring(0, 3000);

    // 要約を生成
    const summaryChain = summaryPrompt.pipe(model);
    const summaryResult = await summaryChain.invoke({ text: textForAnalysis });
    const summary = summaryResult.content.toString();

    // タグを生成
    const tagsChain = tagsPrompt.pipe(model);
    const tagsResult = await tagsChain.invoke({ text: textForAnalysis });
    const tagsText = tagsResult.content.toString();

    // タグをパース（カンマ区切りを配列に変換）
    const suggestedTagNames = tagsText
      .split(/[、,]/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 5); // 最大5個

    // レスポンスを返す
    const response = {
      abstract: extractedText.substring(0, 2000), // 抄録として最初の2000文字を返す
      summary: summary,
      suggestedTagNames: suggestedTagNames, // タグ名の配列
      confidence: 0.85,
      extractedTextLength: extractedText.length,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("PDF analysis error:", error);
    return NextResponse.json(
      {
        error: `PDFの解析中にエラーが発生しました: ${error.message}`,
        abstract: "",
        summary: "",
        suggestedTags: []
      },
      { status: 500 }
    );
  }
}

async function extractPdfText(buffer: Buffer) {
  const pdfParse = await import("pdf-parse");
  const { PDFParse } = pdfParse;

  if (!PDFParse) {
    throw new Error("PDFParse loader failed to initialize");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const textResult = await parser.getText();
    return textResult.text ?? "";
  } finally {
    await parser.destroy();
  }
}
