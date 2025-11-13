import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RevenueReport: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main reports page with revenue tab
    navigate('/management/reports?tab=revenue', { replace: true });
  }, [navigate]);

  return null;
};

export default RevenueReport;

