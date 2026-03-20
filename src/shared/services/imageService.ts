import { put, del } from "@vercel/blob";

/**
 * Image storage abstraction layer.
 * Currently uses Vercel Blob. To migrate to Cloudinary,
 * replace the implementation in this file — no other changes needed.
 */
export const imageService = {
  /**
   * Upload an image file and return its public URL.
   */
  async upload(file: File, folder = "products"): Promise<string> {
    const filename = `${folder}/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: "public",
    });
    return blob.url;
  },

  /**
   * Delete an image by its URL.
   */
  async delete(url: string): Promise<void> {
    try {
      await del(url);
    } catch {
      // Silently fail if image doesn't exist
      console.warn(`Failed to delete image: ${url}`);
    }
  },
};
