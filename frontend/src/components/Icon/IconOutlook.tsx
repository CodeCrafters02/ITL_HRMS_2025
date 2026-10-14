import { FC } from 'react';

const IconOutlook: FC<{ className?: string; size?: number }> = ({ className, size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="8" y="4" width="14" height="16" rx="2" fill="#28A8EA" />
        <path d="M8 9l7 4.5L22 9v9a2 2 0 01-2 2H10a2 2 0 01-2-2V9z" fill="#0364B8" />
        <rect x="2" y="6.5" width="11" height="11" rx="1.5" fill="#0078D4" />
        <ellipse cx="7.5" cy="12" rx="2.6" ry="3.1" stroke="#fff" strokeWidth="1.6" />
    </svg>
);

export default IconOutlook;
