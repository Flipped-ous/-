import React from 'react';
export function CompactEntry({ label, count, selected, onClick, className = '', ariaLabel }: {
 label: string; count: number; selected?: boolean; onClick?: () => void; className?: string; ariaLabel?: string;
}) {
 return <button type="button" className={`entry-card-button ${className}`} aria-label={ariaLabel || `${label} · ${count}`} aria-pressed={selected} onClick={onClick}>
   <span className="wrap-card-face"><span>{label}</span><small aria-hidden="true">{count>99?'99+':count}</small></span>
 </button>;
}
export function WrapUpButton({ count = 0, onClick }: { count?: number; onClick?: () => void }) {
 return <CompactEntry label="收工整理" count={count} onClick={onClick} className="wrap-card-button" ariaLabel={`收工整理，${count} 项待整理`} />;
}
