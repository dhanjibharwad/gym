'use client';

import React, { forwardRef } from 'react';

// A4 dimensions: 210mm x 297mm
// At 96 DPI: 794px x 1123px

interface Member {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  gender: string;
  date_of_birth: string;
  age: number;
  occupation: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  profile_photo_url: string;
  created_at: string;
}

interface Membership {
  id: number;
  start_date: string;
  end_date: string;
  status: string;
  trainer_assigned: string;
  batch_time: string;
  membership_types: string[];
  reference_of_admission: string;
  locker_required: boolean;
  plan_name: string;
  duration_months: number;
  plan_price: number;
  created_by_name: string;
}

interface Payment {
  id: number;
  total_amount: number;
  paid_amount: number;
  payment_mode: string;
  payment_status: string;
}

interface MembershipReceiptProps {
  member: Member;
  membership: Membership;
  payment: Payment | null;
  gymName?: string;
  gymAddress?: string;
  gymPhone?: string;
  receiptNumber?: string;
}

// Default rules and regulations - can be customized by admin
const defaultRulesAndRegulations = [
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
  "Member shall avail of the facilities at their own risk and liability. The Eagle fitness gym shall have no responsibility for female members coming to the gym having any illicit relations with other male members or staff of the gym.",
  "Member should have do the medical check-up compulsory during the training session of their own cost. Who have severe skin, respiratory, asthma, TB and infectious diseases should not join the gym.",
  "The Gym shall not be liable in case of any injuries/illness/health issue/death of the members during the training sessions.",
  "Using of the Cardio Machine up to 10 Minutes and the exercise session is allowed up to one hour for each members in the gym.",
  "Members in the gym should not talk among themselves while exercising, disturb to other members, fight-brawl in the gym for exercise and equipment.",
  "Gym management reserves right to use your workout pictures and videos for social media marketing in concern with the gym marketing & advertisement.",
  "If the member is not able to continue gym membership then it will be transferred only to their family persons by charging of the membership transfer fees Rs. 2000/-.",
  "Consult your Physician before starting the training programme and do continuously of your medical check-up during the training.",
  "In case of unavoidable circumstances, the gym is shifted to other place, the member has to come to that place for training as it is mandatory to come relocated place OR in case of the gym may be closed, hence there is no refund of any kind will be given for shifting & closing."
];

