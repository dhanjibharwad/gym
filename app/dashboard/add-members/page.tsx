'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  AlertCircle, 
  CreditCard,
  Dumbbell,
  FileText,
  Camera,
  Users,
  Briefcase,
  UserCheck
} from 'lucide-react';

// Type definitions
interface FormData {
  // Serial Number
  serialNumber: string;
  serialNumberType: 'new' | 'existing';
  
  // Personal Information
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  occupation: string;
  dateOfBirth: string;
  age: number;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  profilePhoto: File | null;
  
  // Membership Details
  selectedPlan: string;
  planStartDate: string;
  planEndDate: string;
  trainerAssigned: string;
  batchTime: 'Morning' | 'Evening' | 'Flexible' | '';
  membershipTypes: string[];
  referenceOfAdmission: string;
  notes: string;
  
  // Medical & Notes
  medicalConditions: string;
  injuriesLimitations: string;
  additionalNotes: string;
  
  // Payment Information
  totalPlanFee: number;
  amountPaidNow: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Online' | 'Cheque' | '';
  nextDueDate: string;
}

interface FormErrors {
  [key: string]: string;
}

interface MembershipPlan {
  id: number;
  plan_name: string;
  duration_months: number;
  price: number;
  created_at: string;
}

interface StaffMember {
  id: number;
  name: string;
  role: 'Manager' | 'Trainer' | 'Receptionist';
}

