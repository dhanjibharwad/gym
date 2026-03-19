'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Upload, 
  Users, 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  Dumbbell,
  FileText,
  ArrowRight,
  Settings
} from 'lucide-react';
import Toast from '@/app/components/Toast';
import { PageGuard } from '@/components/rbac/PageGuard';

interface ImportedMember {
  id: number;
  member_number: string;
  full_name: string;
  phone_number: string;
  email?: string;
  hasMembership: boolean;
}

interface MembershipPlan {
  id: number;
  plan_name: string;
  duration_months: number;
  price: number;
}

interface PaymentMode {
  name: string;
  processingFee: number;
}

const BulkImportPage = () => {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [importedMembers, setImportedMembers] = useState<ImportedMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Form states
  const [selectedPlan, setSelectedPlan] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [trainerAssigned, setTrainerAssigned] = useState('');
  const [batchTime, setBatchTime] = useState('Flexible');
  const [processPayment, setProcessPayment] = useState(false);
  const [baseAmount, setBaseAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({show: false, message: '', type: 'success'});
  const [importResults, setImportResults] = useState<{importedCount: number, skippedCount: number, errors?: string[]} | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchPaymentModes();
  }, []);

  useEffect(() => {
    const step = searchParams.get('step');
    if (step === 'assign') {
      (async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/members/without-membership');
          const data = await response.json();
          if (data.success) {
            const mappedMembers: ImportedMember[] = (data.members || []).map((m: any) => ({
              id: m.id,
              member_number: m.member_number,
              full_name: m.full_name,
              phone_number: m.phone_number,
              email: m.email || undefined,
              hasMembership: false,
            }));
            setImportedMembers(mappedMembers);
            setSelectedMembers(mappedMembers.map(m => m.id));
            setCurrentStep(2);
          }
        } catch (error) {
          console.error('Error loading members without membership:', error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedPlan) {
      const plan = plans.find(p => p.id.toString() === selectedPlan);
      if (plan) {
        const planPrice = Number(plan.price) || 0;
        setBaseAmount(planPrice);
      }
    }
  }, [selectedPlan, plans]);

  useEffect(() => {
    if (!baseAmount) return;
    const selectedMode = paymentModes.find(m => m.name === paymentMode);
    const feePct = Number(selectedMode?.processingFee) || 0;
    const calculated = baseAmount + (baseAmount * feePct / 100);
    setTotalAmount(Number(calculated.toFixed(2)));
  }, [paymentMode, paymentModes, baseAmount]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/members/bulk-membership');
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchPaymentModes = async () => {
    try {
      const response = await fetch('/api/settings/payment-modes');
      const data = await response.json();
      if (data.success) {
        setPaymentModes(data.paymentModes);
      }
    } catch (error) {
      console.error('Error fetching payment modes:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({show: true, message, type});
    setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'excel');

      const response = await fetch('/api/members/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setImportResults({
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
          errors: result.errors
        });
        
        if (result.importedCount > 0) {
          // Fetch the newly imported members
          await fetchImportedMembers();
          setCurrentStep(2);
          showToast(`Successfully imported ${result.importedCount} members`, 'success');
        } else {
          showToast('No members were imported', 'error');
        }
      } else {
        showToast(result.message || 'Import failed', 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      showToast('Import failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const fetchImportedMembers = async () => {
    try {
      const response = await fetch('/api/members/recent-imported');
      const data = await response.json();
      if (data.success) {
        setImportedMembers(data.members);
      }
    } catch (error) {
      console.error('Error fetching imported members:', error);
    }
  };

  const toggleMemberSelection = (memberId: number) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    if (selectedMembers.length === importedMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(importedMembers.map(m => m.id));
    }
  };

  const handleBulkAssignment = async () => {
    if (selectedMembers.length === 0) {
      showToast('Please select at least one member', 'error');
      return;
    }

    if (!selectedPlan) {
      showToast('Please select a membership plan', 'error');
      return;
    }

    if (processPayment && !paymentMode) {
      showToast('Please select a payment mode', 'error');
      return;
    }

    setProcessing(true);
    try {
      const membersData = selectedMembers.map(memberId => ({ memberId }));
      
      const requestBody = {
        members: membersData,
        membership: {
          planId: parseInt(selectedPlan),
          startDate,
          trainerAssigned,
          batchTime,
        },
        payment: processPayment ? {
          totalAmount,
          amountPaid,
          paymentMode,
          referenceNumber,
          nextDueDate
        } : undefined,
        assignMembership: true,
        processPayment
      };

      const response = await fetch('/api/members/bulk-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        showToast(`Successfully processed ${result.successCount} members`, 'success');
        if (result.errorCount > 0) {
          console.error('Some errors occurred:', result.errors);
        }
        // Reset and go back to step 1
        setCurrentStep(1);
        setImportedMembers([]);
        setSelectedMembers([]);
        setImportResults(null);
      } else {
        showToast(result.message || 'Assignment failed', 'error');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      showToast('Assignment failed. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const calculateEndDate = () => {
    if (!selectedPlan) return '';
    const plan = plans.find(p => p.id.toString() === selectedPlan);
    if (!plan) return '';
    
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + plan.duration_months);
    return start.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({show: false, message: '', type: 'success'})} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Member Import</h1>
        <p className="text-gray-600 mt-1">Import members from Excel and assign memberships</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-2xl">
        <div className={`flex items-center ${currentStep >= 1 ? 'text-orange-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>
            <Upload className="w-4 h-4" />
          </div>
          <span className="ml-2 font-medium">Import Members</span>
        </div>
        <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-orange-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center ${currentStep >= 2 ? 'text-orange-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>
            <Dumbbell className="w-4 h-4" />
          </div>
          <span className="ml-2 font-medium">Assign Membership</span>
        </div>
      </div>

      {/* Step 1: Import Members */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Import Members</h2>
                <p className="text-sm text-slate-600">Upload Excel file with member details</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-orange-500 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-700 mb-2">
                  {uploading ? 'Uploading...' : 'Click to upload Excel file'}
                </p>
                <p className="text-sm text-slate-500">
                  Supports .xlsx and .xls files
                </p>
              </label>
            </div>

            {importResults && (
              <div className="mt-6 bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2">Import Results</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-slate-700">
                      {importResults.importedCount} members imported successfully
                    </span>
                  </div>
                  {importResults.skippedCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-slate-700">
                        {importResults.skippedCount} records skipped
                      </span>
                    </div>
                  )}
                  {importResults.errors && importResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                      {importResults.errors.slice(0, 3).map((error, index) => (
                        <p key={index} className="text-xs text-red-600">{error}</p>
                      ))}
                      {importResults.errors.length > 3 && (
                        <p className="text-xs text-red-600">...and {importResults.errors.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Assign Membership */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Member Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Select Members</h2>
                    <p className="text-sm text-slate-600">Choose members to assign membership</p>
                  </div>
                </div>
                <button
                  onClick={selectAllMembers}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                >
                  {selectedMembers.length === importedMembers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {importedMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMemberSelection(member.id)}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{member.full_name}</p>
                      <p className="text-sm text-slate-600">{member.member_number} • {member.phone_number}</p>
                    </div>
                    {member.hasMembership && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Has Membership</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Membership Assignment */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Membership Details</h2>
                  <p className="text-sm text-slate-600">Assign membership plan to selected members</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Membership Plan <span className="text-orange-600">*</span>
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select a plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.plan_name} - ₹{plan.price} ({plan.duration_months} months)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Start Date <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Trainer Assigned
                  </label>
                  <input
                    type="text"
                    value={trainerAssigned}
                    onChange={(e) => setTrainerAssigned(e.target.value)}
                    placeholder="Enter trainer name"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Batch Time
                  </label>
                  <select
                    value={batchTime}
                    onChange={(e) => setBatchTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                  >
                    <option value="Flexible">Flexible</option>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
              </div>

              {selectedPlan && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">End Date:</span> {calculateEndDate()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Processing */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Payment Processing</h2>
                  <p className="text-sm text-slate-600">Optional: Process payments for memberships</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="processPayment"
                  checked={processPayment}
                  onChange={(e) => setProcessPayment(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="processPayment" className="font-medium text-slate-700">
                  Process payments for these memberships
                </label>
              </div>

              {processPayment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Total Amount <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Amount Paid
                    </label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Payment Mode <span className="text-orange-600">*</span>
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select payment mode</option>
                      {paymentModes.map((mode) => (
                        <option key={mode.name} value={mode.name}>
                          {mode.name} {mode.processingFee > 0 ? `(+${mode.processingFee}% fee)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Transaction reference"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {amountPaid > 0 && amountPaid < totalAmount && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Next Due Date
                      </label>
                      <input
                        type="date"
                        value={nextDueDate}
                        onChange={(e) => setNextDueDate(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
            >
              Back to Import
            </button>
            <button
              onClick={handleBulkAssignment}
              disabled={processing || selectedMembers.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? 'Processing...' : 'Assign Membership'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function BulkImportPageWrapper() {
  return (
    <PageGuard>
      <BulkImportPage />
    </PageGuard>
  );
}
