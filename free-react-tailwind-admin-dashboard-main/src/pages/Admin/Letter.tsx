import React, { useEffect, useState } from "react";
import { MapPin, Mail, Phone, Globe, Calendar } from "lucide-react";
import { axiosInstance } from "../Dashboard/api";
import { useLocation, useParams } from "react-router-dom";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { $getRoot, $createParagraphNode, $createTextNode, EditorState, LexicalEditor } from "lexical";

interface LetterProps {
  templateId?: number;
  companyId?: number;
}

const StudioShodweLetterhead: React.FC<LetterProps> = (props) => {
  const location = useLocation();
  const params = useParams();
  // Extract templateId from props, then navigation state, then URL params
  let templateId = props.templateId;
  const navState = location.state as { templateId?: number; title?: string; content?: string } | undefined;
  if (templateId === undefined) {
    if (navState && navState.templateId) {
      templateId = navState.templateId;
    } else if (params && params.templateId) {
      templateId = Number(params.templateId);
    }
  }

  const [letterContent, setLetterContent] = useState<string>('');
  const [editorStateJSON, setEditorStateJSON] = useState<string>('');
  const [letterTitle, setLetterTitle] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
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
    // If navigation state is present (from LetterForm), try to fetch the just-created letter from backend
    if (navState?.title && navState?.content && !templateId) {
      setLoading(true);
      axiosInstance
        .get('/letter-templates/')
        .then((res) => {
          // Find the most recent letter with the same title and content
          const found = (res.data as Array<{ id: number; title: string; content: string; editor_state?: string; company_details?: unknown }> ).find(
            (tpl) => tpl.title === navState.title && tpl.content === navState.content
          );
          if (found) {
            setLetterTitle(found.title || '');
            setLetterContent(found.content || '');
            setEditorStateJSON(found.editor_state || '');
            // Do not assign to templateId (avoid lint error), optionally update URL:
            // window.history.replaceState({}, '', `/admin/letter/${found.id}`);
            setError(null);
          } else {
            setLetterTitle(navState.title || '');
            setLetterContent(navState.content || '');
            setEditorStateJSON('');
          }
        })
        .catch(() => {
          setLetterTitle(navState.title || '');
          setLetterContent(navState.content || '');
          setEditorStateJSON('');
        })
        .finally(() => setLoading(false));
      axiosInstance.get("/company-update/").then((res) => {
        setCompany(res.data || null);
      });
      return;
    }

    // Otherwise, always load from backend for existing letters
    if (templateId) {
      setLoading(true);
      axiosInstance
        .get(`/letter-templates/${templateId}/`)
        .then((res) => {
          setLetterTitle(res.data.title || '');
          setLetterContent(res.data.content || '');
          setEditorStateJSON(res.data.editor_state || '');
        })
        .catch(() => {
          setError("Could not load letter");
          setLetterTitle('');
          setLetterContent('');
        })
        .finally(() => setLoading(false));
      axiosInstance
        .get("/letter-templates/")
        .then((res) => {
          const found = (res.data as Array<{ id: number; company_details?: {
            name?: string;
            tag?: string;
            address?: string;
            email?: string;
            phone_number?: string;
            website?: string;
            logo_url?: string;
          } }>).find(
            (tpl) => String(tpl.id) === String(templateId)
          );
          setCompany(found?.company_details || null);
        })
        .catch(() => setCompany(null));
    }
  }, [templateId, navState?.title, navState?.content]);

  // Get current date
  const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date().toLocaleDateString("en-US", options);
  };

  // Lexical Editor Config
  const editorConfig = {
    namespace: "LetterEditor",
    theme: {
      paragraph: "mb-2",
    },
    onError(error: Error) {
      console.error(error);
    },
    editorState: editorStateJSON
      ? (editor: LexicalEditor) => {
          try {
            editor.setEditorState(
              editor.parseEditorState(JSON.parse(editorStateJSON))
            );
          } catch {
            const root = $getRoot();
            root.clear();
            if (letterContent) {
              const paragraph = $createParagraphNode();
              paragraph.append($createTextNode(letterContent));
              root.append(paragraph);
            }
          }
        }
      : () => {
          const root = $getRoot();
          root.clear();
          if (letterContent) {
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(letterContent));
            root.append(paragraph);
          }
        },
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
              onChange={e => setLetterTitle(e.target.value)}
              placeholder="Enter letter title..."
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
              <LexicalComposer
                initialConfig={editorConfig}
              >
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable
                      className="outline-none prose prose-slate max-w-none"
                      style={{ fontSize: "12px", lineHeight: "1.6" }}
                    />
                  }
                  placeholder={null}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                <OnChangePlugin
                  onChange={(editorState: EditorState, editor: LexicalEditor) => {
                    // Save both plain text and full JSON
                    editorState.read(() => {
                      const text = $getRoot().getTextContent();
                      setLetterContent(text);
                      // Always get the latest editor state from the editor instance
                      setEditorStateJSON(JSON.stringify(editor.getEditorState()));
                      setJustSaved(false); // Hide 'Saved!' if user edits again
                    });
                  }}
                />
              </LexicalComposer>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end mt-4">
            <button
              className="bg-blue-700 text-white font-bold py-2 px-6 rounded hover:bg-blue-800 transition"
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  if (templateId) {
                    await axiosInstance.put(`/letter-templates/${templateId}/`, {
                      title: letterTitle,
                      content: letterContent,
                      editor_state: editorStateJSON,
                    });
                    setJustSaved(true);
                  } else {
                    await axiosInstance.post("/letter-templates/", {
                      title: letterTitle,
                      content: letterContent,
                      editor_state: editorStateJSON,
                    });
                    setJustSaved(true);
                  }
                } catch {
                  setError("Could not save letter");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
        </div>
         {justSaved && <span className="ml-4 text-green-600 italic">Saved Successfully!</span>}

        </div>
      </div>
    </div>
  );
}

export default StudioShodweLetterhead;

