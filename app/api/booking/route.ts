/**
 * Booking API Endpoint (Canon-Compliant)
 *
 * GET /api/booking - Get available slots
 * POST /api/booking - Hold a slot
 * PUT /api/booking - Confirm/release booking
 *
 * Enforces BOOKING_CANON_v1:
 * - Hold semantics (10min expiry)
 * - Confirm requires email
 * - Quiet rate limiting
 * - No urgency language
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addDays, addHours, isWithinInterval } from 'date-fns';
import { getOrCreateCorrelationId, CORRELATION_HEADER, createCorrelationLogger } from '@/lib/correlation';
import { allowBookingHold, allowBookingHoldByIP, getClientIP } from '@/lib/rateLimit';
import { sendBookingConfirmationEmails } from '@/lib/bookingEmail';

const getSlotsSchema = z.object({
  profileHandle: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const holdSlotSchema = z.object({
  profileHandle: z.string().min(1).max(64),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const confirmBookingSchema = z.object({
  bookingId: z.string().uuid(),
  confirm: z.boolean(),
  email: z.string().email().optional(),
  name: z.string().max(100).optional(),
});

// GET: Get available slots for a date
export async function GET(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const { searchParams } = new URL(request.url);
    const profileHandle = searchParams.get('profileHandle');
    const date = searchParams.get('date');

    const validation = getSlotsSchema.safeParse({ profileHandle, date });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
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
        {
          status: 404,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    // Clean up expired holds first
    await prisma.booking.updateMany({
      where: {
        profileId: profile.id,
        status: 'held',
        heldUntil: { lt: new Date() },
      },
      data: { status: 'open' },
    });

    // Parse the date as a UTC day so generated slots align with stored windows.
    const startOfTargetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfTargetDate = addDays(startOfTargetDate, 1);
    const dayOfWeek = startOfTargetDate.getUTCDay();

    // Candidate-defined availability windows for this weekday (minutes from 00:00 UTC).
    const windows = (await prisma.availabilityWindow.findMany({
      where: { profileId: profile.id, dayOfWeek },
      orderBy: { startMinute: 'asc' },
    })) as Array<{ startMinute: number; endMinute: number }>;

    // Get existing bookings for this date (held or booked only)
    const existingBookings = (await prisma.booking.findMany({
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
    })) as Array<{ startTime: Date; endTime: Date }>;

    const now = new Date();

    // Generate 1-hour slots from each availability window.
    const slots = [];
    for (const window of windows) {
      for (let minute = window.startMinute; minute + 60 <= window.endMinute; minute += 60) {
        const slotStart = new Date(startOfTargetDate.getTime() + minute * 60 * 1000);
        const slotEnd = addHours(slotStart, 1);

        // Don't offer slots in the past.
        if (slotStart <= now) continue;

        // Check if slot overlaps with any existing booking
        const isBooked = existingBookings.some((booking) => {
          return (
            isWithinInterval(slotStart, {
              start: booking.startTime,
              end: booking.endTime,
            }) ||
            isWithinInterval(slotEnd, {
              start: booking.startTime,
              end: booking.endTime,
            })
          );
        });

        if (!isBooked) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            available: true,
          });
        }
      }
    }

    return NextResponse.json(
      {
        date: dateStr,
        slots,
        timezone: 'UTC',
        correlationId,
      },
      {
        status: 200,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  } catch (error) {
    log.error('booking.get_slots_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }
}

// POST: Hold a slot
export async function POST(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const body = await request.json();
    const validation = holdSlotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    const { profileHandle, startTime, endTime } = validation.data;

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
        {
          status: 404,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    // Quiet rate limiting
    const clientIP = getClientIP(request.headers);
    const [profileLimit, ipLimit] = await Promise.all([
      allowBookingHold(profile.id),
      allowBookingHoldByIP(clientIP),
    ]);

    if (!profileLimit.allowed || !ipLimit.allowed) {
      log.info('booking.rate_limited', {
        profileId: profile.id,
        profileLimitAllowed: profileLimit.allowed,
        ipLimitAllowed: ipLimit.allowed,
      });

      // Canon: booking simply becomes unavailable (quiet)
      return NextResponse.json(
        { error: 'Time slot no longer available' },
        {
          status: 409, // Conflict - appears as slot conflict, not rate limit
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    // Canon: 10-minute hold window (BOOKING_CANON_v1 Section 3)
    const heldUntil = new Date(Date.now() + 10 * 60 * 1000);

    // Clean up expired holds
    await prisma.booking.updateMany({
      where: {
        profileId: profile.id,
        status: 'held',
        heldUntil: { lt: new Date() },
      },
      data: { status: 'open' },
    });

    // Check if slot is still available
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        profileId: profile.id,
        startTime: { lt: end },
        endTime: { gt: start },
        status: { in: ['held', 'booked'] },
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Time slot no longer available' },
        {
          status: 409,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    // Create booking hold
    const booking = await prisma.booking.create({
      data: {
        profileId: profile.id,
        startTime: start,
        endTime: end,
        status: 'held',
        heldUntil,
      },
    });

    // Log allowed event
    log.info('booking.hold_created', {
      bookingId: booking.id,
      profileId: profile.id,
      startTime: start.toISOString(),
    });

    await prisma.analyticsEvent.create({
      data: {
        profileId: profile.id,
        eventType: 'booking.hold_created',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadataJson: JSON.parse(JSON.stringify({ correlationId, bookingId: booking.id, startTime: start.toISOString(), endTime: end.toISOString() })) as any,
      },
    });

    return NextResponse.json(
      {
        bookingId: booking.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        heldUntil: heldUntil.toISOString(),
        status: 'held',
        correlationId,
      },
      {
        status: 201,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  } catch (error) {
    log.error('booking.hold_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }
}

// PUT: Confirm or release booking
export async function PUT(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const body = await request.json();
    const validation = confirmBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    const { bookingId, confirm, email, name } = validation.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { profile: { include: { user: true } } },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        {
          status: 404,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    if (booking.status !== 'held') {
      return NextResponse.json(
        { error: 'Booking is not in held status' },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    // Check if hold expired
    if (booking.heldUntil && new Date() > booking.heldUntil) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'open' },
      });

      return NextResponse.json(
        { error: 'Booking hold has expired' },
        {
          status: 410,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    if (confirm) {
      // Canon: Confirmation requires email (BOOKING_CANON_v1 Section 4)
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required to confirm booking' },
          {
            status: 400,
            headers: { [CORRELATION_HEADER]: correlationId },
          }
        );
      }

      // Confirm booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'booked',
          email,
          name: name || null,
        },
      });

      // Log allowed event
      log.info('booking.confirmed', {
        bookingId,
        profileId: booking.profileId,
      });

      await prisma.analyticsEvent.create({
        data: {
          profileId: booking.profileId,
          eventType: 'booking.confirmed',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadataJson: JSON.parse(JSON.stringify({ correlationId, bookingId, startTime: booking.startTime.toISOString(), endTime: booking.endTime.toISOString() })) as any,
        },
      });

      // Notify both parties (non-blocking; failures must not break confirmation).
      sendBookingConfirmationEmails({
        bookingId,
        recruiterEmail: email,
        recruiterName: name ?? null,
        candidateEmail: booking.profile.user?.email ?? null,
        candidateHandle: booking.profile.handle,
        start: booking.startTime,
        end: booking.endTime,
      }).catch((err) => log.error('booking.confirmation_email_error', err));

      return NextResponse.json(
        {
          success: true,
          bookingId,
          status: 'booked',
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          correlationId,
        },
        {
          status: 200,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    } else {
      // Release hold
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'open' },
      });

      log.info('booking.hold_released', { bookingId });

      return NextResponse.json(
        {
          success: true,
          bookingId,
          status: 'open',
          correlationId,
        },
        {
          status: 200,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }
  } catch (error) {
    log.error('booking.confirm_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }
}
