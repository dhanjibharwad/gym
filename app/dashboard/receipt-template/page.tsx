'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Save,
  Printer,
  ArrowLeft,
  Edit3,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Phone,
  MapPin,
  Mail,
  Globe,
  Image as ImageIcon
} from 'lucide-react';
import { PageGuard } from '@/components/rbac/PageGuard';
import Toast from '@/app/components/Toast';
import GymLoader from '@/components/GymLoader';

interface ReceiptTemplate {
  gymName: string;
  gymAddress: string;
  gymPhone: string;
  gymEmail: string;
  gymWebsite: string;
  formTitle: string;
  headerColor: string;
  logoUrl: string;
  rulesAndRegulations: string[];
  customFields: CustomField[];
  showPhotoPlaceholder: boolean;
  showSignatureSection: boolean;
  footerText: string;
}

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
}

// Empty default template for new companies - they must fill in their own details
const defaultTemplate: ReceiptTemplate = {
  gymName: "",
  gymAddress: "",
  gymPhone: "",
  gymEmail: "",
  gymWebsite: "",
  formTitle: "ADMISSION FORM",
  headerColor: "#1e3a8a",
  logoUrl: "",
  rulesAndRegulations: [
    "Rights of admission / renewal / termination is reserved with owner. Management has reserved the right to refuse approval of an extension of the membership in the same package.",
    "Member should bring his/her own towel, napkin, separate bag for workout. Water bottles, shoes, towels etc. should be brought in separate bag for workout.",
    "Admission of those who have criminal record/involved in unlawful activities will be cancelled without any refund and notice.",
    "Fees must be paid in advance before joining the gym. Once paid the fees will not be refundable, transferable or any refund.",
    "Those who consuming illegal liquor or narcotics will be denied admission without any prior notice and any false rumors about the gym or talk that bring the gym into disrepute.",
    "The Gym has rights to discontinue or restrict the facilities without any prior notice. It is legal offense to spread any false rumors about the gym or talk.",
    "The members may use the gym Equipment / A.C. / music system and other facilities with due care and caution. If any damages to its result of careless handling will have to be paid by the members concerned.",
    "If any member is unable to come the gym for one month under the unavoidable circumstances, they must have to take permission in writing in advance from the gym management.",
    "Once the training commences, no breaking period or leave shall be considered. I.e. days of leave/absence also counted in the total period of training.",
    "Do not bring or wear the valuables things/jewelry in to gymnasium during the training period. Gym Management is not responsible for loss of or damages thereof.",
    "Do not make fun with any members of the gym also to do not misbehave OR obnoxiously with any female members of the gym, a legal action will be taken against those who do so.",
    "The gym management is not allowed Pan/Padiku /Gutaka /Tabacco /smoking /illegal liquor and intoxicating substances in the gym.",
    "Member shall avail of the facilities at their own risk and liability. The gym shall have no responsibility for female members coming to the gym having any illicit relations with other male members or staff of the gym.",
    "Member should have do the medical check-up compulsory during the training session of their own cost. Who have severe skin, respiratory, asthma, TB and infectious diseases should not join the gym.",
    "The Gym shall not be liable in case of any injuries/illness/health issue/death of the members during the training sessions.",
    "Using of the Cardio Machine up to 10 Minutes and the exercise session is allowed up to one hour for each members in the gym.",
    "Members in the gym should not talk among themselves while exercising, disturb to other members, fight-brawl in the gym for exercise and equipment.",
    "Gym management reserves right to use your workout pictures and videos for social media marketing in concern with the gym marketing & advertisement.",
    "If the member is not able to continue gym membership then it will be transferred only to their family persons by charging of the membership transfer fees Rs. 2000/-.",
    "Consult your Physician before starting the training programme and do continuously of your medical check-up during the training.",
    "In case of unavoidable circumstances, the gym is shifted to other place, the member has to come to that place for training as it is mandatory to come relocated place OR in case of the gym may be closed, hence there is no refund of any kind will be given for shifting & closing."
  ],
  customFields: [],
  showPhotoPlaceholder: true,
  showSignatureSection: true,
  footerText: "I agreed to follows above mentioned Instructions and Rules."
};

