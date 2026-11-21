import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getChallanById } from '../utils/storage';
import ChallanForm from '../components/ChallanForm';

export default function NewChallan({ onSave, triggerDirectPrint, triggerPdfDownload }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchChallan = async () => {
        setLoading(true);
        const data = await getChallanById(id);
        if (data) {
          setChallan(data);
        } else {
          alert("Challan not found!");
          navigate('/');
        }
        setLoading(false);
      };
      fetchChallan();
    } else {
      setChallan(null);
    }
  }, [id, navigate]);

  const handleSave = (formData, printAfterSave) => {
    onSave(formData, id, printAfterSave);
  };

  const handleCancel = () => {
    if (id) {
      navigate(`/view/${id}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="text-slate-500 font-medium">Loading challan details...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChallanForm 
        initialData={challan} 
        preselectedCustomer={location.state?.preselectedCustomer}
        onSave={handleSave} 
        onCancel={handleCancel}
        triggerDirectPrint={triggerDirectPrint}
        triggerPdfDownload={triggerPdfDownload}
      />
    </div>
  );
}
