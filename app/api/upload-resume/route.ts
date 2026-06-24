import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ verbosity: 0, data: buffer });
    const data = await parser.getText();
    await parser.destroy();
    const text = data.text?.trim() || "";

    if (!text) {
      return NextResponse.json({ error: "Could not extract text from PDF. Please ensure it is not a scanned/image-only PDF." }, { status: 422 });
    }

    // Limit to 3000 chars to avoid token overflow in Gemini
    const truncated = text.length > 3000 ? text.substring(0, 3000) + "..." : text;

    return NextResponse.json({ text: truncated, fileName: file.name, pages: data.total });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ error: "Failed to parse PDF file" }, { status: 500 });
  }
}
