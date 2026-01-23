"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

type Resume = {
  id: string;
  fileUrl: string;
  parsedText: string;
  createdAt: string;
  chunks: { id: string }[];
};

export default function ResumePage() {
  const { data: session, status } = useSession();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchResumes();
    }
  }, [status]);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/resume");
      if (response.ok) {
        const data = await response.json();
        setResumes(data);
      } else {
        setError("Failed to load resumes");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Resume uploaded successfully! Parsed ${data.resume.parsedLength} characters into ${data.resume.chunks} chunks.`);
        fetchResumes(); // Refresh the list
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      setError("Network error during upload");
    } finally {
      setUploading(false);
      // Clear the file input
      event.target.value = "";
    }
  };

  const handleDownload = async (resumeId: string, filename: string) => {
    try {
      const response = await fetch(`/api/resume/download?id=${resumeId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await response.json();
        setError(error.error || "Download failed");
      }
    } catch (err) {
      setError("Network error during download");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Please sign in</h1>
          <Link
            href="/auth/signin"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">Resume Management</h1>
              <p className="text-zinc-600">Upload and manage your resumes for parsing</p>
            </div>
            <Link
              href="/candidate/dashboard"
              className="rounded-md border border-zinc-300 px-4 py-2 text-zinc-700 hover:bg-zinc-50"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        {/* Upload Section */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Upload New Resume</h2>
          <p className="mb-4 text-zinc-600">
            Upload your resume (PDF or DOCX). It will be automatically parsed and prepared for recruiter Q&A.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Choose file (max 10MB)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-2 text-sm text-zinc-500">
              Supported formats: PDF, DOC, DOCX
            </p>
          </div>

          {uploading && (
            <div className="mb-4 rounded-md bg-blue-50 p-4">
              <p className="text-blue-800">Uploading and parsing resume...</p>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Resume List */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Your Resumes</h2>
          
          {resumes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-600">No resumes uploaded yet.</p>
              <p className="text-sm text-zinc-500 mt-2">Upload your first resume above.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-zinc-200">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      File Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Parsed Text
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Chunks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {resumes.map((resume) => {
                    const extension = resume.fileUrl.split(".").pop()?.toUpperCase() || "Unknown";
                    const filename = resume.fileUrl.split("/").pop() || "resume";
                    
                    return (
                      <tr key={resume.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900">
                          {new Date(resume.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {extension}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-900">
                          <div className="max-w-xs truncate">
                            {resume.parsedText.substring(0, 100)}...
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900">
                          {resume.chunks.length}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900">
                          <button
                            onClick={() => handleDownload(resume.id, filename)}
                            className="mr-2 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this resume?")) {
                                // TODO: Implement delete functionality
                                alert("Delete functionality coming soon");
                              }
                            }}
                            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="mt-6 rounded-lg border border-zinc-200 bg-blue-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-blue-900">How Resume Parsing Works</h3>
          <ul className="list-disc space-y-2 pl-5 text-blue-800">
            <li>Your resume is securely stored and parsed into searchable text</li>
            <li>The text is split into chunks for our Q&A system</li>
            <li>Recruiters can ask questions about your experience and get instant answers</li>
            <li>Only information from your resume and profile is used - no hallucinations</li>
            <li>You can upload multiple versions of your resume</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
