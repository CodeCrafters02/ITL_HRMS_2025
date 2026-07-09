import React from 'react';

interface PaginationProps {
    page: number;
    totalPages: number;
    setPage: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, setPage }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | 'left-ellipsis' | 'right-ellipsis')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            let start = Math.max(2, page - 1);
            let end = Math.min(totalPages - 1, page + 1);

            if (page <= 3) {
                end = 4;
            } else if (page >= totalPages - 2) {
                start = totalPages - 3;
            }

            if (start > 2) {
                pages.push('left-ellipsis');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i as number);
            }

            if (end < totalPages - 1) {
                pages.push('right-ellipsis');
            }

            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <ul className="inline-flex items-center space-x-1 font-semibold">
            <li>
                <button
                    type="button"
                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setPage(page > 1 ? page - 1 : 1)}
                    disabled={page === 1}
                >
                    Prev
                </button>
            </li>
            {getPageNumbers().map((p, idx) => {
                if (p === 'left-ellipsis') {
                    return (
                        <li key={`left-ellipsis-${idx}`}>
                            <button
                                type="button"
                                title="Previous 3 pages"
                                className="flex justify-center font-semibold px-3 py-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary cursor-pointer"
                                onClick={() => setPage(Math.max(1, page - 3))}
                            >
                                ...
                            </button>
                        </li>
                    );
                }
                if (p === 'right-ellipsis') {
                    return (
                        <li key={`right-ellipsis-${idx}`}>
                            <button
                                type="button"
                                title="Next 3 pages"
                                className="flex justify-center font-semibold px-3 py-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary cursor-pointer"
                                onClick={() => setPage(Math.min(totalPages, page + 3))}
                            >
                                ...
                            </button>
                        </li>
                    );
                }
                return (
                    <li key={p}>
                        <button
                            type="button"
                            className={`flex justify-center font-semibold px-3.5 py-2 rounded-full transition ${
                                page === p
                                    ? 'bg-primary text-white shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]'
                                    : 'bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary'
                            }`}
                            onClick={() => setPage(p)}
                        >
                            {p}
                        </button>
                    </li>
                );
            })}
            <li>
                <button
                    type="button"
                    className="flex justify-center font-semibold p-2 rounded-full transition bg-white-light text-dark hover:text-white hover:bg-primary dark:text-white-light dark:bg-[#191e3a] dark:hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                    disabled={page === totalPages || totalPages === 0}
                >
                    Next
                </button>
            </li>
        </ul>
    );
};
