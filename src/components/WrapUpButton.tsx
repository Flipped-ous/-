import React from 'react';

export function WrapUpButton({ count = 0, onClick }: { count?: number; onClick?: () => void }) {
  return <button type="button" className="wrap-card-button" onClick={onClick}
    aria-label={`收工整理，${count} 项待整理`} title={`收工整理 · ${count} 项待整理`}>
    <span className="wrap-card-face"><span>收工整理</span>
      {count > 0 && <small aria-hidden="true">{count > 99 ? '99+' : count}</small>}
    </span>
  </button>;
}
