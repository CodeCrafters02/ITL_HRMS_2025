import React, { useEffect, useState } from 'react';
import ComponentCard from '../../components/common/ComponentCard';
import { Table, TableRow, TableCell } from '../../components/ui/table';
import { axiosInstance } from './api';

interface LearningCornerItem {
  id: number;
  title: string;
  description: string;
  image?: string | null;
  video?: string | null;
  document?: string | null;
}

const EmployeeLearningCorner: React.FC = () => {
  const [items, setItems] = useState<LearningCornerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axiosInstance.get('emp-learning-corner/')
      .then(res => {
        setItems(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load learning resources');
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <ComponentCard title="Learning Corner" desc="Company learning resources for employees.">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-red-600 text-center py-8">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No learning resources found.</div>
        ) : (
          <Table>
            <thead>
              <TableRow>
                <TableCell isHeader className="px-4 py-2 text-center font-semibold">S.No</TableCell>
                <TableCell isHeader className="px-4 py-2 text-left font-semibold">Title</TableCell>
                <TableCell isHeader className="px-4 py-2 text-left font-semibold">Description</TableCell>
                <TableCell isHeader className="px-4 py-2 text-center font-semibold">Image</TableCell>
                <TableCell isHeader className="px-4 py-2 text-center font-semibold">Document</TableCell>
                <TableCell isHeader className="px-4 py-2 text-center font-semibold">Video</TableCell>
              </TableRow>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 py-2 text-center font-medium text-gray-900 dark:text-white">{idx + 1}</TableCell>
                  <TableCell className="px-4 py-2 text-left font-medium text-gray-900 dark:text-white">{item.title}</TableCell>
                  <TableCell className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{item.description || '—'}</TableCell>
                  <TableCell className="px-4 py-2 text-center">
                    {item.image ? (
                      <a href={item.image} target="_blank" rel="noopener noreferrer">
                        <img src={item.image} alt="Learning" className="h-12 w-12 object-cover rounded mx-auto" />
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-center">
                    {item.document ? (
                      <a href={item.document} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Download</a>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-center">
                    {item.video ? (
                      <a href={item.video} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </ComponentCard>
    </div>
  );
};

export default EmployeeLearningCorner;