function ReceiptTemplatePage() {
  const router = useRouter();
  const [template, setTemplate] = useState<ReceiptTemplate>(defaultTemplate);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'preview'>('general');
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [newRule, setNewRule] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/receipt-template', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      if (data.success && data.template) {
        setTemplate({ ...defaultTemplate, ...data.template });
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/receipt-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      const data = await response.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Receipt template saved successfully!' });
      } else {
        setToast({ type: 'error', message: data.message || 'Failed to save template' });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    if (newRule.trim()) {
      setTemplate({
        ...template,
        rulesAndRegulations: [...template.rulesAndRegulations, newRule.trim()]
      });
      setNewRule('');
    }
  };

  const handleUpdateRule = (index: number, value: string) => {
    const updated = [...template.rulesAndRegulations];
    updated[index] = value;
    setTemplate({ ...template, rulesAndRegulations: updated });
  };

  const handleDeleteRule = (index: number) => {
    const updated = template.rulesAndRegulations.filter((_, i) => i !== index);
    setTemplate({ ...template, rulesAndRegulations: updated });
  };

  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const updated = [...template.rulesAndRegulations];
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
      setTemplate({ ...template, rulesAndRegulations: updated });
    } else if (direction === 'down' && index < template.rulesAndRegulations.length - 1) {
      const updated = [...template.rulesAndRegulations];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setTemplate({ ...template, rulesAndRegulations: updated });
    }
  };

  const handlePrintPreview = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && previewRef.current) {
      const printContent = previewRef.current.innerHTML;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt Preview - ${template.gymName}</title>
            <meta charset="utf-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .receipt-container { width: 210mm !important; min-height: 297mm !important; max-width: 210mm !important; margin: 0 auto !important; padding: 10mm !important; background: white !important; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Note: PageGuard already shows GymLoader while checking permissions
  // We don't need a separate loader here to avoid double loading screens

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <button
                onClick={() => router.back()}
                className="group flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Receipt Template</h1>
              <p className="text-sm text-gray-500 mt-1">Customize your membership receipt format</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintPreview}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'general', label: 'General Information', icon: Building2 },
                { id: 'rules', label: 'Rules & Regulations', icon: FileText },
                { id: 'preview', label: 'Preview', icon: Printer },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* General Information Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gym Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gym Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={template.gymName}
                      onChange={(e) => setTemplate({ ...template, gymName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Enter gym name"
                    />
                  </div>

                  {/* Form Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Title
                    </label>
                    <input
                      type="text"
                      value={template.formTitle}
                      onChange={(e) => setTemplate({ ...template, formTitle: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="e.g., ADMISSION FORM"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Number
                      </div>
                    </label>
                    <input
                      type="text"
                      value={template.gymPhone}
                      onChange={(e) => setTemplate({ ...template, gymPhone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="M. 1234567890"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </div>
                    </label>
                    <input
                      type="email"
                      value={template.gymEmail}
                      onChange={(e) => setTemplate({ ...template, gymEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="gym@example.com"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Website
                      </div>
                    </label>
                    <input
                      type="text"
                      value={template.gymWebsite}
                      onChange={(e) => setTemplate({ ...template, gymWebsite: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="www.example.com"
                    />
                  </div>

                  {/* Header Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Header Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={template.headerColor}
                        onChange={(e) => setTemplate({ ...template, headerColor: e.target.value })}
                        className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={template.headerColor}
                        onChange={(e) => setTemplate({ ...template, headerColor: e.target.value })}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="#1e3a8a"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Address <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <textarea
                    value={template.gymAddress}
                    onChange={(e) => setTemplate({ ...template, gymAddress: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    placeholder="Enter complete address"
                  />
                </div>

                {/* Logo URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Logo URL
                    </div>
                  </label>
                  <input
                    type="text"
                    value={template.logoUrl}
                    onChange={(e) => setTemplate({ ...template, logoUrl: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to use default icon</p>
                </div>

                {/* Footer Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Footer Text
                  </label>
                  <input
                    type="text"
                    value={template.footerText}
                    onChange={(e) => setTemplate({ ...template, footerText: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Footer text for the receipt"
                  />
                </div>

                {/* Display Options */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Display Options</h3>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.showPhotoPlaceholder}
                        onChange={(e) => setTemplate({ ...template, showPhotoPlaceholder: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-sm text-gray-700">Show Photo Placeholder</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.showSignatureSection}
                        onChange={(e) => setTemplate({ ...template, showSignatureSection: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-sm text-gray-700">Show Signature Section</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Rules & Regulations Tab */}
            {activeTab === 'rules' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Rules & Regulations</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add, edit, or reorder the rules that will appear on the receipt. Drag to reorder.
                  </p>

                  {/* Add New Rule */}
                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Add a new rule..."
                    />
                    <button
                      onClick={handleAddRule}
                      className="flex items-center gap-2 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>

                  {/* Rules List */}
                  <div className="space-y-3">
                    {template.rulesAndRegulations.map((rule, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 group hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 mt-1">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                        </div>
                        {editingRuleIndex === index ? (
                          <textarea
                            value={rule}
                            onChange={(e) => handleUpdateRule(index, e.target.value)}
                            onBlur={() => setEditingRuleIndex(null)}
                            autoFocus
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                            rows={2}
                          />
                        ) : (
                          <p
                            onClick={() => setEditingRuleIndex(index)}
                            className="flex-1 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                          >
                            {rule}
                          </p>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleMoveRule(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveRule(index, 'down')}
                            disabled={index === template.rulesAndRegulations.length - 1}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => setEditingRuleIndex(index)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {template.rulesAndRegulations.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No rules added yet</p>
                      <p className="text-sm text-gray-400">Add rules using the input above</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Receipt Preview</h3>
                  <button
                    onClick={handlePrintPreview}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print Preview
                  </button>
                </div>
                
                <div className="bg-gray-100 p-8 rounded-xl overflow-auto">
                  <div ref={previewRef} className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm', maxWidth: '210mm' }}>
                    {/* Receipt Header */}
                    <div style={{ background: template.headerColor, color: 'white', padding: '15px', borderRadius: '8px 8px 0 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          {template.logoUrl ? (
                            <img src={template.logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="35" height="35" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                              </svg>
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: '9pt', color: 'rgba(255,255,255,0.7)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Member Copy</p>
                            <h1 style={{ fontSize: '20pt', fontWeight: 'bold', margin: '0' }}>{template.gymName}</h1>
                            <p style={{ fontSize: '10pt', color: 'rgba(255,255,255,0.7)', margin: '2px 0 0 0' }}>{template.formTitle}</p>
                          </div>
                        </div>
                        {template.showPhotoPlaceholder && (
                          <div style={{ width: '80px', height: '100px', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '8pt', color: 'rgba(255,255,255,0.7)' }}>Photo</span>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '9pt', color: 'rgba(255,255,255,0.7)' }}>
                        <p style={{ margin: '2px 0' }}>{template.gymAddress}</p>
                        {template.gymPhone && <p style={{ margin: '2px 0' }}>{template.gymPhone}</p>}
                        {template.gymEmail && <p style={{ margin: '2px 0' }}>{template.gymEmail}</p>}
                        {template.gymWebsite && <p style={{ margin: '2px 0' }}>{template.gymWebsite}</p>}
                      </div>
                    </div>

                    {/* Member Info Section */}
                    <div style={{ border: `2px solid ${template.headerColor}`, borderTop: 'none', padding: '15px' }}>
                      <h2 style={{ fontSize: '12pt', fontWeight: 'bold', color: template.headerColor, margin: '0 0 12px 0', borderBottom: `2px solid ${template.headerColor}`, paddingBottom: '8px' }}>
                        MEMBER INFORMATION
                      </h2>
                      <p style={{ fontSize: '10pt', color: '#666', textAlign: 'center', padding: '20px' }}>
                        [Member details will be populated here when generating receipt for a specific member]
                      </p>
                    </div>

                    {/* Rules Section */}
                    <div style={{ border: `2px solid ${template.headerColor}`, borderTop: 'none', padding: '12px', backgroundColor: '#f9fafb' }}>
                      <h2 style={{ fontSize: '11pt', fontWeight: 'bold', color: template.headerColor, margin: '0 0 10px 0', textAlign: 'center', backgroundColor: '#dbeafe', padding: '6px', borderRadius: '4px' }}>
                        RULES & REGULATIONS TO BE FOLLOWED
                      </h2>
                      <ol style={{ margin: '0', paddingLeft: '18px', fontSize: '8pt', color: '#1f2937', lineHeight: '1.5' }}>
                        {template.rulesAndRegulations.map((rule, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>{rule}</li>
                        ))}
                      </ol>

                      {template.showSignatureSection && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #d1d5db' }}>
                          <p style={{ fontSize: '8pt', color: '#374151', margin: '0 0 8px 0' }}>
                            <strong>NB:</strong> So I hereby read & agreed with the above rules/regulations, instructions and reserves rights of the {template.gymName} and enrolled my admission for aforesaid training period.
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ width: '120px', borderBottom: '1px solid #9ca3af', marginBottom: '4px' }}></div>
                              <p style={{ fontSize: '8pt', fontWeight: '600', margin: '0' }}>Date</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ width: '140px', borderBottom: '1px solid #9ca3af', marginBottom: '4px' }}></div>
                              <p style={{ fontSize: '8pt', fontWeight: '600', margin: '0' }}>Seal & Signature of the Gym Authority</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ width: '140px', borderBottom: '1px solid #9ca3af', marginBottom: '4px' }}></div>
                              <p style={{ fontSize: '8pt', fontWeight: '600', margin: '0' }}>Signature of Member</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{ backgroundColor: template.headerColor, color: 'white', textAlign: 'center', padding: '8px', borderRadius: '0 0 8px 8px' }}>
                      <p style={{ fontSize: '8pt', margin: '0' }}>{template.footerText}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap with PageGuard to check permissions
function ReceiptTemplatePageWithGuard() {
  return (
    <PageGuard permission="manage_settings">
      <ReceiptTemplatePage />
    </PageGuard>
  );
}

export default ReceiptTemplatePageWithGuard;
