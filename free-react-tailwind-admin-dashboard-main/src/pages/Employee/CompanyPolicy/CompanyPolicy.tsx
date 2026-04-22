import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSearch from '../../../components/Icon/IconSearch';
import IconDownload from '../../../components/Icon/IconDownload';
import IconFile from '../../../components/Icon/IconFile';
import { CompanyPolicy, fetchCompanyPolicies } from './api';

const CompanyPolicyPage = () => {
    const dispatch = useDispatch();
    const [policies, setPolicies] = useState<CompanyPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const loadPolicies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCompanyPolicies();
            setPolicies(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load company policies';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        dispatch(setPageTitle('Company Policies'));
    }, [dispatch]);

    useEffect(() => {
        loadPolicies();
    }, [loadPolicies]);

    const visiblePolicies = useMemo(() => {
        const lowered = search.trim().toLowerCase();
        return policies.filter((policy) => !lowered || policy.name.toLowerCase().includes(lowered));
    }, [policies, search]);

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            <div className="panel bg-gradient-to-r from-[#0e1726] to-[#1b2e4b] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold">Company Policies</h1>
                        <p className="mt-1 text-white/80">Review and download official company policy documents.</p>
                    </div>
                    {/* <button type="button" className="btn btn-outline-light w-full md:w-auto" onClick={loadPolicies}>
                        Refresh
                    </button> */}
                </div>
            </div>

            {error && (
                <div className="panel border border-danger/30 bg-danger-light text-danger">
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="panel">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="relative w-full md:max-w-[360px]">
                        <input
                            type="text"
                            className="form-input pl-10"
                            placeholder="Search policies..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">
                            <IconSearch className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="text-sm text-white-dark">
                        Showing <span className="text-primary font-semibold">{visiblePolicies.length}</span> of{' '}
                        <span className="text-primary font-semibold">{policies.length}</span> policies
                    </div>
                </div>
            </div>

            <div className="panel">
                {loading ? (
                    <div className="py-12 text-center text-white-dark">Loading policies...</div>
                ) : visiblePolicies.length === 0 ? (
                    <div className="py-12 text-center text-white-dark">No policies found.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {visiblePolicies.map((policy) => (
                            <div key={policy.id} className="rounded-lg border border-white-light dark:border-[#1b2e4b] p-4 bg-white dark:bg-[#060818]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                                            <IconFile className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold break-words">{policy.name}</h3>
                                            <p className="text-xs text-white-dark mt-1">Policy ID: #{policy.id}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    {policy.document ? (
                                        <a href={policy.document} target="_blank" rel="noreferrer" className="btn btn-outline-primary w-full gap-2">
                                            <IconDownload className="w-4 h-4" />
                                            Download Policy
                                        </a>
                                    ) : (
                                        <div className="text-sm text-warning">Document not available</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyPolicyPage;
