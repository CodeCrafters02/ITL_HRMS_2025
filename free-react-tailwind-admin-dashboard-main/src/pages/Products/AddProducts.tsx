import React, { useState, useEffect } from "react";
import { createProduct, getServiceList, ServiceData } from "./api";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Select from "../../components/form/Select";
import Checkbox from "../../components/form/input/Checkbox";
import Label from "../../components/form/Label";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

interface ProductCreateData {
  name: string;
  description?: string;
  service?: number;
  client?: string;
  images?: File[];
  is_active: boolean;
}

const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductCreateData>({
    name: "",
    description: "",
    client: "",
    service: undefined,
    images: [],
    is_active: true,
  });

  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Setup dropzone for images
  const onDrop = (acceptedFiles: File[]) => {
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), ...acceptedFiles],
    }));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/jpg": [],
      "image/webp": [],
    },
    multiple: true,
  });

useEffect(() => {
  if (!formData.images || formData.images.length === 0) {
    setPreviewUrls([]);
    return;
  }
  const urls = formData.images.map(file => URL.createObjectURL(file));
  setPreviewUrls(urls);

  console.log("Preview URLs set:", urls);

  return () => {
    urls.forEach(url => URL.revokeObjectURL(url));
  };
}, [formData.images]);


  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServiceList();
        setServices(data.filter((service) => service.is_active));
      } catch (error) {
        console.error("Failed to fetch services", error);
      }
    };
    fetchServices();
  }, []);

  // Handle generic inputs (name, description, service, is_active)
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "service"
          ? value
            ? parseInt(value, 10)
            : undefined
          : type === "checkbox"
          ? checked
          : value,
    }));
  };

  // Handle TextArea changes
  const handleTextAreaChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle Select changes
  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      service: value ? parseInt(value, 10) : undefined,
    }));
  };

  // Handle Checkbox changes
  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_active: checked,
    }));
  };

  // Remove an image by index
  const removeImage = (index: number) => {
    setFormData((prev) => {
      const newImages = [...(prev.images || [])];
      newImages.splice(index, 1);
      return {
        ...prev,
        images: newImages,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await createProduct(formData);
      toast.success("Product created successfully!");
      navigate("/master/products");
    } catch {
      toast.error("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel - navigate back to products page
  const handleCancel = () => {
    navigate("/master/products");
  };

  // Prepare service options for Select component
  const serviceOptions = services.map(service => ({
    value: service.id.toString(),
    label: service.name
  }));

  return (
    <>
      <PageMeta title="Add Product" description="Add new product to the system" />
      <PageBreadcrumb pageTitle="Add Product" />
      
      <div className="space-y-6">
        <ComponentCard title="Product Information">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Service */}
                <div>
                  <Label>Service *</Label>
                  <Select
                    options={serviceOptions}
                    placeholder="Select a service"
                    onChange={handleSelectChange}
                    defaultValue={formData.service?.toString() || ""}
                    className="dark:bg-gray-900"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label>Description</Label>
                  <TextArea
                    value={formData.description}
                    onChange={(value) => handleTextAreaChange("description", value)}
                    placeholder="Enter product description"
                    rows={4}
                    disabled={loading}
                  />
                </div>

                {/* Client */}
                <div>
                  <Label>Client</Label>
                  <TextArea
                    value={formData.client}
                    onChange={(value) => handleTextAreaChange("client", value)}
                    placeholder="Enter client details"
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.is_active}
                    onChange={handleCheckboxChange}
                    disabled={loading}
                  />
                  <Label className="mb-0 cursor-pointer">
                    Product is active
                  </Label>
                </div>
              </div>

              {/* Right Column - Image Upload */}
              <div className="space-y-6">
                <div>
                  <Label>Product Images</Label>
                  <div className="space-y-4">
                    {/* Dropzone */}
                    <div 
                      {...getRootProps()} 
                      className={`transition border-2 border-dashed cursor-pointer rounded-xl p-8
                        ${isDragActive 
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" 
                          : "border-gray-300 dark:border-gray-600 hover:border-brand-400"
                        }`}
                    >
                      <input {...getInputProps()} disabled={loading} />
                      <div className="text-center">
                        <div className="mx-auto w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                          {isDragActive ? "Drop files here" : "Upload Images"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Drag and drop images here, or click to select files
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG, JPG, JPEG, WEBP up to 10MB each
                        </p>
                      </div>
                    </div>

                    {/* Image Previews */}
                    {previewUrls.length > 0 && (
                      <div>
                        <Label className="mb-3">Selected Images ({previewUrls.length})</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {previewUrls.map((url, idx) => (
                            <div key={idx} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                                <img
                                  src={url}
                                  alt={`Preview ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                disabled={loading}
                                title="Remove image"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-600">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel} 
                disabled={loading}
                className="px-8"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.name.trim()}
                className="px-8"
              >
                {loading ? "Creating..." : "Create Product"}
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
};

export default AddProduct;
