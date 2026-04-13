import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";

/**
 * POST /api/upload
 *
 * Used by @vercel/blob/client's `upload()` function for client-side uploads.
 * The client library calls this route twice:
 *   1. To generate a signed upload token (action: "generateClientTokenFromReadWriteToken")
 *   2. To notify on upload completion (action: "multipartUploadCompleted" / "mput")
 *
 * Requires: authenticated user with an orgId (all roles except SUPER_ADMIN).
 */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    await requireOrgAuth();
  } 
  catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
      }),
      onUploadCompleted: async () => {
        // No-op: the client stores the URL in the form field after upload
      },
    });

    return NextResponse.json(jsonResponse);
  } 
  catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