const AddMemberPage = () => {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [showSuccess, setShowSuccess] = useState(false);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({show: false, message: '', type: 'success'});
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  
  const [paymentModes, setPaymentModes] = useState<{name: string, processingFee: number}[]>([]);
  const [paymentModesLoading, setPaymentModesLoading] = useState(true);
  const [basePlanFee, setBasePlanFee] = useState(0);
  
  const [formData, setFormData] = useState<FormData>({
    serialNumber: '',
    serialNumberType: 'new',
    fullName: '',
    phoneNumber: '',
    email: '',
    gender: '',
    occupation: '',
    dateOfBirth: '',
    age: 0,
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    profilePhoto: null,
    selectedPlan: '',
    planStartDate: today,
    planEndDate: '',
    trainerAssigned: '',
    batchTime: 'Flexible',
    membershipTypes: [],
    referenceOfAdmission: '',
    notes: '',
    medicalConditions: '',
    injuriesLimitations: '',
    additionalNotes: '',
    totalPlanFee: 0,
    amountPaidNow: 0,
    paymentMode: '',
    nextDueDate: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Memoized plans map for performance
  const plansMap = useMemo(() => {
    return new Map(plans.map(plan => [plan.id.toString(), plan]));
  }, [plans]);

  // Calculate course end date
  const calculateEndDate = (startDate: string, planId: string): string => {
    if (!startDate || !planId) return '';
    const selectedPlan = plansMap.get(planId);
    if (!selectedPlan) return '';
    
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + selectedPlan.duration_months);
    return start.toISOString().split('T')[0];
  };

  // Format date to DD-MM-YYYY
  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      serialNumber: '',
      serialNumberType: 'new',
      fullName: '',
      phoneNumber: '',
      email: '',
      gender: '',
      occupation: '',
      dateOfBirth: '',
      age: 0,
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      profilePhoto: null,
      selectedPlan: '',
      planStartDate: today,
      planEndDate: '',
      trainerAssigned: '',
      batchTime: 'Flexible',
      membershipTypes: [],
      referenceOfAdmission: '',
      notes: '',
      medicalConditions: '',
      injuriesLimitations: '',
      additionalNotes: '',
      totalPlanFee: 0,
      amountPaidNow: 0,
      paymentMode: '',
      nextDueDate: ''
    });
    setErrors({});
    setPhotoPreview('');
  };
  
  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({show: true, message, type});
    setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
  };
  
  // Fetch membership plans
  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/membership-plans');
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.plans);
        console.log('Fetched plans:', data.plans);
      } else {
        console.error('Failed to fetch plans:', data.message);
        showToast('Failed to load membership plans', 'error');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      showToast('Error loading membership plans', 'error');
    } finally {
      setPlansLoading(false);
    }
  };

  // Fetch enabled payment modes
  const fetchPaymentModes = async () => {
    try {
      const response = await fetch('/api/settings/payment-modes');
      const data = await response.json();
      
      if (data.success) {
        setPaymentModes(data.paymentModes);
        console.log('Fetched payment modes:', data.paymentModes);
      } else {
        console.error('Failed to fetch payment modes:', data.message);
        showToast('Failed to load payment modes', 'error');
      }
    } catch (error) {
      console.error('Error fetching payment modes:', error);
      showToast('Error loading payment modes', 'error');
    } finally {
      setPaymentModesLoading(false);
    }
  };

  // Add window focus event to refresh payment modes when user returns to tab
  useEffect(() => {
    const handleFocus = () => {
      fetchPaymentModes();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  
  useEffect(() => {
    fetchPlans();
    fetchPaymentModes();
  }, []);

  // Handle input changes
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      
      if (name === 'membershipTypes') {
        const checkboxValue = (e.target as HTMLInputElement).value;
        setFormData(prev => ({
          ...prev,
          membershipTypes: checked 
            ? [...prev.membershipTypes, checkboxValue]
            : prev.membershipTypes.filter(type => type !== checkboxValue)
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      // Convert numeric fields to numbers
      let processedValue: string | number = value;
      if (name === 'totalPlanFee' || name === 'amountPaidNow') {
        processedValue = value === '' ? 0 : parseFloat(value) || 0;
      }
      
      // Auto-calculate age when date of birth changes
      if (name === 'dateOfBirth' && value) {
        const calculatedAge = calculateAge(value);
        setFormData(prev => ({ ...prev, dateOfBirth: value, age: calculatedAge }));
        return;
      }
      
      // Auto-fill total plan fee and calculate end date when plan is selected
      if (name === 'selectedPlan' && value) {
        const selectedPlan = plansMap.get(value);
        if (selectedPlan) {
          const endDate = calculateEndDate(formData.planStartDate, value);
          setBasePlanFee(selectedPlan.price);
          
          // Calculate with current payment mode if selected
          let totalFee = selectedPlan.price;
          if (formData.paymentMode) {
            const selectedMode = paymentModes.find(mode => mode.name === formData.paymentMode);
            if (selectedMode) {
              const processingFee = (selectedPlan.price * selectedMode.processingFee) / 100;
              totalFee = selectedPlan.price + processingFee;
            }
          }
          
          setFormData(prev => ({ 
            ...prev, 
            selectedPlan: value,
            totalPlanFee: Math.round(totalFee),
            planEndDate: endDate
          }));
          return;
        }
      }
      
      // Recalculate total fee when payment mode changes
      if (name === 'paymentMode' && value) {
        const selectedMode = paymentModes.find(mode => mode.name === value);
        const currentBaseFee = basePlanFee > 0 ? basePlanFee : formData.totalPlanFee;
        
        if (selectedMode && currentBaseFee > 0) {
          const processingFee = (currentBaseFee * selectedMode.processingFee) / 100;
          const totalWithFee = currentBaseFee + processingFee;
          
          setFormData(prev => ({ 
            ...prev, 
            paymentMode: value as FormData['paymentMode'],
            totalPlanFee: Math.round(totalWithFee) 
          }));
          return;
        }
      }
      
      // Recalculate end date when start date changes
      if (name === 'planStartDate' && value && formData.selectedPlan) {
        const endDate = calculateEndDate(value, formData.selectedPlan);
        setFormData(prev => ({ ...prev, planStartDate: value, planEndDate: endDate }));
        return;
      }
      
      // Default update for other fields
      setFormData(prev => ({ ...prev, [name]: processedValue }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle photo upload
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        showToast('File size must be less than 5MB', 'error');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPG, PNG, or GIF)', 'error');
        return;
      }
      
      setFormData(prev => ({ ...prev, profilePhoto: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate payment status
  const getPaymentStatus = (): string => {
    if (formData.amountPaidNow === 0) return 'Pending';
    if (formData.amountPaidNow >= formData.totalPlanFee) return 'Full';
    return 'Partial';
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields validation
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.selectedPlan) newErrors.selectedPlan = 'Please select a plan';
    if (!formData.planStartDate) newErrors.planStartDate = 'Start date is required';
    if (formData.amountPaidNow < 0) newErrors.amountPaidNow = 'Payment amount cannot be negative';
    
    // Payment mode validation
    if (!formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required';
    } else if (!paymentModes.find(mode => mode.name === formData.paymentMode)) {
      newErrors.paymentMode = 'Selected payment mode is not available';
    }

    // Phone number format validation
    const phoneRegex = /^[0-9]{10}$/;
    if (formData.phoneNumber && !phoneRegex.test(formData.phoneNumber.replace(/[^0-9]/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
    }

    // Email validation (if provided)
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Amount validation - ensure both values are numbers
    const totalFee = Number(formData.totalPlanFee) || 0;
    const paidAmount = Number(formData.amountPaidNow) || 0;
    
    if (paidAmount > totalFee) {
      newErrors.amountPaidNow = 'Amount paid cannot exceed total plan fee';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        // Create FormData for file upload support
        const formDataToSend = new FormData();
        
        // Convert plan ID to plan name before sending to API
        const selectedPlanId = formData.selectedPlan;
        const selectedPlan = plansMap.get(selectedPlanId);
        const planName = selectedPlan ? selectedPlan.plan_name : '';
        
        // Validate plan selection before sending
        if (!planName) {
          showToast('Please select a valid membership plan', 'error');
          return;
        }
        
        // Add all form fields with proper type conversion
        Object.entries(formData).forEach(([key, value]) => {
          if (key !== 'profilePhoto') {
            if (key === 'selectedPlan') {
              formDataToSend.append(key, planName);
            } else if (typeof value === 'boolean') {
              formDataToSend.append(key, value.toString());
            } else {
              formDataToSend.append(key, value?.toString() || '');
            }
          }
        });
        
        // Debug logging
        console.log('Selected Plan ID:', selectedPlanId);
        console.log('Selected Plan Name:', planName);
        console.log('Available Plans:', plans.map(p => ({ id: p.id, name: p.plan_name })));
        console.log('Plans array length:', plans.length);
        console.log('FormData selectedPlan value:', formData.selectedPlan);
        
        // Add profile photo if exists
        if (formData.profilePhoto) {
          formDataToSend.append('profilePhoto', formData.profilePhoto);
        }

        const response = await fetch('/api/members/register', {
          method: 'POST',
          body: formDataToSend,
        });

        const result = await response.json();

        if (result.success) {
          setMemberId(result.memberId);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setMemberId(null);
            resetForm();
          }, 2000);
        } else {
          // Handle specific error messages
          if (result.message.includes('phone_number')) {
            setErrors({ phoneNumber: 'Phone number already exists' });
          } else if (result.message.includes('email')) {
            setErrors({ email: 'Email already exists' });
          } else {
            showToast(result.message, 'error');
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
      }
    } else {
      // Scroll to first error
      const firstErrorElement = document.querySelector('[data-error="true"]');
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const showNextDueDate = formData.amountPaidNow > 0 && formData.amountPaidNow < formData.totalPlanFee;

  // Prevent scroll on number inputs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-24 right-6 z-50 max-w-sm w-full transform transition-all duration-300 ${
          toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className={`rounded-xl p-4 shadow-lg border-l-4 ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-800' 
              : 'bg-red-50 border-red-500 text-red-800'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {toast.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{toast.message}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setToast({show: false, message: '', type: 'success'})}
                  className="inline-flex text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Member Added Successfully!</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                New member has been registered to <span className="font-semibold text-orange-600">GYM FLEX</span>!
              </p>
              
              <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-600 mb-1">Member ID</p>
                <p className="text-lg font-bold text-slate-900">#GF{memberId}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Member</h1>
          <p className="text-gray-600 mt-1">Register a new gym member with complete details</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: Personal Information */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                <p className="text-sm text-slate-600">Basic member details</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  data-error={!!errors.fullName}
                  className={`w-full px-4 py-3 bg-white border ${
                    errors.fullName ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                  placeholder="Enter full name"
                />
                {errors.fullName && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    maxLength={10}
                    data-error={!!errors.phoneNumber}
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${
                      errors.phoneNumber ? 'border-red-500' : 'border-slate-300'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                    placeholder="10-digit number"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    data-error={!!errors.email}
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${
                      errors.email ? 'border-red-500' : 'border-slate-300'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                    placeholder="email@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Emergency Contact Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Emergency Contact Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Emergency contact name"
                  />
                </div>
              </div>

              {/* Emergency Contact Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Emergency Contact Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    maxLength={10}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="10-digit emergency number"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Occupation
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Enter occupation"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={today}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Age (Auto-calculated) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Age
                </label>
                <div className="flex items-center h-[52px] px-4 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className="text-slate-900 font-medium">
                    {formData.age > 0 ? `${formData.age} years` : 'Select date of birth'}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                    placeholder="Enter complete address"
                  />
                </div>
              </div>

              {/* Profile Photo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Profile Photo
                </label>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="profilePhoto"
                    />
                    <label
                      htmlFor="profilePhoto"
                      className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-orange-500 cursor-pointer transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      Choose Photo
                    </label>
                    <p className="text-sm text-slate-500 mt-2">
                      JPG, PNG or GIF (Max 5MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Medical & Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Medical & Notes</h2>
                <p className="text-sm text-slate-600">Health information and special notes</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Medical Conditions */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Medical Conditions
                </label>
                <textarea
                  name="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  placeholder="List any medical conditions (e.g., diabetes, heart disease, asthma)"
                />
              </div>

              {/* Injuries / Limitations */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Injuries / Limitations
                </label>
                <textarea
                  name="injuriesLimitations"
                  value={formData.injuriesLimitations}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  placeholder="Mention any injuries, physical limitations, or exercise restrictions"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  placeholder="Any other important information or special requests"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Membership Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Membership Details</h2>
                <p className="text-sm text-slate-600">Plan and training preferences</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Select Plan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Plan <span className="text-orange-600">*</span>
                </label>
                <select
                  name="selectedPlan"
                  value={formData.selectedPlan}
                  onChange={handleInputChange}
                  data-error={!!errors.selectedPlan}
                  className={`w-full px-4 py-3 bg-white border ${
                    errors.selectedPlan ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none cursor-pointer`}
                  disabled={plansLoading}
                >
                  <option value="">{plansLoading ? 'Loading plans...' : 'Choose a plan'}</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.plan_name} - ₹{plan.price.toLocaleString()}
                    </option>
                  ))}
                </select>
                {errors.selectedPlan && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.selectedPlan}
                  </p>
                )}
              </div>

              {/* Plan Start Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Plan Start Date <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    name="planStartDate"
                    value={formData.planStartDate}
                    onChange={handleInputChange}
                    data-error={!!errors.planStartDate}
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${
                      errors.planStartDate ? 'border-red-500' : 'border-slate-300'
                    } rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                  />
                </div>
                {errors.planStartDate && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.planStartDate}
                  </p>
                )}
              </div>

              {/* Plan End Date (Auto-calculated) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Plan End Date
                </label>
                <div className="flex items-center h-[52px] px-4 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className="text-slate-900 font-medium">
                    {formData.planEndDate ? formatDateDisplay(formData.planEndDate) : 'Select plan and start date'}
                  </span>
                </div>
              </div>

              {/* Reference of Admission */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Reference of Admission
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="referenceOfAdmission"
                    value={formData.referenceOfAdmission}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Enter reference name"
                  />
                </div>
              </div>

              {/* Trainer Assigned */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Trainer Assigned
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="trainerAssigned"
                    value={formData.trainerAssigned}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Trainer name"
                  />
                </div>
              </div>

              {/* Batch Time */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Batch Time
                </label>
                <select
                  name="batchTime"
                  value={formData.batchTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select batch time</option>
                  <option value="Morning">Morning (6 AM - 12 PM)</option>
                  <option value="Evening">Evening (4 PM - 10 PM)</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              {/* Membership Type (Checkboxes) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Membership Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['New', 'Renewal', 'Personal Training', 'Diet'].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="membershipTypes"
                        value={type}
                        checked={formData.membershipTypes.includes(type)}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-orange-600 bg-white border-slate-300 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <span className="text-sm text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                    placeholder="Add any special notes or instructions for this membership"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* SECTION 4: Payment Information */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Payment Information</h2>
                <p className="text-sm text-slate-600">Payment details and status</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Plan Fee */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Total Plan Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
                  <input
                    type="number"
                    name="totalPlanFee"
                    value={formData.totalPlanFee || 0}
                    onChange={handleInputChange}
                    className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Amount Paid Now */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Amount Paid Now <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
                  <input
                    type="number"
                    name="amountPaidNow"
                    value={formData.amountPaidNow || 0}
                    onChange={handleInputChange}
                    data-error={!!errors.amountPaidNow}
                    className={`w-full pl-8 pr-4 py-3 bg-white border ${
                      errors.amountPaidNow ? 'border-red-500' : 'border-slate-300'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all`}
                    placeholder="0"
                    min="0"
                  />
                </div>
                {errors.amountPaidNow && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.amountPaidNow}
                  </p>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Payment Mode <span className="text-orange-600">*</span>
                </label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleInputChange}
                  data-error={!!errors.paymentMode}
                  className={`w-full px-4 py-3 bg-white border ${
                    errors.paymentMode ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none cursor-pointer`}
                  disabled={paymentModesLoading}
                >
                  <option value="">{paymentModesLoading ? 'Loading payment modes...' : 'Select payment mode'}</option>
                  {paymentModes.map((mode) => (
                    <option key={mode.name} value={mode.name}>
                      {mode.name} {mode.processingFee > 0 ? `(+${mode.processingFee}% fee)` : ''}
                    </option>
                  ))}
                </select>
                {errors.paymentMode && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.paymentMode}
                  </p>
                )}
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Payment Status
                </label>
                <div className="flex items-center h-[52px] px-4 bg-slate-50 border border-slate-300 rounded-xl">
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold ${
                    getPaymentStatus() === 'Full' 
                      ? 'bg-green-100 text-green-700' 
                      : getPaymentStatus() === 'Partial'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {getPaymentStatus()}
                  </span>
                </div>
              </div>

              {/* Next Due Date (Conditional) */}
              {showNextDueDate && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Next Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      name="nextDueDate"
                      value={formData.nextDueDate}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Remaining Balance: ₹{formData.totalPlanFee - formData.amountPaidNow}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <button
            type="submit"
            className="group relative px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2 cursor-pointer">
              <FileText className="w-5 h-5" />
              Add Member
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMemberPage;