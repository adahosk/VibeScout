
import React from 'react';
import { ComparisonMatrix } from '../types';

interface ComparisonTableProps {
  matrix: ComparisonMatrix;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ matrix }) => {
  // Defensive check: if matrix or its required arrays are missing, don't render
  if (!matrix || !Array.isArray(matrix.headers) || !Array.isArray(matrix.rows)) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden my-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Feature</th>
              {matrix.headers.map((header, i) => (
                <th key={i} className="p-4 text-sm font-bold text-slate-800 border-b border-slate-100 min-w-[140px]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="p-4 text-xs font-bold text-slate-500 border-b border-slate-50">{row.feature}</td>
                {Array.isArray(row.values) ? row.values.map((val, j) => (
                  <td key={j} className="p-4 text-sm text-slate-700 border-b border-slate-50 font-medium">
                    {val}
                  </td>
                )) : (
                  <td colSpan={matrix.headers.length} className="p-4 text-sm text-slate-400 border-b border-slate-50 italic">
                    Data unavailable
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonTable;
