import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import PageHeader from '../../components/Common/PageHeader';
import Button from '../../components/Common/Button';
import StatCard, { StatGrid } from '../../components/Common/StatCard';
import IconMenuComponents from '../../components/Icon/Menu/IconMenuComponents';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconChecks from '../../components/Icon/IconChecks';
import IconRefresh from '../../components/Icon/IconRefresh';
import { BrandTheme, DEFAULT_THEME, PRESET_THEMES, contrastOnWhite, randomTheme, themeFromPrimary, themeToApi, themeVars } from '../../theme/brandTheme';
import { loadBranding, saveBranding, useBranding } from '../../theme/brandingStore';

const Swatch = ({ t, size = 'md' }: { t: BrandTheme; size?: 'md' | 'lg' }) => (
    <span className={`flex overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 ${size === 'lg' ? 'h-12 w-full' : 'h-10 w-full'}`}>
        <span className="flex-[3]" style={{ background: t.primary }} />
        <span className="flex-[2]" style={{ background: t.mid }} />
        <span className="flex-[2]" style={{ background: t.accent }} />
    </span>
);

const AdminBranding = () => {
    const dispatch = useDispatch();
    const saved = useBranding();
    const isAdmin = localStorage.getItem('user_role') === 'admin';

    const [name, setName] = useState('');
    const [draft, setDraft] = useState<BrandTheme>(DEFAULT_THEME);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [customHex, setCustomHex] = useState('#0062E0');
    const [adjusted, setAdjusted] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        dispatch(setPageTitle('Branding & Theme'));
        loadBranding(); // always show the current saved name, logo and theme
    }, [dispatch]);

    // Initialise the form from the saved branding once it has loaded
    useEffect(() => {
        if (!saved.loaded && !saved.name) return;
        setName(saved.name);
        setDraft(saved.theme);
        setCustomHex(saved.theme.primary);
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(false);
    }, [saved.loaded, saved.name, saved.theme]);

    useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

    const shownLogo = removeLogo ? null : logoPreview || saved.logoUrl;
    const dirty =
        name.trim() !== saved.name ||
        !!logoFile ||
        removeLogo ||
        draft.key !== saved.theme.key ||
        draft.primary.toLowerCase() !== saved.theme.primary.toLowerCase() ||
        draft.mid.toLowerCase() !== saved.theme.mid.toLowerCase() ||
        draft.accent.toLowerCase() !== saved.theme.accent.toLowerCase();

    const previewVars = useMemo(() => themeVars(draft) as React.CSSProperties, [draft]);

    const pickPreset = (t: BrandTheme) => {
        setDraft(t);
        setCustomHex(t.primary);
        setAdjusted(false);
    };

    const onCustomColour = (hex: string) => {
        setCustomHex(hex);
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
            const t = themeFromPrimary(hex);
            setDraft(t);
            setAdjusted(t.primary.toLowerCase() !== hex.toLowerCase());
        }
    };

    const onRandom = () => {
        const t = randomTheme();
        setDraft(t);
        setCustomHex(t.primary);
        setAdjusted(false);
    };

    const onLogo = (file: File | null) => {
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
            Swal.fire('Unsupported file', 'Please choose a PNG, JPG, WebP or GIF image.', 'warning');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('File too large', 'The logo must be 2 MB or smaller.', 'warning');
            return;
        }
        setLogoFile(file);
        setRemoveLogo(false);
        setLogoPreview(URL.createObjectURL(file));
    };

    const discard = () => {
        setName(saved.name);
        setDraft(saved.theme);
        setCustomHex(saved.theme.primary);
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(false);
        setAdjusted(false);
    };

    const save = async () => {
        if (name.trim().length < 2) {
            Swal.fire('Company name required', 'Enter a company name of at least 2 characters.', 'warning');
            return;
        }
        setSaving(true);
        try {
            await saveBranding({ name: name.trim(), logo: logoFile, removeLogo, theme: themeToApi(draft) });
            Swal.fire({ title: 'Saved', text: 'Branding updated for everyone in your company.', icon: 'success', timer: 1800, showConfirmButton: false });
        } catch (e: any) {
            Swal.fire('Could not save', e?.message || 'Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) {
        return (
            <div>
                <PageHeader title="Branding & Theme" subtitle="Only company administrators can change the company name, logo and colours." icon={<IconMenuComponents />} />
            </div>
        );
    }

    const isDefault = draft.key === 'default';

    return (
        <div>
            <PageHeader
                title="Branding & Theme"
                subtitle="Set your company name, logo and the colour combination used across the whole dashboard. Changes apply to everyone in your company."
                icon={<IconMenuComponents />}
                actions={
                    <>
                        <Button variant="secondary" onClick={discard} disabled={!dirty || saving}>
                            Discard
                        </Button>
                        <Button onClick={save} loading={saving} disabled={!dirty}>
                            Save changes
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                {/* ───────── left: identity + theme picker ───────── */}
                <div className="space-y-6 xl:col-span-3">
                    {/* Company identity */}
                    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] sm:p-6">
                        <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-slate-900">
                            <span className="h-2 w-2 rounded-full bg-brand ring-4 ring-brand/20" /> Company identity
                        </h3>
                        <div className="flex flex-col gap-5 sm:flex-row">
                            <div className="shrink-0">
                                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                                    {shownLogo ? (
                                        <img src={shownLogo} alt="Company logo" className="h-full w-full object-contain p-2" />
                                    ) : (
                                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-mid text-2xl font-extrabold uppercase text-white shadow-md">{(name || 'C').charAt(0)}</span>
                                    )}
                                </div>
                                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => onLogo(e.target.files?.[0] || null)} />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Company name</label>
                                    <input className="form-input h-11 rounded-xl" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Your company name" />
                                </div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                                        {shownLogo ? 'Replace logo' : 'Upload logo'}
                                    </Button>
                                    {(saved.logoUrl || logoFile) && !removeLogo && (
                                        <Button size="sm" variant="outline-danger" onClick={() => { setLogoFile(null); setLogoPreview(null); setRemoveLogo(true); }}>
                                            Remove logo
                                        </Button>
                                    )}
                                    {removeLogo && (
                                        <Button size="sm" variant="ghost" onClick={() => setRemoveLogo(false)}>
                                            Undo remove
                                        </Button>
                                    )}
                                    <span className="text-[11px] font-medium text-slate-400">PNG, JPG, WebP or GIF · up to 2 MB · square works best</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Theme picker */}
                    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] sm:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h3 className="flex items-center gap-2.5 text-base font-bold text-slate-900">
                                <span className="h-2 w-2 rounded-full bg-brand ring-4 ring-brand/20" /> Colour combination
                            </h3>
                            <Button size="sm" variant="secondary" leftIcon={<IconRefresh />} onClick={onRandom}>
                                Surprise me
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {PRESET_THEMES.map((t) => {
                                const active = draft.key === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => pickPreset(t)}
                                        aria-pressed={active}
                                        className={`group relative rounded-2xl border p-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 ${
                                            active ? 'border-brand bg-brand-50/60 shadow-md ring-2 ring-brand/25' : 'border-slate-200 bg-white'
                                        }`}
                                    >
                                        <Swatch t={t} />
                                        <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
                                            <span className="truncate text-xs font-bold text-slate-800">{t.name.replace(' (Default)', '')}</span>
                                            {t.key === 'default' && <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-brand">Default</span>}
                                        </div>
                                        {active && (
                                            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white shadow">
                                                <IconChecks className="h-3 w-3" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* custom */}
                        <div className={`mt-4 rounded-2xl border p-3.5 transition-colors ${draft.key === 'custom' ? 'border-brand bg-brand-50/60 ring-2 ring-brand/25' : 'border-slate-200'}`}>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[140px] flex-1">
                                    <p className="text-xs font-bold text-slate-800">Custom colour</p>
                                    <p className="text-[11px] font-medium text-slate-400">Pick any colour — we build the matching combination.</p>
                                </div>
                                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : '#0062E0'} onChange={(e) => onCustomColour(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" aria-label="Pick a custom colour" />
                                <input className="form-input h-10 w-28 rounded-xl font-mono text-xs uppercase" value={customHex} maxLength={7} onChange={(e) => onCustomColour(e.target.value)} />
                            </div>
                            {adjusted && <p className="mt-2 text-[11px] font-semibold text-amber-600">That colour was darkened slightly so white button text stays readable.</p>}
                        </div>

                        <p className="mt-3 text-[11px] font-medium text-slate-400">
                            Selected: <span className="font-bold text-slate-600">{isDefault ? 'Innovyx Blue (Default)' : draft.name}</span> · contrast with white text {contrastOnWhite(draft.primary).toFixed(1)}:1
                        </p>
                    </section>

                    {!isDefault && (
                        <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => pickPreset(DEFAULT_THEME)}>
                                Reset to default theme
                            </Button>
                        </div>
                    )}
                </div>

                {/* ───────── right: live preview ───────── */}
                <div className="xl:col-span-2">
                    <div className="sticky top-24">
                        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">Live preview</p>
                        <div style={previewVars} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-[#fafafa] shadow-lg">
                            {/* mini top bar */}
                            <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2">
                                {shownLogo ? <img src={shownLogo} alt="" className="h-7 w-7 rounded-md border border-slate-200 bg-white object-contain p-0.5" /> : <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand to-brand-mid text-xs font-extrabold uppercase text-white">{(name || 'C').charAt(0)}</span>}
                                <span className="truncate text-sm font-bold text-slate-800">{name || 'Your company'}</span>
                            </div>
                            <div className="flex">
                                {/* mini sidebar */}
                                <div className="hidden w-32 shrink-0 space-y-1 border-r border-slate-200 bg-white p-2 sm:block">
                                    {['Dashboard', 'Employees', 'Attendance', 'Payroll'].map((l, i) => (
                                        <div key={l} className={`relative flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] font-semibold ${i === 1 ? 'bg-brand/[0.08] text-brand' : 'text-slate-500'}`}>
                                            {i === 1 && <span className="absolute -left-2 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
                                            <span className={`flex h-5 w-5 items-center justify-center rounded-md ${i === 1 ? 'bg-gradient-to-br from-brand to-brand-mid text-white' : 'bg-slate-100'}`} />
                                            {l}
                                        </div>
                                    ))}
                                </div>
                                <div className="min-w-0 flex-1 space-y-3 p-3">
                                    <PageHeader className="!mb-0" title="Employees" subtitle="Manage your workforce" icon={<IconUsersGroup />} />
                                    <StatGrid cols={2} className="!mb-0">
                                        <StatCard label="Present" value="128" tone="primary" icon={<IconChecks />} />
                                        <StatCard label="On leave" value="12" tone="warning" icon={<IconUsersGroup />} />
                                    </StatGrid>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button size="sm">Primary</Button>
                                        <Button size="sm" variant="outline">Outline</Button>
                                        <Button size="sm" variant="secondary">Secondary</Button>
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                        <div className="h-1 bg-gradient-to-r from-brand via-brand-mid to-brand-accent" />
                                        <div className="border-b-2 border-brand-200 bg-brand-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-950">Name · Role</div>
                                        {['Asha Verma · HR', 'Rohan Das · Engineer'].map((r) => (
                                            <div key={r} className="px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-brand-50/50">{r}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="mt-2 px-1 text-[11px] font-medium text-slate-400">Nothing changes for your team until you click “Save changes”.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBranding;
