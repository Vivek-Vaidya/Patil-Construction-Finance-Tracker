import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and make unique
    const ext = path.extname(file.name) || ".jpg";
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFileName = `${Date.now()}_${baseName}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      fileUrl: `/uploads/${uniqueFileName}`,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

