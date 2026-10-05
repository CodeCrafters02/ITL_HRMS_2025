import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconOutlook from '../../components/Icon/IconOutlook';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconPencilPaper from '../../components/Icon/IconPencilPaper';
import IconPaperclip from '../../components/Icon/IconPaperclip';
import IconArrowLeft from '../../components/Icon/IconArrowLeft';
import IconArrowBackward from '../../components/Icon/IconArrowBackward';
import IconArrowForward from '../../components/Icon/IconArrowForward';
import IconArchive from '../../components/Icon/IconArchive';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconStar from '../../components/Icon/IconStar';
import IconMail from '../../components/Icon/IconMail';
import IconDownload from '../../components/Icon/IconDownload';
import IconSend from '../../components/Icon/IconSend';
import IconX from '../../components/Icon/IconX';
import { OutlookConnectPrompt } from '../../components/Outlook/OutlookMailList';
import { Avatar, confirmDanger, EmptyState, FormField, IconButton, MasterModal, ModalBody, ModalFooter, notifyError, notifySuccess, SearchInput } from '../../components/Master';
import { formatMailTime, refreshOutlookInbox } from '../../services/outlookService';
import {
    ComposeMode,
    deleteMessage,
    downloadAttachment,
    fetchFolders,
    fetchMessage,
    fetchMessages,
    formatBytes,
    isNotConnected,
    MailDetail,
    MailFolder,
    MailListItem,
    MailPerson,
    sendMail,
    suggestRecipients,
    updateMessage,
} from '../../services/outlookMail';

const PANEL = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#1b2e4b] dark:bg-[#0e1726]';
const SEARCH_DEBOUNCE_MS = 450;
const QUILL_MODULES = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']] };

const people = (list: MailPerson[]) => list.map((person) => person.name || person.email).join(', ');
const addresses = (list: MailPerson[]) => list.map((person) => person.email).filter(Boolean);
const fullDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/** Email HTML is shown in a sandboxed frame: no scripts run and it cannot reach the HRMS page. */
const frameDocument = (html: string) =>
    `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;background:#fff;margin:16px;word-break:break-word}img{max-width:100%;height:auto}a{color:#2563eb}blockquote{margin-left:8px;padding-left:12px;border-left:3px solid #e2e8f0;color:#475569}table{max-width:100%}</style></head><body>${html}</body></html>`;

interface RecipientInputProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const lastToken = (value: string) => value.split(/[,;]/).pop()!.trim();