const MembershipReceipt = forwardRef<HTMLDivElement, MembershipReceiptProps>(
  ({ 
    member, 
    membership, 
    payment, 
    gymName = "THE EAGLE FITNESS GYM",
    gymAddress = "FF-7, Sunrise Complex, B/h. Hanumanji Temple, Vrundavan Crossing, Waghodia Road, Vadodara-390 025.",
    gymPhone = "M. 9737415234 / 7567762022",
    receiptNumber
  }, ref) => {
    
    const formatDate = (dateString: string) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const calculateAge = (dob: string) => {
      if (!dob) return 'N/A';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    return (
      <div 
        ref={ref} 
        className="receipt-container"
        style={{
          width: '210mm',
          minHeight: '297mm',
          maxWidth: '210mm',
          margin: '0 auto',
          backgroundColor: 'white',
          boxSizing: 'border-box',
          fontFamily: 'Arial, sans-serif',
          fontSize: '11pt',
          lineHeight: '1.4',
        }}
      >
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .receipt-container {
              width: 210mm !important;
              min-height: 297mm !important;
              max-width: 210mm !important;
              margin: 0 !important;
              padding: 10mm !important;
              box-shadow: none !important;
            }
          }
        `}</style>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px 8px 0 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="35" height="35" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: '9pt', color: '#bfdbfe', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Member Copy</p>
                <h1 style={{ fontSize: '20pt', fontWeight: 'bold', margin: '0' }}>{gymName}</h1>
                <p style={{ fontSize: '10pt', color: '#bfdbfe', margin: '2px 0 0 0' }}>ADMISSION FORM</p>
              </div>
            </div>
            <div style={{
              width: '80px',
              height: '100px',
              border: '2px solid rgba(255,255,255,0.5)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}>
              <span style={{ fontSize: '8pt', color: '#bfdbfe' }}>Photo</span>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '9pt', color: '#bfdbfe' }}>
            <p style={{ margin: '2px 0' }}>{gymAddress}</p>
            <p style={{ margin: '2px 0' }}>{gymPhone}</p>
          </div>
        </div>

        {/* Member Details Form */}
        <div style={{ border: '2px solid #1e3a8a', borderTop: 'none', padding: '15px' }}>
          <h2 style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            color: '#1e3a8a',
            margin: '0 0 12px 0',
            borderBottom: '2px solid #1e3a8a',
            paddingBottom: '8px',
          }}>MEMBER INFORMATION</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Row 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '10pt', fontWeight: '600', whiteSpace: 'nowrap' }}>(1) Name of Member :</span>
              <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                <span style={{ fontSize: '10pt' }}>{member.full_name}</span>
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '10pt', fontWeight: '600', whiteSpace: 'nowrap' }}>(2) Address :</span>
              <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                <span style={{ fontSize: '10pt' }}>{member.address || 'N/A'}</span>
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600', whiteSpace: 'nowrap' }}>(3) Date of Birth :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>{formatDate(member.date_of_birth)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '10pt', fontWeight: '600' }}>Age :</span>
                <div style={{ width: '40px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}>{calculateAge(member.date_of_birth)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600', whiteSpace: 'nowrap' }}>Disease if any :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>None</span>
                </div>
              </div>
            </div>

            {/* Row 4 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '10pt', fontWeight: '600', whiteSpace: 'nowrap' }}>(4) Gender & Status :</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '10pt' }}>Male</span>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '1px solid #4b5563',
                    backgroundColor: member.gender === 'Male' ? '#1e3a8a' : 'transparent',
                  }}></div>
                  <span style={{ fontSize: '10pt', marginLeft: '8px' }}>Female</span>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '1px solid #4b5563',
                    backgroundColor: member.gender === 'Female' ? '#1e3a8a' : 'transparent',
                  }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600', whiteSpace: 'nowrap' }}>(ii) Occupation :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>{member.occupation || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Row 5 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600', whiteSpace: 'nowrap' }}>(5) Mobile No : (i) Self :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>{member.phone_number}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600', whiteSpace: 'nowrap' }}>(ii) Emergency :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>{member.emergency_contact_phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Membership Plan Details */}
            <div style={{ marginTop: '12px' }}>
              <h3 style={{ fontSize: '10pt', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 8px 0' }}>(6) GENERAL FITNESS PLAN :</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10pt' }}>(i) Months</span>
                <div style={{ width: '50px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}>{membership.duration_months}</span>
                </div>
                <span style={{ fontSize: '10pt' }}>Rs. :</span>
                <div style={{ width: '70px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}>{payment?.total_amount || membership.plan_price}</span>
                </div>
                <span style={{ fontSize: '10pt' }}>(Cash / G.Pay / CC.)</span>
                <div style={{ width: '70px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}>{payment?.payment_mode || 'Cash'}</span>
                </div>
              </div>
              
              {/* Paid Amount Row */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10pt' }}>(ii) Paid Amount :</span>
                <span style={{ fontSize: '10pt' }}>Rs. :</span>
                <div style={{ width: '70px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}>{payment?.paid_amount || '0'}</span>
                </div>
              </div>
              
              {/* Balance Payment Row */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '10pt' }}>(iii) Balance Payment : Date</span>
                <div style={{ width: '100px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}>{payment?.payment_status === 'partial' ? 'As per agreement' : 'N/A'}</span>
                </div>
                <span style={{ fontSize: '10pt' }}>Rs. :</span>
                <div style={{ width: '60px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}>{payment && payment.total_amount > payment.paid_amount ? payment.total_amount - payment.paid_amount : '0'}</span>
                </div>
              </div>
            </div>

            {/* Personal Training Plan */}
            <div>
              <h3 style={{ fontSize: '10pt', fontWeight: 'bold', color: '#1e3a8a', margin: '8px 0' }}>(7) PERSONAL TRAINING PLAN :</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '10pt' }}>(i) Months</span>
                <div style={{ width: '50px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}>{membership.membership_types?.includes('Personal Training') ? membership.duration_months : ''}</span>
                </div>
                <span style={{ fontSize: '10pt' }}>Rs. :</span>
                <div style={{ width: '70px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10pt' }}></span>
                </div>
              </div>
            </div>

            {/* Reference */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '10pt', fontWeight: '600' }}>(8) Reference of Admission :</span>
              <span style={{ fontSize: '10pt' }}>(Manager / Trainers / Receptionist) Mr./Ms.</span>
              <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                <span style={{ fontSize: '10pt' }}>{membership.reference_of_admission || membership.created_by_name || 'N/A'}</span>
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600' }}>(9) Date of Admission :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>{formatDate(member.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600' }}>Work-Out Time :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>{membership.batch_time}</span>
                </div>
              </div>
            </div>

            {/* Course Dates */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600' }}>(10) Course Starting Date :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>{formatDate(membership.start_date)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <span style={{ fontSize: '10pt', fontWeight: '600' }}>Course Ending Date :</span>
                <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '10pt' }}>{formatDate(membership.end_date)}</span>
                </div>
              </div>
            </div>

            {/* Membership Type Checkboxes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              <span style={{ fontSize: '10pt', fontWeight: '600' }}>NB : Type of Membership :</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10pt' }}>New</span>
                <div style={{ width: '12px', height: '12px', border: '1px solid #4b5563' }}></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10pt' }}>Renewal</span>
                <div style={{ width: '12px', height: '12px', border: '1px solid #4b5563' }}></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10pt' }}>P.T.</span>
                <div style={{ width: '12px', height: '12px', border: '1px solid #4b5563' }}></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10pt' }}>Diet</span>
                <div style={{ width: '12px', height: '12px', border: '1px solid #4b5563' }}></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '10px' }}>
                <span style={{ fontSize: '10pt' }}>Old Sr. No.</span>
                <div style={{ width: '80px', borderBottom: '1px solid #9ca3af', paddingBottom: '2px' }}></div>
              </div>
            </div>

            {/* Note */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
              <span style={{ fontSize: '10pt', fontWeight: '600' }}>Note :</span>
              <div style={{ flex: 1, borderBottom: '1px solid #9ca3af', paddingBottom: '2px', minHeight: '30px' }}></div>
            </div>
          </div>
        </div>

        {/* Rules and Regulations */}
        <div style={{
          border: '2px solid #1e3a8a',
          borderTop: 'none',
          padding: '12px',
          backgroundColor: '#f9fafb',
        }}>
          <h2 style={{
            fontSize: '11pt',
            fontWeight: 'bold',
            color: '#1e3a8a',
            margin: '0 0 10px 0',
            textAlign: 'center',
            backgroundColor: '#dbeafe',
            padding: '6px',
            borderRadius: '4px',
          }}>RULES & REGULATIONS TO BE FOLLOWED</h2>
          
          <ol style={{
            margin: '0',
            paddingLeft: '18px',
            fontSize: '8pt',
            color: '#1f2937',
            lineHeight: '1.5',
          }}>
            {defaultRulesAndRegulations.map((rule, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {rule}
              </li>
            ))}
          </ol>

          {/* Agreement Section */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #d1d5db' }}>
            <p style={{ fontSize: '8pt', color: '#374151', margin: '0 0 8px 0' }}>
              <strong>NB:</strong> So I hereby read & agreed with the above rules/regulations, instructions and reserves rights of the {gymName} and enrolled my admission for aforesaid training period.
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
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: '#1e3a8a',
          color: 'white',
          textAlign: 'center',
          padding: '8px',
          borderRadius: '0 0 8px 8px',
        }}>
          <p style={{ fontSize: '8pt', margin: '0' }}>I agreed to follows above mentioned Instructions and Rules.</p>
        </div>

        {/* Receipt Number */}
        {receiptNumber && (
          <div style={{ marginTop: '8px', textAlign: 'right' }}>
            <p style={{ fontSize: '9pt', fontWeight: '600', color: '#4b5563', margin: '0' }}>Receipt No: {receiptNumber}</p>
          </div>
        )}
      </div>
    );
  }
);

MembershipReceipt.displayName = 'MembershipReceipt';

export default MembershipReceipt;
