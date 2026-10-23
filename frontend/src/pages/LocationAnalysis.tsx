// Location analysis is now integrated into the main dashboard
// This page redirects to maintain backward compatibility
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LocationAnalysis() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eco-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