/** Comma-separated address field that suggests colleagues for the address being typed. */
const RecipientInput = ({ id, value, onChange, placeholder }: RecipientInputProps) => {
    const [suggestions, setSuggestions] = useState<MailPerson[]>([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const token = lastToken(value);

    useEffect(() => {
        if (!open || token.length < 2) {
            setSuggestions([]);
            return;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => {
            const already = value.toLowerCase();
            suggestRecipients(token, controller.signal)
                .then((list) => {
                    setSuggestions(list.filter((person) => !already.includes(person.email.toLowerCase())));
                    setActive(0);
                })
                .catch(() => setSuggestions([]));
        }, 250);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, open]);

    const pick = (person: MailPerson) => {
        const cut = Math.max(value.lastIndexOf(','), value.lastIndexOf(';'));
        const before = cut >= 0 ? `${value.slice(0, cut + 1).trim()} ` : '';
        onChange(`${before}${person.email}, `);
        setSuggestions([]);
    };

    const showList = open && suggestions.length > 0;

    return (
        <div className="relative w-full">
            <input
                id={id}
                type="text"
                className="form-input"
                placeholder={placeholder}
                value={value}
                autoComplete="off"
                role="combobox"
                aria-expanded={showList}
                aria-controls={`${id}_suggestions`}
                aria-autocomplete="list"
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={(e) => {
                    if (!showList) {
                        // Enter in an address field must not send the message
                        if (e.key === 'Enter') e.preventDefault();
                        return;
                    }
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActive((current) => (current + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length);
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        pick(suggestions[active]);
                    } else if (e.key === 'Escape') {
                        e.stopPropagation();
                        setOpen(false);
                    }
                }}
            />
            {showList && (
                <ul id={`${id}_suggestions`} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                    {suggestions.map((person, index) => (
                        <li key={person.email} role="option" aria-selected={index === active}>
                            <button
                                type="button"
                                // mousedown fires before the input's blur, so the choice is not lost
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pick(person);
                                }}
                                onMouseEnter={() => setActive(index)}
                                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${index === active ? 'bg-primary/10' : ''}`}
                            >
                                <Avatar name={person.name || person.email} size="sm" />
                                <span className="min-w-0">
                                    {person.name && <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{person.name}</span>}
                                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{person.email}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

interface ComposeState {
    mode: ComposeMode;
    source?: MailDetail;
}

interface ComposeDialogProps {
    state: ComposeState | null;
    onClose: () => void;
    onSent: () => void;
}

const COMPOSE_TITLES: Record<ComposeMode, string> = { new: 'New message', reply: 'Reply', reply_all: 'Reply all', forward: 'Forward' };

const ComposeDialog = ({ state, onClose, onSent }: ComposeDialogProps) => {
    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [showCopies, setShowCopies] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!state) return;
        const { mode, source } = state;
        const me = (localStorage.getItem('user_email') || '').toLowerCase();
        const others = (list: MailPerson[]) => addresses(list).filter((email) => email.toLowerCase() !== me);
        const original = source?.subject || '';
        const prefixed = (prefix: string) => (new RegExp(`^${prefix}:`, 'i').test(original) ? original : `${prefix}: ${original}`);
        const ccList = mode === 'reply_all' && source ? others(source.cc) : [];

        setTo(mode === 'reply' && source ? source.from_email : mode === 'reply_all' && source ? [source.from_email, ...others(source.to).filter((email) => email !== source.from_email)].join(', ') : '');
        setCc(ccList.join(', '));
        setBcc('');
        setShowCopies(ccList.length > 0);
        setSubject(mode === 'new' ? '' : mode === 'forward' ? prefixed('Fw') : prefixed('Re'));
        setBody('');
        setFiles([]);
    }, [state]);

    const addFiles = (list: FileList | null) => {
        if (list) setFiles((current) => [...current, ...Array.from(list)].slice(0, 10));
        if (fileInput.current) fileInput.current.value = '';
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!state) return;
        if (!to.trim() && !cc.trim() && !bcc.trim()) return notifyError('Add at least one recipient.', 'No recipient');
        setSending(true);
        try {
            await sendMail({ mode: state.mode, message_id: state.source?.id, to, cc, bcc, subject, body_html: body, attachments: files });
            notifySuccess('Message sent.');
            onSent();
        } catch (err: any) {
            notifyError(err?.message || 'The message could not be sent.', err?.reason === 'send_permission_required' ? 'Permission needed to send mail' : 'Could not send');
        } finally {
            setSending(false);
        }
    };

    const mode = state?.mode || 'new';

    return (
        <MasterModal open={!!state} onClose={onClose} title={COMPOSE_TITLES[mode]} description={state?.source ? state.source.subject : 'Sent from your Outlook mailbox.'} size="xl">
            <form onSubmit={handleSubmit}>
                <ModalBody>
                    <div className="space-y-4">
                        <FormField label="To" htmlFor="mail_to" hint="Start typing a colleague's name to see suggestions. Separate several addresses with commas.">
                            <div className="flex items-center gap-2">
                                <RecipientInput id="mail_to" value={to} onChange={setTo} placeholder="Type a name or email" />
                                {!showCopies && (
                                    <button type="button" className="shrink-0 text-xs font-semibold text-primary hover:underline" onClick={() => setShowCopies(true)}>
                                        Cc / Bcc
                                    </button>
                                )}
                            </div>
                        </FormField>
                        {showCopies && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField label="Cc" htmlFor="mail_cc">
                                    <RecipientInput id="mail_cc" value={cc} onChange={setCc} />
                                </FormField>
                                <FormField label="Bcc" htmlFor="mail_bcc">
                                    <RecipientInput id="mail_bcc" value={bcc} onChange={setBcc} />
                                </FormField>
                            </div>
                        )}
                        <FormField label="Subject" htmlFor="mail_subject">
                            <input id="mail_subject" type="text" className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                        </FormField>
                        <div>
                            <ReactQuill theme="snow" value={body} onChange={setBody} modules={QUILL_MODULES} placeholder="Write your message..." className="[&_.ql-editor]:min-h-[180px]" />
                            {mode !== 'new' && <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">The original message is included below your text automatically{mode === 'forward' ? ', with its attachments' : ''}.</p>}
                        </div>
                        <div>
                            <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline" onClick={() => fileInput.current?.click()}>
                                <IconPaperclip className="h-4 w-4" />
                                Attach files
                            </button>
                            <span className="ml-2 text-[11px] text-slate-400">Up to 10 files, 3 MB each</span>
                            {files.length > 0 && (
                                <ul className="mt-2 flex flex-wrap gap-2">
                                    {files.map((file, index) => (
                                        <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-[#1b2e4b]">
                                            <span className="max-w-[180px] truncate font-medium">{file.name}</span>
                                            <span className="text-slate-400">{formatBytes(file.size)}</span>
                                            <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}>
                                                <IconX className="h-3.5 w-3.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-outline-dark" onClick={onClose} disabled={sending}>
                        Discard
                    </button>
                    <button type="submit" className="btn btn-primary gap-2" disabled={sending}>
                        <IconSend className="h-4 w-4" />
                        {sending ? 'Sending...' : 'Send'}
                    </button>
                </ModalFooter>
            </form>
        </MasterModal>
    );
};

const OutlookMail = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();

    const [connected, setConnected] = useState(true);
    const [folders, setFolders] = useState<MailFolder[]>([]);
    const [folder, setFolder] = useState('inbox');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [unreadOnly, setUnreadOnly] = useState(false);
    // cursors[n] is the server link for page n; the first page has none
    const [cursors, setCursors] = useState<(string | null)[]>([null]);
    const [pageIndex, setPageIndex] = useState(0);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [messages, setMessages] = useState<MailListItem[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('message'));
    const [detail, setDetail] = useState<MailDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [compose, setCompose] = useState<ComposeState | null>(null);

    const currentFolder = folders.find((item) => item.id === folder);

    const loadFolders = useCallback(() => {
        fetchFolders()
            .then((list) => {
                setFolders(list);
                setConnected(true);
            })
            .catch((err) => isNotConnected(err) && setConnected(false));
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Outlook'));
        loadFolders();
    }, [dispatch, loadFolders]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);

    const resetPaging = () => {
        setCursors([null]);
        setPageIndex(0);
    };

    // Every list change (folder, search, filter, page) is a new request to the server
    useEffect(() => {
        let cancelled = false;
        setListLoading(true);
        setListError('');
        fetchMessages({ folder, search: debouncedSearch, unread: unreadOnly, cursor: cursors[pageIndex] })
            .then((data) => {
                if (cancelled) return;
                setMessages(data.messages);
                setNextCursor(data.next_cursor);
                setConnected(true);
                setListLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                if (isNotConnected(err)) setConnected(false);
                else setListError(err?.message || 'Could not load messages.');
                setMessages([]);
                setNextCursor(null);
                setListLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folder, debouncedSearch, unreadOnly, pageIndex, reloadKey]);

    useEffect(() => {
        if (!selectedId) {
            setDetail(null);
            return;
        }
        let cancelled = false;
        setDetailLoading(true);
        setDetailError('');
        fetchMessage(selectedId)
            .then((data) => {
                if (cancelled) return;
                setDetail(data);
                setDetailLoading(false);
                // Opening a message marks it read on the server; mirror that in the list and the counters
                if (messagesRef.current.some((item) => item.id === data.id && !item.is_read)) {
                    setFolders((list) => list.map((item) => (item.id === folder ? { ...item, unread: Math.max(0, item.unread - 1) } : item)));
                    refreshOutlookInbox(true);
                }
                setMessages((current) => current.map((item) => (item.id === data.id ? { ...item, is_read: true } : item)));
            })
            .catch((err) => {
                if (cancelled) return;
                if (isNotConnected(err)) setConnected(false);
                setDetail(null);
                setDetailError(err?.message || 'Could not open this message.');
                setDetailLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    const openMessage = (id: string | null) => {
        setSelectedId(id);
        if (searchParams.has('message')) setSearchParams({}, { replace: true });
    };

    const changeFolder = (id: string) => {
        setFolder(id);
        setSearch('');
        setDebouncedSearch('');
        setUnreadOnly(false);
        resetPaging();
        openMessage(null);
    };

    const refresh = () => {
        loadFolders();
        resetPaging();
        setReloadKey((key) => key + 1);
    };

    const goOlder = () => {
        if (!nextCursor) return;
        setCursors((current) => [...current.slice(0, pageIndex + 1), nextCursor]);
        setPageIndex(pageIndex + 1);
    };

    const removeFromList = (id: string) => {
        setMessages((current) => current.filter((item) => item.id !== id));
        openMessage(null);
        loadFolders();
        refreshOutlookInbox(true);
    };

    const run = async (action: () => Promise<unknown>, failure: string) => {
        try {
            await action();
            return true;
        } catch (err: any) {
            if (isNotConnected(err)) setConnected(false);
            else notifyError(err?.message || failure, failure);
            return false;
        }
    };

    const toggleRead = async (item: MailDetail) => {
        const isRead = !item.is_read;
        if (!(await run(() => updateMessage(item.id, { is_read: isRead }), 'Could not update the message'))) return;
        setMessages((current) => current.map((row) => (row.id === item.id ? { ...row, is_read: isRead } : row)));
        if (isRead) setDetail({ ...item, is_read: true });
        else openMessage(null);
        loadFolders();
        refreshOutlookInbox(true);
    };

    const toggleFlag = async (item: MailDetail) => {
        const flagged = !item.flagged;
        if (!(await run(() => updateMessage(item.id, { flagged }), 'Could not update the flag'))) return;
        setDetail({ ...item, flagged });
        setMessages((current) => current.map((row) => (row.id === item.id ? { ...row, flagged } : row)));
    };

    const archive = async (item: MailDetail) => {
        if (await run(() => updateMessage(item.id, { move_to: 'archive' }), 'Could not archive the message')) {
            notifySuccess('Moved to Archive.');
            removeFromList(item.id);
        }
    };

    const remove = async (item: MailDetail) => {
        const permanent = folder === 'deleteditems';
        if (permanent && !(await confirmDanger('Delete permanently?', 'This message will be removed from Outlook for good.'))) return;
        if (await run(() => deleteMessage(item.id, permanent), 'Could not delete the message')) {
            notifySuccess(permanent ? 'Message deleted.' : 'Moved to Deleted Items.');
            removeFromList(item.id);
        }
    };

    const download = (item: MailDetail, attachmentId: string) => {
        const attachment = item.attachments.find((entry) => entry.id === attachmentId);
        if (attachment) run(() => downloadAttachment(item.id, attachment), 'Could not download the attachment');
    };

    const showsRecipients = folder === 'sentitems' || folder === 'drafts';
    const frame = useMemo(() => (detail ? frameDocument(detail.body_html) : ''), [detail]);

    if (!connected) {
        return (
            <div className={`${PANEL} mx-auto max-w-xl`}>
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-base font-bold text-slate-900 dark:border-white/5 dark:text-white">
                    <IconOutlook size={22} /> Outlook
                </div>
                <OutlookConnectPrompt />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(var(--app-vh)_-_150px)] min-h-[560px] gap-4">
            {/* Folders */}
            <aside className={`${PANEL} hidden w-56 shrink-0 flex-col lg:flex`}>
                <div className="p-4">
                    <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                        <IconOutlook size={22} /> Outlook
                    </div>
                    <button type="button" className="btn btn-primary w-full gap-2" onClick={() => setCompose({ mode: 'new' })}>
                        <IconPencilPaper className="h-4 w-4" />
                        New message
                    </button>
                </div>
                <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
                    {folders.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => changeFolder(item.id)}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                                item.id === folder ? 'bg-primary/10 font-semibold text-primary' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                            } ${!item.system && folders[index - 1]?.system ? '!mt-3' : ''}`}
                        >
                            <span className="truncate">{item.name}</span>
                            {item.unread > 0 && <span className="shrink-0 rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">{item.unread}</span>}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Message list */}
            <section className={`${PANEL} ${selectedId ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col lg:w-[380px]`}>
                <div className="space-y-3 border-b border-slate-100 p-4 dark:border-white/5">
                    <div className="flex items-center gap-2 lg:hidden">
                        <select className="form-select h-10 flex-1 rounded-lg py-0 text-sm font-semibold" value={folder} onChange={(e) => changeFolder(e.target.value)} aria-label="Folder">
                            {folders.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                    {item.unread > 0 ? ` (${item.unread})` : ''}
                                </option>
                            ))}
                        </select>
                        <button type="button" className="btn btn-primary h-10 shrink-0 gap-1.5 px-3" onClick={() => setCompose({ mode: 'new' })}>
                            <IconPencilPaper className="h-4 w-4" />
                            New
                        </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">{currentFolder?.name || 'Mail'}</h1>
                        <IconButton label="Refresh" onClick={refresh} disabled={listLoading}>
                            <IconRefresh className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
                        </IconButton>
                    </div>
                    <div className="[&>div]:!w-full">
                        <SearchInput
                            value={search}
                            onChange={(value) => {
                                setSearch(value);
                                resetPaging();
                            }}
                            placeholder={`Search ${currentFolder?.name || 'mail'}`}
                        />
                    </div>
                    <label className={`flex items-center gap-2 text-xs font-medium ${debouncedSearch ? 'text-slate-400' : 'cursor-pointer text-slate-600 dark:text-slate-300'}`}>
                        <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={unreadOnly && !debouncedSearch}
                            disabled={!!debouncedSearch}
                            onChange={(e) => {
                                setUnreadOnly(e.target.checked);
                                resetPaging();
                            }}
                        />
                        Unread only
                    </label>
                </div>

                <div className={`flex-1 overflow-y-auto ${listLoading && messages.length ? 'opacity-50' : ''}`}>
                    {listError ? (
                        <EmptyState
                            title="Could not load messages"
                            description={listError}
                            action={
                                <button type="button" className="btn btn-outline-primary btn-sm" onClick={refresh}>
                                    Try again
                                </button>
                            }
                        />
                    ) : listLoading && !messages.length ? (
                        <div className="space-y-3 p-4">
                            {Array.from({ length: 7 }).map((_, index) => (
                                <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
                            ))}
                        </div>
                    ) : !messages.length ? (
                        <EmptyState icon={<IconMail className="h-6 w-6" />} title={debouncedSearch || unreadOnly ? 'No messages match' : 'This folder is empty'} description={debouncedSearch ? 'Try a different search term.' : undefined} />
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-white/5">
                            {messages.map((item) => {
                                const who = showsRecipients ? people(item.to) || '(No recipient)' : item.from_name || item.from_email || '(Unknown sender)';
                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => openMessage(item.id)}
                                            className={`flex w-full gap-3 px-4 py-3 text-left transition ${item.id === selectedId ? 'bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}`}
                                        >
                                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-transparent' : 'bg-primary'}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-baseline justify-between gap-2">
                                                    <span className={`truncate text-sm ${item.is_read ? 'text-slate-600 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-white'}`}>
                                                        {showsRecipients && <span className="font-normal text-slate-400">To: </span>}
                                                        {who}
                                                    </span>
                                                    <span className="shrink-0 text-[11px] text-slate-400">{formatMailTime(item.received_at)}</span>
                                                </span>
                                                <span className={`flex items-center gap-1.5 text-[13px] ${item.is_read ? 'text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-100'}`}>
                                                    {item.importance === 'high' && <span className="font-bold text-rose-500">!</span>}
                                                    <span className="truncate">{item.subject}</span>
                                                    {item.flagged && <IconStar className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                                                    {item.has_attachments && <IconPaperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                                                </span>
                                                <span className="block truncate text-xs text-slate-400">{item.preview}</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs dark:border-white/5">
                    <button type="button" className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline" onClick={() => setPageIndex(pageIndex - 1)} disabled={pageIndex === 0 || listLoading}>
                        ← Newer
                    </button>
                    <span className="text-slate-400">Page {pageIndex + 1}</span>
                    <button type="button" className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline" onClick={goOlder} disabled={!nextCursor || listLoading}>
                        Older →
                    </button>
                </div>
            </section>

            {/* Reading pane */}
            <section className={`${PANEL} ${selectedId ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col overflow-hidden`}>
                {!selectedId ? (
                    <div className="m-auto">
                        <EmptyState icon={<IconMail className="h-6 w-6" />} title="Select a message to read" description="Choose a message from the list, or start a new one." />
                    </div>
                ) : detailLoading ? (
                    <div className="space-y-4 p-6">
                        <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                        <div className="h-10 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                        <div className="h-64 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                    </div>
                ) : !detail ? (
                    <div className="m-auto">
                        <EmptyState
                            title="Could not open this message"
                            description={detailError}
                            action={
                                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => openMessage(null)}>
                                    Back to list
                                </button>
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-2 dark:border-white/5">
                            <IconButton label="Back to list" className="lg:hidden" onClick={() => openMessage(null)}>
                                <IconArrowLeft className="h-4 w-4" />
                            </IconButton>
                            <button type="button" className="btn btn-primary btn-sm gap-1.5" onClick={() => setCompose({ mode: 'reply', source: detail })}>
                                <IconArrowBackward className="h-4 w-4" />
                                Reply
                            </button>
                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setCompose({ mode: 'reply_all', source: detail })}>
                                Reply all
                            </button>
                            <button type="button" className="btn btn-outline-primary btn-sm gap-1.5" onClick={() => setCompose({ mode: 'forward', source: detail })}>
                                Forward
                                <IconArrowForward className="h-4 w-4" />
                            </button>
                            <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-white/10 sm:block" />
                            <IconButton label={detail.is_read ? 'Mark as unread' : 'Mark as read'} onClick={() => toggleRead(detail)}>
                                <IconMail className="h-4 w-4" />
                            </IconButton>
                            <IconButton label={detail.flagged ? 'Remove flag' : 'Flag'} onClick={() => toggleFlag(detail)}>
                                <IconStar className={`h-4 w-4 ${detail.flagged ? 'fill-amber-400 text-amber-400' : ''}`} />
                            </IconButton>
                            {folder !== 'archive' && (
                                <IconButton label="Archive" onClick={() => archive(detail)}>
                                    <IconArchive className="h-4 w-4" />
                                </IconButton>
                            )}
                            <IconButton label={folder === 'deleteditems' ? 'Delete permanently' : 'Delete'} tone="danger" onClick={() => remove(detail)}>
                                <IconTrashLines className="h-4 w-4" />
                            </IconButton>
                            {detail.web_link && (
                                <a href={detail.web_link} target="_blank" rel="noopener noreferrer" className="ml-auto px-2 text-xs font-semibold text-primary hover:underline">
                                    Open in Outlook
                                </a>
                            )}
                        </div>

                        <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{detail.subject}</h2>
                            <div className="mt-3 flex items-start gap-3">
                                <Avatar name={detail.from_name || detail.from_email || '?'} />
                                <div className="min-w-0 flex-1 text-sm">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                                            {detail.from_name || detail.from_email}
                                            {detail.from_name && detail.from_email && <span className="ml-1.5 font-normal text-slate-400">&lt;{detail.from_email}&gt;</span>}
                                        </p>
                                        <p className="shrink-0 text-xs text-slate-400">{fullDate(detail.received_at || detail.sent_at)}</p>
                                    </div>
                                    {detail.to.length > 0 && <p className="truncate text-xs text-slate-500 dark:text-slate-400">To: {people(detail.to)}</p>}
                                    {detail.cc.length > 0 && <p className="truncate text-xs text-slate-500 dark:text-slate-400">Cc: {people(detail.cc)}</p>}
                                </div>
                            </div>
                            {detail.attachments.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-2">
                                    {detail.attachments.map((attachment) => (
                                        <li key={attachment.id}>
                                            <button
                                                type="button"
                                                onClick={() => download(detail, attachment.id)}
                                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs transition hover:border-primary/50 hover:bg-primary/5 dark:border-[#1b2e4b]"
                                                title={`Download ${attachment.name}`}
                                            >
                                                <IconDownload className="h-3.5 w-3.5 text-primary" />
                                                <span className="max-w-[200px] truncate font-medium text-slate-700 dark:text-slate-200">{attachment.name}</span>
                                                <span className="text-slate-400">{formatBytes(attachment.size)}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <iframe title="Message" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={frame} className="w-full flex-1 bg-white" />
                    </>
                )}
            </section>

            <ComposeDialog
                state={compose}
                onClose={() => setCompose(null)}
                onSent={() => {
                    setCompose(null);
                    if (folder === 'sentitems' || folder === 'drafts') refresh();
                    else loadFolders();
                }}
            />
        </div>
    );
};

export default OutlookMail;
