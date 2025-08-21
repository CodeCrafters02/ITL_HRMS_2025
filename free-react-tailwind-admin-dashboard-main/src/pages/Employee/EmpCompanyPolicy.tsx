import { useEffect, useState } from "react";
import { axiosInstance } from "../Employee/api";


interface Policy {
  id: number;
  name: string;
  document?: string;
}

interface PolicyWithBlob extends Policy {
  pdfBlobUrl?: string;
  previewImg?: string;
}

export default function EmpCompanyPolicy() {
  const [policies, setPolicies] = useState<PolicyWithBlob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get("/employee-companypolicies/")
      .then(async (res) => {
        const policiesWithBlobs: PolicyWithBlob[] = await Promise.all(
          res.data.map(async (policy: Policy) => {
            if (policy.document && policy.document.toLowerCase().endsWith(".pdf")) {
              try {
                // Fetch PDF as blob
                const response = await axiosInstance.get(policy.document, {
                  responseType: "blob",
                });
                const pdfBlobUrl = URL.createObjectURL(response.data);

                // Generate first-page preview image
                const loadingTask = pdfjs.getDocument(pdfBlobUrl);
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);

                const viewport = page.getViewport({ scale: 0.5 }); // adjust scale for thumbnail
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d")!;
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport }).promise;
                const previewImg = canvas.toDataURL();

                return { ...policy, pdfBlobUrl, previewImg };
              } catch (e) {
                return { ...policy };
              }
            }
            return policy;
          })
        );
        setPolicies(policiesWithBlobs);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.detail || err.message || "Failed to fetch policies"
        );
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Company Policies</h2>
      {loading ? (
        <p>Loading policies...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : policies.length === 0 ? (
        <p>No policies available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="p-4 border rounded shadow bg-white hover:shadow-md transition relative"
            >
              <h3 className="font-bold text-lg mb-2">{policy.name}</h3>
              {policy.document ? (
                <a
                  href={policy.document}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View Document
                </a>
              ) : (
                <span className="text-gray-400 text-xs">No document</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
