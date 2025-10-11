import React, { useEffect, useState } from "react";
import { getEmployeeReferenceById, updateEmployeeReference } from "./api";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";
import { toast } from "react-toastify";

interface EditEmployeeReferenceProps {
  referenceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

interface EmployeeReferenceEditData {
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  resume?: File | null;
  existing_resume?: string; // for preview if already uploaded
}

const EditEmployeeReference: React.FC<EditEmployeeReferenceProps> = ({
  referenceId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [formData, setFormData] = useState<EmployeeReferenceEditData>({
    name: "",
    designation: "",
    contact_number: "",
    email: "",
    resume: null,
    existing_resume: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch reference data when modal opens
  useEffect(() => {
    if (referenceId && isOpen) {
      setLoading(true);
      getEmployeeReferenceById(referenceId)
        .then((data) => {
          setFormData({
            name: data.name,
            designation: data.designation,
            contact_number: data.contact_number,
            email: data.email,
            existing_resume: data.resume || "",
          });
        })
        .catch(() => toast.error("Failed to load reference details"))
        .finally(() => setLoading(false));
    }
  }, [referenceId, isOpen]);

  // Handle change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, resume: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle submit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);

  try {
    await updateEmployeeReference(referenceId!, {
      name: formData.name,
      designation: formData.designation,
      contact_number: formData.contact_number,
      email: formData.email,
      resume: formData.resume,
    });
    toast.success("Reference updated successfully!");
    onUpdated();
    onClose();
  } catch {
    toast.error("Failed to update reference");
  } finally {
    setSaving(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
          Edit Reference
        </h2>

        {loading ? (
          <div>Loading reference...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            <div>
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            {formData.existing_resume && (
              <div>
                <Label>Existing CV</Label>
                <a
                  href={formData.existing_resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 underline"
                >
                  View Current CV
                </a>
              </div>
            )}

            <div>
              <Label htmlFor="resume">Replace CV</Label>
              <Input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditEmployeeReference;
