import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ClassesReport: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main reports page with classes tab
    navigate('/management/reports?tab=classes', { replace: true });
  }, [navigate]);

  return null;
};

export default ClassesReport;

