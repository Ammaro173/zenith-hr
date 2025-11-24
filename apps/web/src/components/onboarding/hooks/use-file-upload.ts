"use client";

import { useCallback, useState } from "react";

type UploadResponse = {
  fileName: string;
  fileUrl: string;
  key: string;
};

type UploadState = {
  files: File[];
  isUploading: boolean;
};

export function useOnboardingFileUpload() {
  const [state, setState] = useState<UploadState>({
    files: [],
    isUploading: false,
  });
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(undefined);

  const setFiles = useCallback((files: File[]) => {
    setState((prev) => ({ ...prev, files }));
  }, []);

  const upload = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isUploading: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      if (!response.ok) {
        let message = "Failed to upload file";

        try {
          const errorBody = (await response.json()) as { message?: string };
          if (errorBody?.message) {
            message = errorBody.message;
          }
        } catch {
          // ignore JSON parse errors
        }

        throw new Error(message);
      }

      const data = (await response.json()) as UploadResponse;
      setUploadedUrl(data.fileUrl);
      return data;
    } finally {
      setState((prev) => ({ ...prev, isUploading: false }));
    }
  }, []);

  return {
    files: state.files,
    isUploading: state.isUploading,
    uploadedUrl,
    setFiles,
    upload,
    setUploadedUrl,
  };
}
