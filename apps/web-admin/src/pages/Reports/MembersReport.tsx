import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MembersReport: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main reports page with members tab
    navigate('/management/reports?tab=members', { replace: true });
  }, [navigate]);

  return null;
};

export default MembersReport;

