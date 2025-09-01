import React, { useState } from 'react';
import { axiosInstance } from '../Dashboard/api';
import { useNavigate } from 'react-router-dom';
import ComponentCard from '../../components/common/ComponentCard';
import InputField from '../../components/form/input/InputField';
import TextArea from '../../components/form/input/TextArea';
import Label from '../../components/form/Label';
import { Info } from 'lucide-react';


interface LetterFormProps {
  onSuccess?: (title: string, content: string) => void;
}


const LetterForm: React.FC<LetterFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(`Subject: 

To,
<name>
&
<address>

Dear <name>,
We are excited to offer you the position of <designation> at <company>. After evaluating your skills, enthusiasm,
and potential, we are confident that you will be a valuable addition to our team.

Terms of Employment
1. Probationary Period: You will be on a probationary period of three (3) months starting from your joining date. During
this time, you will receive a fixed salary of ₹<ctc> per month.
2. Performance Review: At the end of the probationary period, your performance will be evaluated, and your
compensation will be revised based on the outcomes of the review.
3. Joining Date: <joining_date>
4. Location: <location>
5. Reporting To: Chief Executive Officer

Documents Required for Onboarding

- Government-issued ID proof (e.g., Aadhaar, PAN, Passport).
- Educational certificates (mark sheets and degree certificates).
- Previous employment details (if applicable, including experience letters).
- Bank account details for salary processing.
- A recent passport-size photograph.
This offer is contingent upon receipt of the above documents and verification of the information provided.

Confirmation of Acceptance
Please confirm your acceptance of this offer by replying to this email or signing and returning a copy of this letter by
.
We are thrilled to welcome you to the <company> family and look forward to working together on exciting
projects and achieving great success.
If you have any questions or need further clarification, feel free to reach out to us at samplecompanyname@gmail.com or 123-456-7890. Welcome aboard!

Warm regards,
<sender_name>

Acknowledgment and Acceptance
I, <name>, have read and understood the terms of this offer letter and accept the position of <designation> at
<company>.
Signature: __________________________
Date: ______________________________
`);

  const [emailContent, setEmailContent] = useState('Dear <name>,\n\nPlease find attached your letter.\n\nRegards,\n<company>');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [placeholderWarning, setPlaceholderWarning] = useState<string | null>(null);

  const SUPPORTED_PLACEHOLDERS = [
    'name', 'designation', 'joining_date', 'ctc', 'company', 'location',
    'employee_id', 'department', 'last_working_date', // add more if needed
  ];

  function findUnsupportedPlaceholders(text: string) {
    const matches = Array.from(text.matchAll(/<([a-zA-Z0-9_]+)>/g)).map(m => m[1]);
    return matches.filter(ph => !SUPPORTED_PLACEHOLDERS.includes(ph));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setPlaceholderWarning(null);
    // Validate placeholders
    const unsupported = findUnsupportedPlaceholders(content);
    if (unsupported.length > 0) {
      setLoading(false);
      setPlaceholderWarning(
        `Warning: The following placeholders are not supported and will not be filled automatically: ${unsupported.map(p => `<${p}>`).join(', ')}`
      );
      return;
    }
    try {
      await axiosInstance.post('/letter-templates/', {
        title,
        content,
        email_content: emailContent,
      });
      setSuccess(true);
      if (onSuccess) {
        onSuccess(title, content);
      }
      // Redirect to Letter page and pass content as state
      navigate('/admin/letter', { state: { title, content, emailContent } });
      setTitle('');
      setContent('');
      setEmailContent('Dear <name>,\n\nPlease find attached your letter.\n\nRegards,\n<company>');
    } catch (err: unknown) {
      console.error('Backend error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
     
      <button
        type="button"
        className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
        onClick={() => navigate(-1)}
      >
        &larr; Back
      </button>
      <ComponentCard
        title="Create Letter Template"
        desc="Fill in the details below to create a new letter template for your company."
        >
        {/* Info Content Section */}
       <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Usage Instructions</h4>
            <div className="mt-3 space-y-1">
              <div className="text-xs text-blue-900 font-semibold">Offer Letter <span className="font-normal">→ Requires &lt;name&gt;, &lt;designation&gt;, &lt;joining_date&gt;, &lt;ctc&gt;, &lt;company&gt;, &lt;location&gt;</span></div>
              <div className="text-xs text-blue-900 font-semibold">Appointment Letter <span className="font-normal">→ Requires &lt;name&gt;, &lt;employee_id&gt;, &lt;designation&gt;, &lt;joining_date&gt;, &lt;ctc&gt;, &lt;company&gt;, &lt;location&gt;</span></div>
              <div className="text-xs text-blue-900 font-semibold">Relieving Letter <span className="font-normal">→ Requires &lt;name&gt;, &lt;employee_id&gt;, &lt;designation&gt;, &lt;department&gt;, &lt;joining_date&gt;, &lt;last_working_date&gt;, &lt;company&gt;</span></div>
            </div>
            <p className="text-xs text-blue-700 mt-2">Only the above placeholders will be replaced with data. Any other placeholders will not be filled automatically.</p>
          </div>
        </div>
      </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="letter-title">Title</Label>
            <InputField
              id="letter-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter letter title (Appointment Letter, Offer Letter, etc.)"
              required
            />
          </div>
          <div>
            <Label htmlFor="letter-content">Letter Content</Label>
            <TextArea
              value={content}
              onChange={setContent}
              rows={12}
              placeholder="Enter letter content..."
            />
            {/* Word count and limit */}
            <div className="text-right text-xs text-gray-500 mt-1">
              {content.trim().split(/\s+/).filter(Boolean).length} / 400 words
            </div>
          </div>
          <div>
            <Label htmlFor="email-content">Email Content</Label>
            <TextArea
              value={emailContent}
              onChange={setEmailContent}
              rows={4}
              placeholder="Enter the email body to be sent with the letter..."
            />
            <div className="text-xs text-gray-500 mt-1">This content will be used as the email body when sending the letter as an attachment.</div>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {success && <div className="text-green-600 mb-2">Letter created successfully!</div>}
          {placeholderWarning && (
            <div className="text-yellow-700 bg-yellow-100 border border-yellow-300 rounded px-3 py-2 mb-2 text-sm">
              {placeholderWarning}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-700 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Create Letter'}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
};

export default LetterForm;
