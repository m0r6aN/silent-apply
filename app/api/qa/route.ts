import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const askQuestionSchema = z.object({
  profileHandle: z.string(),
  question: z.string().min(1).max(500),
  recruiterEmail: z.string().email().optional(),
});

const escalateSchema = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = askQuestionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { profileHandle, question, recruiterEmail } = validation.data;
    
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

    // Create Q&A thread
    const thread = await prisma.qAThread.create({
      data: {
        profileId: profile.id,
      },
    });

    // Create initial message
    const message = await prisma.qAMessage.create({
      data: {
        threadId: thread.id,
        role: 'recruiter',
        content: question,
        status: 'answered',
        sourcesJson: [],
      },
    });

    // TODO: Implement actual Q&A logic with OMEGA intelligence
    // For MVP, return canned responses based on profile data
    const profileData = {
      workAuth: profile.workAuthJson,
      availability: profile.availabilityJson,
      compensation: profile.compJson,
      roles: profile.roles,
      locationMode: profile.locationMode,
    };

    // Simple keyword matching for MVP
    let answer = "I don't have specific information about that yet. The candidate can be contacted directly for more details.";
    let sources: string[] = [];

    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('work authorization') || questionLower.includes('visa') || questionLower.includes('citizen')) {
      const workAuth = profileData.workAuth as any;
      if (workAuth?.citizen) {
        answer = "This candidate is a citizen and does not require visa sponsorship.";
        sources = ['work_auth_json'];
      } else if (workAuth?.visa) {
        answer = `This candidate requires ${workAuth.visa} visa sponsorship.`;
        sources = ['work_auth_json'];
      }
    } else if (questionLower.includes('available') || questionLower.includes('start date') || questionLower.includes('notice')) {
      const availability = profileData.availability as any;
      if (availability?.startDate) {
        answer = `This candidate is available to start on ${availability.startDate}.`;
        if (availability?.noticePeriod) {
          answer += ` They have a ${availability.noticePeriod} day notice period.`;
        }
        sources = ['availability_json'];
      }
    } else if (questionLower.includes('salary') || questionLower.includes('compensation') || questionLower.includes('pay')) {
      const compensation = profileData.compensation as any;
      if (compensation?.visible && compensation?.min && compensation?.max) {
        answer = `This candidate's compensation expectations are ${compensation.currency} ${compensation.min.toLocaleString()} - ${compensation.max.toLocaleString()} annually.`;
        sources = ['comp_json'];
      }
    } else if (questionLower.includes('location') || questionLower.includes('remote') || questionLower.includes('onsite')) {
      answer = `This candidate prefers ${profileData.locationMode} work.`;
      if (profile.commuteMiles) {
        answer += ` They're willing to commute up to ${profile.commuteMiles} miles.`;
      }
      sources = ['location_mode', 'commute_miles'];
    } else if (questionLower.includes('role') || questionLower.includes('position') || questionLower.includes('title')) {
      answer = `This candidate is interested in ${profileData.roles.join(', ')} roles.`;
      sources = ['roles'];
    }

    // Create system response
    const systemMessage = await prisma.qAMessage.create({
      data: {
        threadId: thread.id,
        role: 'system',
        content: answer,
        status: 'answered',
        sourcesJson: sources,
      },
    });

    // Create analytics event
    await prisma.analyticsEvent.create({
      data: {
        profileId: profile.id,
        eventType: 'qa_question',
        metadataJson: {
          question,
          answer,
          sources,
          threadId: thread.id,
        },
      },
    });

    return NextResponse.json({
      threadId: thread.id,
      question,
      answer,
      sources,
      confidence: sources.length > 0 ? 'high' : 'low',
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in Q&A:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Separate endpoint for escalation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = escalateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { threadId, message } = validation.data;

    // Update thread status to escalated
    await prisma.qAThread.update({
      where: { id: threadId },
      data: {},
    });

    // Create escalation message
    await prisma.qAMessage.create({
      data: {
        threadId,
        role: 'system',
        content: `Question escalated to candidate: ${message}`,
        status: 'escalated',
        sourcesJson: ['escalation'],
      },
    });

    // TODO: Send email to candidate with escalation
    // For MVP, just log it
    console.log(`Question escalated for thread ${threadId}: ${message}`);

    return NextResponse.json({
      success: true,
      message: 'Question escalated to candidate',
      threadId,
    });

  } catch (error) {
    console.error('Error escalating question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
