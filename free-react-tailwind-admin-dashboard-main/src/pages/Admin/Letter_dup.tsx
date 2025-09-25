import React, { useEffect, useState } from "react";
import { MapPin, Mail, Phone, Globe, Calendar } from "lucide-react";
import { axiosInstance } from "../Dashboard/api";


const StudioShodweLetterhead: React.FC = () => {
  // Always extract template_id and candidate_id from query params for this view
  const searchParams = new URLSearchParams(window.location.search);
  const type = searchParams.get('type');
  const templateId = searchParams.get('template_id');
  // For offer/appointment: candidate_id, for relieve: relieved_id
  const candidate_id = (type === 'offer' || type === 'appointment') ? searchParams.get('id') : null;
  const relieved_id = type === 'relieve' ? searchParams.get('id') : null;

  const [letterContent, setLetterContent] = useState<string>('');
  const [letterTitle, setLetterTitle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<{
    name?: string;
    tag?: string;
    address?: string;
    email?: string;
    phone_number?: string;
    website?: string;
    logo_url?: string;
  } | null>(null);

  useEffect(() => {
    if (!templateId) return;
    let getParams = '';
    // Always include type, template_id, and candidate_id/relieved_id in all requests
    const postBody: Record<string, string> = { template_id: templateId, type: type || '' };
    let emailContent = '';
    const fetchAndGenerate = async () => {
      if (type === 'offer' || type === 'appointment') {
        if (!candidate_id) {
          setError('No valid candidate ID provided.');
          setLetterContent('');
          setLetterTitle('');
          return;
        }
        getParams = `app/generated-letters/?candidate_id=${candidate_id}&template_id=${templateId}&type=${type}`;
        if (typeof candidate_id === 'string') {
          postBody.candidate_id = candidate_id;
        }
      } else if (type === 'relieve') {
        if (!relieved_id) {
          setError('No valid relieved employee ID provided.');
          setLetterContent('');
          setLetterTitle('');
          return;
        }
        getParams = `app/generated-letters/?relieved_id=${relieved_id}&template_id=${templateId}&type=${type}`;
        if (typeof relieved_id === 'string') {
          postBody.relieved_employee_id = relieved_id;
        }
      } else {
        setError('Invalid letter type.');
        setLetterContent('');
        setLetterTitle('');
        return;
      }
      setLoading(true);
      try {
        // Fetch the template to get email_content
        const templateRes = await axiosInstance.get(`app/letter-templates/${templateId}/`);
        emailContent = templateRes.data.email_content || '';
        postBody.email_content = emailContent;
      } catch {
        // If template fetch fails, continue without email_content
        postBody.email_content = '';
      }
      try {
        const res = await axiosInstance.get(getParams);
        if (Array.isArray(res.data) && res.data.length > 0) {
          setLetterContent(res.data[0].content || '');
          if (res.data[0].title && res.data[0].title !== '') {
            setLetterTitle(res.data[0].title);
          } else {
            try {
              const tplRes = await axiosInstance.get(`app/letter-templates/${templateId}/`);
              setLetterTitle(tplRes.data.title || '');
            } catch {
              setLetterTitle('');
            }
          }
          setLoading(false);
        } else {
          // No letter found, generate new letter
          try {
            const res2 = await axiosInstance.post('app/generate-letter-content/', postBody);
            setLetterContent(res2.data.content || '');
            if (res2.data.title && res2.data.title !== '') {
              setLetterTitle(res2.data.title);
            } else {
              try {
                const tplRes = await axiosInstance.get(`app/letter-templates/${templateId}/`);
                setLetterTitle(tplRes.data.title || '');
              } catch {
                setLetterTitle('');
              }
            }
          } catch {
            setError('Could not generate letter content');
            setLetterContent('');
          } finally {
            setLoading(false);
          }
        }
      } catch {
        // If GET fails, fallback to POST
        try {
          const res2 = await axiosInstance.post('app/generate-letter-content/', postBody);
          setLetterContent(res2.data.content || '');
          if (res2.data.title && res2.data.title !== '') {
            setLetterTitle(res2.data.title);
          } else {
            try {
              const tplRes = await axiosInstance.get(`app/letter-templates/${templateId}/`);
              setLetterTitle(tplRes.data.title || '');
            } catch {
              setLetterTitle('');
            }
          }
        } catch {
          setError('Could not generate letter content');
          setLetterContent('');
        } finally {
          setLoading(false);
        }
      }
      // Fetch company info
      axiosInstance.get("app/company-update/").then((res) => {
        setCompany(res.data || null);
      });
    };
    fetchAndGenerate();
  }, [templateId, type, candidate_id, relieved_id]);

  // Get current date
  const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date().toLocaleDateString("en-US", options);
  };



  // Company Fallbacks
  const companyName = company?.name || "Company Name";
  const companyTag = company?.tag || "";
  const companyAddress = company?.address || "Company Address";
  const companyEmail = company?.email || "company@email.com";
  const companyPhone = company?.phone_number || "000-000-0000";
  const companyWebsite = company?.website || "";
  const companyLogo = company?.logo_url;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-end mb-2">
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded"
          onClick={() => window.print()}
        >
          Print as PDF
        </button>
      </div>
      <div className="w-[210mm] h-[297mm] bg-white mx-auto relative shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="border-b-2 border-slate-200 bg-white">
          <div className="flex items-center justify-between px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex-shrink-0">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt="Company Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-600 rounded-lg flex items-center justify-center">
                    <div className="text-white font-bold text-xl">
                      {companyName.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{companyName}</h1>
                {companyTag && (
                  <p className="text-sm text-slate-600 uppercase">{companyTag}</p>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-slate-600 space-y-1">
              {companyAddress && (
                <div className="flex items-center justify-end space-x-2">
                  <MapPin size={14} className="text-slate-500" />
                  <span>{companyAddress}</span>
                </div>
              )}
              <div className="flex items-center justify-end space-x-2">
                <Phone size={14} className="text-slate-500" />
                <span>{companyPhone}</span>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Mail size={14} className="text-slate-500" />
                <span>{companyEmail}</span>
              </div>
              {companyWebsite && (
                <div className="flex items-center justify-end space-x-2">
                  <Globe size={14} className="text-slate-500" />
                  <span>{companyWebsite}</span>
                </div>
              )}
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600"></div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 h-[calc(310mm-210px)] flex flex-col">
          <div className="flex items-center mb-6 text-sm text-slate-600">
            <Calendar size={16} className="mr-2" />
            <span className="font-medium">{getCurrentDate()}</span>
          </div>

          {/* Letter Title/Subject (inline editable) */}
          <div className="mb-6">
            <input
              type="text"
              className="text-lg font-semibold text-slate-800 text-center border-b border-slate-300 pb-2 w-full outline-none focus:ring-2 focus:ring-blue-300"
              value={letterTitle}
              readOnly
              placeholder="Letter title"
              maxLength={100}
              style={{ background: 'transparent' }}
            />
          </div>

          {/* Editable Letter Content */}
          <div className="flex-1 text-slate-700 text-justify text-sm leading-relaxed">
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <div className="whitespace-pre-line prose prose-slate max-w-none" style={{ fontSize: "12px", lineHeight: "1.6" }}>
                {letterContent}
              </div>
            )}
          </div>

          {/* Save Button */}
          {/* No Save button for generated content view */}

        </div>
      </div>
    </div>
  );
}

export default StudioShodweLetterhead;

