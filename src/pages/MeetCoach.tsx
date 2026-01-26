/**
 * MeetCoach Page
 *
 * Renders the live AI coaching experience for Google Meet.
 * Uses the canonical Figma 1:1 LiveMeetCoach implementation.
 *
 * For handover: All live coaching logic and UI is in LiveMeetCoach.
 */
import LiveMeetCoach from '../components/LiveMeetCoach';

export default function MeetCoach() {
  return <LiveMeetCoach />;
}
