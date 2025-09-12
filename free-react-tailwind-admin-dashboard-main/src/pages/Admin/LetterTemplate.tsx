import React, { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import ComponentCard from '../../components/common/ComponentCard';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import LetterForm from './LetterForm';
import { axiosInstance } from '../Dashboard/api';

const LetterTemplate: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: number; title: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get('/letter-templates/');
        setTemplates(res.data);
      } catch (err: unknown) {
        let msg = 'Failed to load templates';
        if (typeof err === 'object' && err !== null) {
          const errorObj = err as AxiosError;
          if (errorObj.response && errorObj.response.data) {
            if (typeof errorObj.response.data === 'string') {
              msg = errorObj.response.data;
            } else if (typeof errorObj.response.data === 'object' && 'error' in errorObj.response.data) {
              msg = String((errorObj.response.data as Record<string, unknown>).error);
            }
          } else if ('message' in errorObj && typeof errorObj.message === 'string') {
            msg = errorObj.message;
          }
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);
  // Handler for successful letter creation
  const handleLetterCreated = (title: string, content: string) => {
    setDraft({ title, content });
    setShowForm(false);
    // Refetch templates after creation
    (async () => {
      try {
        const res = await axiosInstance.get('/letter-templates/');
        setTemplates(res.data);
      } catch {
        // ignore
      }
    })();
  };

  return (
    <div className="max-w-5xl mx-auto mt-10">
      <ComponentCard title="Letter Templates" desc="Manage your company's letter templates.">
        {loading && <div className="text-blue-600">Loading templates...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!showForm && !draft && !loading && (
          <div className="flex space-x-4 flex-wrap">
            <div
              className="w-48 h-48 flex flex-col items-center justify-center cursor-pointer border-dashed border-2 border-gray-400 bg-white hover:bg-gray-50 transition mb-4"
              onClick={() => navigate('/admin/letter-form')}
            >
              <PlusIcon className="w-8 h-8 text-gray-400" />
              <span className="mt-2 text-gray-500 font-medium text-sm">Add</span>
            </div>
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="relative group w-48 h-48 flex flex-col items-center justify-center border mb-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => navigate('/admin/letter', { state: { title: tpl.title, content: tpl.content, templateId: tpl.id } })}
              >
                {/* Delete button, only visible on hover */}
                <button
                  className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white shadow hover:bg-red-100 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                  title="Delete"
                  onClick={e => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this template?')) {
                      axiosInstance.delete(`/letter-templates/${tpl.id}/`).then(() => {
                        setTemplates(templates.filter(t => t.id !== tpl.id));
                      });
                    }
                  }}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                <div className="font-bold text-lg mb-2 text-center">{tpl.title}</div>
                <div className="text-xs text-gray-500 line-clamp-4 text-center">{tpl.content.slice(0, 100)}...</div>
                <div className="text-xs text-blue-500 mt-2">Click to edit as draft</div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <LetterForm
            onSuccess={(title: string, content: string) => handleLetterCreated(title, content)}
          />
        )}

        {draft && (
          <div
            className="cursor-pointer"
            onClick={() => {
              console.log('Draft card clicked', draft);
              navigate('/admin/letter', { state: { title: draft.title, content: draft.content } });
            }}
          >
            <ComponentCard title="Drafted Letter (Editable)">
              <div className="mb-4">
                <input
                  className="w-full border px-3 py-2 rounded mb-2"
                  value={draft.title}
                  readOnly
                />
                <textarea
                  className="w-full border px-3 py-2 rounded"
                  rows={12}
                  value={draft.content}
                  readOnly
                />
              </div>
              <div className="text-xs text-gray-500">Click to edit this draft in the letter editor.</div>
            </ComponentCard>
          </div>
        )}
      </ComponentCard>
    </div>
  );
};

export default LetterTemplate;