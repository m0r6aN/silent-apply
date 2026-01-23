import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addDays, addHours, startOfDay, isWithinInterval } from 'date-fns';

const getSlotsSchema = z.object({
  profileHandle: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const holdSlotSchema = z.object({
  profileHandle: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

const confirmBookingSchema = z.object({
  bookingId: z.string().uuid(),
  confirm: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileHandle = searchParams.get('profileHandle');
    const date = searchParams.get('date');
    
    const validation = getSlotsSchema.safeParse({ profileHandle, date });
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { profileHandle: handle, date: dateStr } = validation.data;
    
    // Find profile
    const profile = await prisma.profile.findUnique({
      where: { 
        handle,
        published: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found or not published' },
        { status: 404 }
      );
    }

    const targetDate = new Date(dateStr);
    const startOfTargetDate = startOfDay(targetDate);
    const endOfTargetDate = addDays(startOfTargetDate, 1);

    // Get existing bookings for this date
    const existingBookings = await prisma.booking.findMany({
      where: {
        profileId: profile.id,
        startTime: {
          gte: startOfTargetDate,
          lt: endOfTargetDate,
        },
        status: {
          in: ['held', 'booked'],
        },
      },
    });

    // Generate available slots (MVP: 9 AM - 5 PM, 1-hour slots)
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = addHours(startOfTargetDate, hour);
      const slotEnd = addHours(slotStart, 1);
      
      // Check if slot is already booked
      const isBooked = existingBookings.some(booking => {
        return isWithinInterval(slotStart, { 
          start: booking.startTime, 
          end: booking.endTime 
        }) || isWithinInterval(slotEnd, { 
          start: booking.startTime, 
          end: booking.endTime 
        });
      });

      if (!isBooked) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: true,
        });
      }
    }

    // Get held slots (for display)
    const heldSlots = existingBookings
      .filter(b => b.status === 'held')
      .map(b => ({
        id: b.id,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        status: b.status,
        heldUntil: b.heldUntil?.toISOString(),
      }));

    return NextResponse.json({
      date: dateStr,
      slots,
      heldSlots,
      timezone: 'UTC', // MVP: Use UTC
    });

  } catch (error) {
    console.error('Error getting booking slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = holdSlotSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { profileHandle, startTime, endTime, email, name } = validation.data;
    
    // Find profile
    const profile = await prisma.profile.findUnique({
      where: { 
        handle: profileHandle,
        published: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found or not published' },
        { status: 404 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const heldUntil = addHours(new Date(), 1); // Hold for 1 hour

    // Check if slot is still available
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        profileId: profile.id,
        startTime: {
          lt: end,
        },
        endTime: {
          gt: start,
        },
        status: {
          in: ['held', 'booked'],
        },
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Time slot no longer available' },
        { status: 409 }
      );
    }

    // Create booking hold
    const booking = await prisma.booking.create({
      data: {
        profileId: profile.id,
        startTime: start,
        endTime: end,
        status: 'held',
        email,
        name,
        heldUntil,
      },
    });

    // Create analytics event
    await prisma.analyticsEvent.create({
      data: {
        profileId: profile.id,
        eventType: 'booking_held',
        metadataJson: {
          bookingId: booking.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          email,
          name,
        },
      },
    });

    // TODO: Send confirmation email with booking link
    // For MVP, just return the booking ID

    return NextResponse.json({
      bookingId: booking.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      heldUntil: heldUntil.toISOString(),
      confirmUrl: `/api/booking/confirm?bookingId=${booking.id}`,
    }, { status: 201 });

  } catch (error) {
    console.error('Error holding booking slot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Separate endpoint for confirmation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = confirmBookingSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { bookingId, confirm } = validation.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status !== 'held') {
      return NextResponse.json(
        { error: 'Booking is not in held status' },
        { status: 400 }
      );
    }

    if (booking.heldUntil && new Date() > booking.heldUntil) {
      // Hold expired
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'open' },
      });
      
      return NextResponse.json(
        { error: 'Booking hold has expired' },
        { status: 410 }
      );
    }

    if (confirm) {
      // Confirm booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'booked' },
      });

      // Create analytics event
      await prisma.analyticsEvent.create({
        data: {
          profileId: booking.profileId,
          eventType: 'booking_confirmed',
          metadataJson: {
            bookingId: booking.id,
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            email: booking.email,
          },
        },
      });

      // TODO: Send calendar invites to both parties
      // TODO: Send confirmation emails

      return NextResponse.json({
        success: true,
        message: 'Booking confirmed',
        bookingId,
        status: 'booked',
      });
    } else {
      // Release hold
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'open' },
      });

      return NextResponse.json({
        success: true,
        message: 'Booking hold released',
        bookingId,
        status: 'open',
      });
    }

  } catch (error) {
    console.error('Error confirming booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
