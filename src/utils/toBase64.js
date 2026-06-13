/**
 * Convert a File/Blob into base64.
 * By default this returns a full data URL (data:<mime>;base64,<payload>).
 */
export function toBase64(file, options = {}) {
  const { includeDataUrl = true } = options;

  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new TypeError("toBase64 expects a File or Blob input."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read file as base64."));
    };

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(
          new Error("Unexpected FileReader result while encoding base64."),
        );
        return;
      }

      if (includeDataUrl) {
        resolve(result);
        return;
      }

      const base64Payload = result.includes(",")
        ? result.split(",")[1]
        : result;
      resolve(base64Payload);
    };

    reader.readAsDataURL(file);
  });
}

export default toBase64;
