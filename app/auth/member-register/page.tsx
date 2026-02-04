'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
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
  Users
} from 'lucide-react';

// Type definitions
interface FormData {
  // Personal Information
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  profilePhoto: File | null;
  
  // Membership Details
  selectedPlan: string;
  planStartDate: string;
  trainerAssigned: string;
  batchTime: 'Morning' | 'Evening' | 'Flexible' | '';
  membershipType: 'Gym Only' | 'Gym + Personal Training' | '';
  lockerRequired: boolean;
  
  // Medical & Notes
  medicalConditions: string;
  injuriesLimitations: string;
  additionalNotes: string;
  
  // Payment Information
  totalPlanFee: number;
  amountPaidNow: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Online' | '';
  nextDueDate: string;
}

interface FormErrors {
  [key: string]: string;
}

const GymMemberRegistrationPage = () => {
  const today = new Date().toISOString().split('T')[0];
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({show: false, message: '', type: 'success'});
  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    profilePhoto: null,
    selectedPlan: '',
    planStartDate: today,
    trainerAssigned: '',
    batchTime: '',
    membershipType: '',
    lockerRequired: false,
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

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      email: '',
      gender: '',
      dateOfBirth: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      profilePhoto: null,
      selectedPlan: '',
      planStartDate: today,
      trainerAssigned: '',
      batchTime: '',
      membershipType: '',
      lockerRequired: false,
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
  
  const planPricing: { [key: string]: number } = {
    'Monthly': 1500,
    '3 Months': 4000,
    '6 Months': 7500,
    '1 Year': 14000
  };

  // Handle input changes
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Auto-fill total plan fee when plan is selected
      if (name === 'selectedPlan' && value in planPricing) {
        setFormData(prev => ({ ...prev, totalPlanFee: planPricing[value] }));
      }
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
    if (!formData.paymentMode) newErrors.paymentMode = 'Payment mode is required';

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

    // Amount validation
    if (formData.amountPaidNow > formData.totalPlanFee) {
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
        
        // Add all form fields with proper type conversion
        Object.entries(formData).forEach(([key, value]) => {
          if (key !== 'profilePhoto') {
            if (typeof value === 'boolean') {
              formDataToSend.append(key, value.toString());
            } else {
              formDataToSend.append(key, value?.toString() || '');
            }
          }
        });
        
        // Add profile photo if exists
        if (formData.profilePhoto) {
          formDataToSend.append('profilePhoto', formData.profilePhoto);
        }

        const response = await fetch('/api/members/register', {
          method: 'POST',
          body: formDataToSend, // Use FormData instead of JSON
        });

        const result = await response.json();

        if (result.success) {
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            resetForm(); // Reset form after success popup closes
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pt-20">
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
              {/* Success Icon */}
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* Success Message */}
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Registration Successful!</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Welcome to <span className="font-semibold text-orange-600">GYM FLEX</span>!<br />
                Your membership has been activated successfully.
              </p>
              
              {/* Member ID */}
              <div className="bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-600 mb-1">Member ID</p>
                <p className="text-lg font-bold text-slate-900">#GF{String(Date.now()).slice(-6)}</p>
              </div>
              
              {/* Checkmark Animation */}
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Animated background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-400/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mb-4 shadow-lg shadow-orange-500/20">
            <Dumbbell className="w-8 h-8 text-white" />
          </div> */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-2 tracking-tight">
            New Member Registration
          </h1>
          <p className="text-slate-600 text-base sm:text-lg font-light">
            Complete the form below to register a new gym member
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          
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

            <div className="p-6 sm:p-8 space-y-6">
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
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
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

                {/* Emergency Contact Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Contact person name"
                  />
                </div>

                {/* Emergency Contact Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Emergency Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Contact phone number"
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

          {/* SECTION 2: Membership Details */}
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

            <div className="p-6 sm:p-8 space-y-6">
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
                  >
                    <option value="">Choose a plan</option>
                    <option value="Monthly">Monthly - ₹1,500</option>
                    <option value="3 Months">3 Months - ₹4,000</option>
                    <option value="6 Months">6 Months - ₹7,500</option>
                    <option value="1 Year">1 Year - ₹14,000</option>
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

                {/* Membership Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Membership Type
                  </label>
                  <select
                    name="membershipType"
                    value={formData.membershipType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select type</option>
                    <option value="Gym Only">Gym Only</option>
                    <option value="Gym + Personal Training">Gym + Personal Training</option>
                  </select>
                </div>

                {/* Locker Required */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Locker Required?
                  </label>
                  <div className="flex items-center gap-4 mt-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="lockerRequired"
                        checked={formData.lockerRequired}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      <span className="ms-3 text-sm font-medium text-slate-700">
                        {formData.lockerRequired ? 'Yes' : 'No'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Medical & Notes */}
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

            <div className="p-6 sm:p-8 space-y-6">
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

            <div className="p-6 sm:p-8 space-y-6">
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
                      value={formData.totalPlanFee}
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
                      value={formData.amountPaidNow}
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
                  >
                    <option value="">Select payment mode</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Online">Online Transfer</option>
                  </select>
                  {errors.paymentMode && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.paymentMode}
                    </p>
                  )}
                </div>

                {/* Payment Status (Read-only) */}
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
              className="group relative px-8 sm:px-12 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2 cursor-pointer">
                <FileText className="w-5 h-5" />
                Create Member
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            All fields marked with <span className="text-orange-600">*</span> are required
          </p>
        </div>
      </div>
    </div>
  );
};

export default GymMemberRegistrationPage;