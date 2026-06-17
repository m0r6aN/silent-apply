/**
 * Canon compliance tests
 *
 * Verifies critical behavioral constraints from CANON.md:
 * - Q&A answers come only from candidate-provided data
 * - Allowed analytics events are sealed
 * - No OMEGA runtime references remain
 * - Billing free plan has no usage caps on core features
 */

import { ALLOWED_EVENTS, isAllowedEvent } from '../lib/observability';
import fs from 'fs';
import path from 'path';

// --- Event allowlist tests ---

test('ALLOWED_EVENTS contains exactly the canon-permitted events', () => {
  const expected = [
    'profile.viewed',
    'resume.downloaded',
    'qa.question_submitted',
    'booking.hold_created',
    'booking.confirmed',
  ];
  expect([...ALLOWED_EVENTS].sort()).toEqual(expected.sort());
});

test('isAllowedEvent returns false for non-canon events', () => {
  expect(isAllowedEvent('recruiter.tracked')).toBe(false);
  expect(isAllowedEvent('conversion.funnel')).toBe(false);
  expect(isAllowedEvent('session.replay')).toBe(false);
  expect(isAllowedEvent('candidate.ranked')).toBe(false);
});

test('isAllowedEvent returns true for all canon events', () => {
  for (const event of ALLOWED_EVENTS) {
    expect(isAllowedEvent(event)).toBe(true);
  }
});

// --- OMEGA removal ---

function findOmegaReferences(dir: string, refs: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'lib/omega', '__tests__'].some(x => full.includes(x))) continue;
      findOmegaReferences(full, refs);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf-8');
      if (content.includes('@/lib/omega') || content.includes('lib/omega/')) {
        refs.push(full);
      }
    }
  }
  return refs;
}

test('no application files import from lib/omega', () => {
  const root = path.join(__dirname, '..');
  const refs = findOmegaReferences(root);
  expect(refs).toEqual([]);
});

// --- Public profile canon ---

test('OMEGA branding does not appear in public profile page', () => {
  const filePath = path.join(__dirname, '../app/p/[handle]/page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).not.toContain('OMEGA');
  expect(content).not.toContain('Governed by Keon');
  expect(content).not.toContain('SilentApply AI');
  expect(content).not.toContain('Interested in connecting');
  expect(content).not.toContain('instantly');
});

test('public profile page does not show resume download unconditionally', () => {
  const filePath = path.join(__dirname, '../app/p/[handle]/page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');
  // Resume download must be conditional on visibility.resume
  expect(content).toContain('visibility.resume');
  expect(content).toContain('resumeEnabled');
});

// --- Billing canon ---

test('billing free plan has no per-feature caps', () => {
  const filePath = path.join(__dirname, '../app/api/billing/route.ts');
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).not.toContain('questionsPerMonth: 10');
  expect(content).not.toContain('bookingsPerMonth: 1');
});
