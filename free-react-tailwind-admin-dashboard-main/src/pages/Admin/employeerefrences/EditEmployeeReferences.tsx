import React, { useEffect, useState } from "react";
import {
  getEmployeeReferenceDetails,
  reviewEmployeeReference, // ✅ use admin API
} from "./api"; // <-- import from Admin API file
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";
import { toast } from "react-toastify";

interface AdminEditEmployeeReferenceProps {
  referenceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

interface AdminReferenceEditData {
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  resume?: string;
  status: "Pending" | "Approved" | "Rejected";
  admin_comment: string;
}

const AdminEditEmployeeReference: React.FC<AdminEditEmployeeReferenceProps> = ({
  referenceId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [formData, setFormData] = useState<AdminReferenceEditData>({
    name: "",
    designation: "",
    contact_number: "",
    email: "",
    resume: "",
    status: "Pending",
    admin_comment: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ Fetch reference details when modal opens
  useEffect(() => {
    if (referenceId && isOpen) {
      setLoading(true);
      getEmployeeReferenceDetails(referenceId)
        .then((data) => {
          setFormData({
            name: data.name,
            designation: data.designation,
            contact_number: data.contact_number,
            email: data.email,
            resume: data.resume || "",
            status: data.status,
            admin_comment: data.admin_comment || "",
          });
        })
        .catch(() => toast.error("Failed to load reference details"))
        .finally(() => setLoading(false));
    }
  }, [referenceId, isOpen]);

  // ✅ Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceId) return;

    setSaving(true);
    try {
      await reviewEmployeeReference(referenceId, {
        status: formData.status,
        admin_comment: formData.admin_comment,
      });
      toast.success("Reference review updated successfully!");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error("Failed to update review");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
          Review Employee Reference
        </h2>

        {loading ? (
          <div>Loading reference...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Read-only employee info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name} disabled readOnly />
              </div>
              <div>
                <Label>Designation</Label>
                <Input value={formData.designation} disabled readOnly />
              </div>
              <div>
                <Label>Contact</Label>
                <Input value={formData.contact_number} disabled readOnly />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={formData.email} disabled readOnly />
              </div>
            </div>

            {formData.resume && (
              <div>
                <Label>Resume</Label>
                <a
                  href={formData.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 underline"
                >
                  View CV
                </a>
              </div>
            )}

            {/* Admin-only fields */}
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border rounded-md p-2 dark:bg-gray-700 dark:text-white"
                disabled={saving}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <Label htmlFor="admin_comment">Admin Comment</Label>
              <textarea
                id="admin_comment"
                name="admin_comment"
                value={formData.admin_comment}
                onChange={handleChange}
                rows={3}
                className="w-full border rounded-md p-2 dark:bg-gray-700 dark:text-white"
                placeholder="Add any remarks or feedback..."
                disabled={saving}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Review"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminEditEmployeeReference;
