import React from 'react';

export function ComparisonTable({
  columns = [],
  rows = [],
  highlightRowIndex = null,
  emptyMessage = 'তুলনা করার জন্য তথ্য পাওয়া যায়নি',
  className = '',
  style = {}
}) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #9aa5a0)', fontSize: '13px' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`ui-comparison-table-wrapper ${className}`} style={{
      width: '100%',
      overflowX: 'auto',
      borderRadius: 'var(--radius-md, 12px)',
      border: '1px solid var(--border-light, #222c36)',
      background: 'var(--bg-card, #161d23)',
      ...style
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        fontSize: '13px'
      }}>
        <thead>
          <tr style={{
            background: 'var(--bg-card-subtle, #1c242c)',
            borderBottom: '1px solid var(--border-medium, #2a3742)',
          }}>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  padding: '12px 16px',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted, #9aa5a0)',
                  textAlign: col.align || 'left',
                  width: col.width || 'auto'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => {
            const isHighlight = highlightRowIndex === rIdx || row._highlight;
            return (
              <tr
                key={row.id || rIdx}
                style={{
                  borderBottom: rIdx === rows.length - 1 ? 'none' : '1px solid var(--border-light, #222c36)',
                  background: isHighlight ? 'rgba(0, 223, 129, 0.08)' : (rIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'),
                  transition: 'background 140ms ease'
                }}
              >
                {columns.map((col, cIdx) => (
                  <td
                    key={col.key || cIdx}
                    style={{
                      padding: '12px 16px',
                      color: isHighlight && cIdx === 0 ? 'var(--primary, #00df81)' : 'var(--text-main, #e8ece9)',
                      fontWeight: isHighlight || col.bold ? 700 : 500,
                      textAlign: col.align || 'left'
                    }}
                  >
                    {col.render ? col.render(row[col.key], row, rIdx) : (row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
