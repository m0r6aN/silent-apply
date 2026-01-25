/**
 * Booking Contracts
 * 
 * Shared DTOs for booking/scheduling between UI and integrations.
 * These are canon-neutral data structures.
 */

/**
 * Booking status
 */
export type BookingStatus = 
  | 'held'        // Temporarily held, not confirmed
  | 'confirmed'   // Confirmed by recruiter
  | 'cancelled'   // Cancelled by either party
  | 'expired';    // Hold expired without confirmation

/**
 * Booking slot
 */
export interface Booking {
  id: string;
  profileId: string;
  recruiterEmail: string;
  recruiterName?: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: BookingStatus;
  heldAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  expiresAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Booking hold request
 */
export interface HoldBookingRequest {
  scheduledAt: Date;
  durationMinutes: number;
  recruiterEmail: string;
  recruiterName?: string;
  notes?: string;
}

/**
 * Booking confirmation request
 */
export interface ConfirmBookingRequest {
  bookingId: string;
}

/**
 * Booking cancellation request
 */
export interface CancelBookingRequest {
  bookingId: string;
  reason?: string;
}

/**
 * Available time slot
 */
export interface AvailableSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

/**
 * Availability settings
 */
export interface AvailabilitySettings {
  enabled: boolean;
  timezone: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  advanceNoticeDays: number;
  maxAdvanceDays: number;
  holdExpirationMinutes: number;
}

/**
 * Public booking view (recruiter-facing)
 */
export interface PublicBooking {
  availableSlots: AvailableSlot[];
  timezone: string;
  slotDurationMinutes: number;
}

/**
 * Booking validation result
 */
export interface BookingValidation {
  valid: boolean;
  errors?: {
    field: string;
    message: string;
  }[];
}

