interface Notification {
  id: number;
  title: string;
  description: string;
  date: string;
}
import React, { useEffect, useState } from "react";
import { TrashIcon } from '@heroicons/react/24/outline';
import { axiosInstance } from "../../pages/Dashboard/api";
import { toast } from "react-toastify";
// Built-in Modal component
function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 relative pointer-events-auto animate-fade-in border border-gray-200">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 focus:outline-none"
          aria-label="Close"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "" });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>("");

  // Delete notification
  const handleDeleteClick = (id: number, title: string) => {
    setDeleteId(id);
    setDeleteTitle(title);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`/notifications/${deleteId}/`);
      setNotifications(prev => prev.filter(n => n.id !== deleteId));
      setDeleteId(null);
      setDeleteTitle("");
      toast.success("Deleted successfully", { position: "bottom-right" });
    } catch {
      toast.error("Failed to delete notification", { position: "bottom-right" });
    }
  };

  // Fetch notifications
  useEffect(() => {
    setLoading(true);
    axiosInstance.get("/notifications/")
      .then((res: { data: Notification[] }) => setNotifications(res.data))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  // Handle form change
  const handleInputChange = (value: string, name: string) => {
    setForm({ ...form, [name]: value });
  };

  // Add notification
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    axiosInstance.post("/notifications/", form)
      .then((res: { data: Notification }) => {
        setNotifications(prev => [res.data, ...prev]);
        setShowModal(false);
        setForm({ title: "", description: "", date: "" });
      });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          className="px-4 py-2 bg-brand-500 text-white rounded-lg"
          onClick={() => setShowModal(true)}
        >
          Add Notification
        </button>
      </div>

      {/* Notification List */}
      <div className={`bg-white rounded-lg shadow p-6 transition-all duration-300${showModal ? ' blur-sm pointer-events-none' : ''}`}> 
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/3 rounded bg-gray-200"></div>
                    <div className="h-4 w-full rounded bg-gray-200"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V7a9.966 9.966 0 0110-10z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No notifications yet</h3>
            <p className="mt-2 text-gray-500">When you receive notifications, they'll appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md relative"
              >
                {/* Centered delete icon, only visible on hover */}
                <button
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 z-10"
                  title="Delete Notification"
                  onClick={() => handleDeleteClick(notification.id, notification.title)}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                <div className="flex items-start space-x-4">
                  {/* Notification Icon */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {/* Notification Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{notification.title}</h3>
                        <p className="mt-1 text-sm text-gray-600 leading-relaxed">{notification.description}</p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          {new Date(notification.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <Modal isOpen={true} onClose={() => { setDeleteId(null); setDeleteTitle(""); }}>
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center mb-4">Confirm Delete</h2>
            <p className="mb-6 text-gray-700">Are you sure you want to delete the notification <span className="font-semibold">{deleteTitle}</span>?</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => { setDeleteId(null); setDeleteTitle(""); }} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
                Cancel
              </Button>
              <Button type="button" onClick={confirmDelete} className="bg-brand-500 text-white hover:bg-brand-600">
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Notification Modal */}
      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd} className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-4">Add Notification</h2>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={e => handleInputChange(e.target.value, "title")}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <TextArea
                value={form.description}
                onChange={value => handleInputChange(value, "description")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                name="date"
                value={form.date}
                onChange={e => handleInputChange(e.target.value, "date")}
                required
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => setShowModal(false)} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
                Cancel
              </Button>
              <Button type="submit" className="bg-brand-500 text-white hover:bg-brand-600">
                Add
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}