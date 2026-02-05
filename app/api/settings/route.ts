import { NextRequest, NextResponse } from 'next/server';

// Mock settings storage (in production, this would be a database)
export let gymSettings = {
  gymName: 'Our GYM',
  address: '',
  phone: '',
  email: '',
  openingTime: '06:00',
  closingTime: '22:00',
  currency: 'INR',
  taxRate: '18',
  paymentModes: {
    Cash: { enabled: true, processingFee: 0 },
    UPI: { enabled: true, processingFee: 1.5 },
    Card: { enabled: true, processingFee: 2.5 },
    Online: { enabled: true, processingFee: 2.0 },
    Cheque: { enabled: true, processingFee: 0 }
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    paymentReminders: true
  }
};

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      settings: gymSettings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch settings'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Update settings
    gymSettings = { ...gymSettings, ...body };
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: gymSettings
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save settings'
    }, { status: 500 });
  }
}