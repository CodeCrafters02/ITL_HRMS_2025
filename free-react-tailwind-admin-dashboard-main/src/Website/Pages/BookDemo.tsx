import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { getServiceList, postDemoRequest, ServiceData } from "./api";

interface FormData {
  name: string;
  email: string;
  contact: string;
  service: string;
  datetime: string;
  message: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  contact?: string;
  service?: string;
  datetime?: string;
}

export default function BookDemoForm() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    contact: "",
    service: "",
    datetime: "",
    message: "",
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const servicesData = await getServiceList();
        setServices(servicesData);
      } catch (error) {
        console.error("Failed to fetch services", error);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[name as keyof ValidationErrors];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Invalid email format";

    if (!formData.contact.trim()) errors.contact = "Contact number is required";

    if (!formData.service) errors.service = "Please select a service";

    if (!formData.datetime) errors.datetime = "Preferred date & time is required";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await postDemoRequest({
        name: formData.name,
        email: formData.email,
        contact_number: formData.contact,
        service_id: Number(formData.service),
        preferred_datetime: formData.datetime,
        message: formData.message || null,
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit demo request", error);
      // Optionally add toast error here
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-20 rounded-2xl shadow-lg bg-white text-center">
        <h2 className="text-2xl font-semibold mb-2">Thank you for booking a demo!</h2>
        <p>We will get in touch with you shortly.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 rounded-2xl shadow-lg bg-white mt-15">
      <h2 className="text-xl font-semibold mb-6 uppercase tracking-wide text-gray-800 text-center">
        Book a Demo
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Name <span className="text-red-500">*</span></Label>
          <Input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            className={validationErrors.name ? "border-red-500" : ""}
          />
          {validationErrors.name && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
          )}
        </div>

        <div>
          <Label>Email <span className="text-red-500">*</span></Label>
          <Input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="example@mail.com"
            className={validationErrors.email ? "border-red-500" : ""}
          />
          {validationErrors.email && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
          )}
        </div>

        <div>
          <Label>Contact Number <span className="text-red-500">*</span></Label>
          <Input
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="+1 234 567 890"
            className={validationErrors.contact ? "border-red-500" : ""}
          />
          {validationErrors.contact && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.contact}</p>
          )}
        </div>

        <div>
          <Label>Service Interested In <span className="text-red-500">*</span></Label>
          <select
            name="service"
            value={formData.service}
            onChange={handleChange}
            disabled={loadingServices}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              validationErrors.service ? "border-red-500" : ""
            }`}
          >
            <option value="">Select a service</option>
            {services
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          {validationErrors.service && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.service}</p>
          )}
        </div>

        <div>
          <Label>Preferred Date & Time <span className="text-red-500">*</span></Label>
          <Input
            name="datetime"
            type="datetime-local"
            value={formData.datetime}
            onChange={handleChange}
            className={validationErrors.datetime ? "border-red-500" : ""}
          />
          {validationErrors.datetime && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.datetime}</p>
          )}
        </div>

        <div>
          <Label>Message (Optional)</Label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Additional details or questions"
            rows={4}
            className="w-full p-3 border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-800 text-white rounded-3xl py-3 font-semibold uppercase tracking-wider shadow-md transition"
        >
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </div>
  );
}
