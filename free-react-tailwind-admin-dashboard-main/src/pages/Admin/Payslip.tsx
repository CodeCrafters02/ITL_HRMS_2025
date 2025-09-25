import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";


interface Payroll {
  employee_id: string;
  employee_name: string;
  designation?: string;
  department?: string;
  payroll_date: string;
  month?: string;
  year?: string;
  gross_salary: string | number;
  basic_salary: string | number;
  hra: string | number;
  conveyance: string | number;
  medical: string | number;
  special_allowance: string | number;
  service_charges: string | number;
  pf: string | number;
  income_tax: string | number;
  extra_allowances?: string | number;
  extra_deductions?: string | number;
  net_pay: string | number;
  total_working_days: number;
  days_paid: number;
  loss_of_pay_days: number;
}


import { axiosInstance } from "../Dashboard/api";
const Payslip: React.FC = () => {
  const [company, setCompany] = useState<{ name: string; logo_url: string | null }>({ name: '', logo_url: null });
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("employeeId");
  const batchId = searchParams.get("batchId");
  const payslipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch company info for logged-in user
    axiosInstance.get('app/company-update/')
      .then(res => {
        setCompany({
          name: res.data.name || 'Company Name',
          logo_url: res.data.logo_url || res.data.logo || null
        });
      })
      .catch(() => setCompany({ name: 'Company Name', logo_url: null }));
  }, []);

  useEffect(() => {
    if (employeeId && batchId) {
      axiosInstance.get(`app/payrolls/?batch_id=${batchId}`)
        .then(res => {
          const found = (res.data as Payroll[]).find((p) => p.employee_id == employeeId);
          setPayroll(found || null);
        })
        .catch(() => setPayroll(null));
    }
  }, [employeeId, batchId]);

  const formatCurrency = (amount: string | number) => {
    const num = parseFloat(amount as string);
    return isNaN(num) ? '₹0.00' : `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  if (!payroll) {
    return <div style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Loading payslip...</div>;
  }

  const handlePrint = () => {
    if (!payslipRef.current) return;
    const printContents = payslipRef.current.outerHTML;
    const printWindow = window.open('', '', 'height=800,width=900');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Payslip</title>');
      printWindow.document.write('<style>body{margin:0;padding:0;}@media print{@page{size:A4;margin:0;}} html,body{background:#f0f0f0;} .payslip-print{margin:40px auto;max-width:700px;}</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(printContents);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const totalDeductions = [payroll.pf, payroll.income_tax, payroll.extra_deductions || 0]
    .map((v) => typeof v === 'number' ? v : parseFloat(v || '0'))
    .reduce((sum, v) => sum + v, 0);

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', position: 'relative' }}>
      {/* Close Icon */}
      <button
        onClick={() => {
          
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/admin/payroll-batches', { replace: true });
          }
        }}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 16,
          left: 20,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          zIndex: 11,
          padding: 0
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="14" fill="#eee" />
          <path d="M9 9L19 19M19 9L9 19" stroke="#2d3748" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {/* Print Button */}
      <button
        onClick={handlePrint}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: '#2d3748',
          color: '#fff',
          padding: '8px 22px',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px #0001',
          zIndex: 10
        }}
      >
        Print
      </button>
  <div ref={payslipRef} className="payslip-print" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 40, fontFamily: 'serif' }}>
      {/* Company Logo and Name */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        {company.logo_url ? (
          <img src={company.logo_url} alt="Company Logo" style={{ height: 60, width: 60, objectFit: 'contain', marginRight: 16 }} />
        ) : (
          <div style={{ height: 60, width: 60, background: '#eee', marginRight: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#aaa', fontSize: 24 }}>
            LOGO
          </div>
        )}
        <div style={{ fontSize: 26, fontWeight: 700, color: '#2d3748', letterSpacing: 1 }}>{company.name}</div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Payslip</h2>
  <div style={{ fontSize: 18, color: '#555', marginTop: 8 }}>{payroll.month || ''} {payroll.year || ''}</div>
      </div>
      <div style={{ marginBottom: 32 }}>
  <div><strong>Employee Name:</strong> {payroll.employee_name}</div>
  <div><strong>Employee ID:</strong> {payroll.employee_id}</div>
  <div><strong>Designation:</strong> {payroll.designation || '-'}</div>
  <div><strong>Department:</strong> {payroll.department || '-'}</div>
  <div><strong>Pay Date:</strong> {formatDate(payroll.payroll_date)}</div>
  <div><strong>Total Working Days:</strong> {payroll.total_working_days}</div>
  <div><strong>Days Paid:</strong> {payroll.days_paid}</div>
  <div><strong>Loss of Pay Days:</strong> {payroll.loss_of_pay_days}</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
        <thead>
          <tr style={{ background: '#f8f8f8' }}>
            <th style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'left' }}>Earnings</th>
            <th style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>Amount</th>
            <th style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'left' }}>Deductions</th>
            <th style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>Basic</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.basic_salary)}</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>PF</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.pf)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>HRA</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.hra)}</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>Income Tax</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.income_tax)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>Conveyance</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.conveyance)}</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>Other Deductions</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.extra_deductions || 0)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>Medical</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.medical)}</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}></td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}></td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>Special Allowance</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.special_allowance)}</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}></td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}></td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>Service Charges</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.service_charges)}</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}></td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}></td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>Other Allowances</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right' }}>{formatCurrency(payroll.extra_allowances || 0)}</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}></td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8 }}></td>
          </tr>
          <tr style={{ background: '#f8f8f8' }}>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, fontWeight: 600 }}>Gross Salary</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(payroll.gross_salary)}</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, fontWeight: 600 }}>Total Deductions</td>
            <td style={{ border: '1px solid #e2e8f0', padding: 8, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(totalDeductions.toString())}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign: 'right', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Net Pay: {formatCurrency(payroll.net_pay)}
      </div>
      <div style={{ color: '#888', fontSize: 14, textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
        This is a system-generated payslip and does not require a signature.<br />
        For any queries regarding this payslip, please contact HR department.
      </div>
      </div>
    </div>
  );
};

export default Payslip;