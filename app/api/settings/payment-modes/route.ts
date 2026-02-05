import { NextRequest, NextResponse } from 'next/server';

// Import the same settings storage used in the main settings API
import { gymSettings } from '../route';

export async function GET(request: NextRequest) {
  try {
    // Filter enabled payment modes from actual settings
    const enabledPaymentModes = Object.entries(gymSettings.paymentModes)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => ({ name, ...config }));

    return NextResponse.json({
      success: true,
      paymentModes: enabledPaymentModes
    });
  } catch (error) {
    console.error('Error fetching payment modes:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment modes' },
      { status: 500 }
    );
  }
}