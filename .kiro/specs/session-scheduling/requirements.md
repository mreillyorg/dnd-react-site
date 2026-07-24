# Requirements Document

## Introduction

This document specifies the requirements for Session Scheduling and Party Coordination in a web-based Dungeons & Dragons companion site. The system enables Dungeon Masters and players to schedule gaming sessions, send RSVP invitations, track attendance, coordinate party availability, and receive reminders. Session scheduling enhances campaign management by providing tools to organize play dates, reduce no-shows, and maintain communication among party members. This feature integrates with the Campaign Tracking system to link scheduled sessions with session notes and history.

## Glossary

- **Scheduling_System**: The component responsible for managing session scheduling, RSVP tracking, and party coordination
- **Scheduled_Session**: A planned gaming session with a specific date, time, and duration
- **RSVP**: A response from a Campaign_Member indicating their attendance status for a Scheduled_Session
- **RSVP_Status**: The attendance response: attending, not_attending, maybe, or no_response
- **Session_Reminder**: An email or notification sent to Campaign_Member users before a Scheduled_Session
- **Recurring_Schedule**: A pattern for automatically creating Scheduled_Session records at regular intervals
- **Session_Frequency**: The recurrence pattern: weekly, bi_weekly, monthly, or custom
- **Party_Roster**: The list of all Campaign_Member users invited to participate in a Campaign
- **Availability_Calendar**: A view showing when Campaign_Member users are available for sessions
- **Attendance_Record**: Historical data tracking which Campaign_Member users attended past sessions
- **Session_Proposal**: A suggestion for a session date/time that Campaign_Member users can vote on
- **Vote**: A Campaign_Member's preference for a proposed session date/time
- **Quorum**: The minimum number of attending Campaign_Member users required for a session to proceed
- **Session_Location**: The venue for a Scheduled_Session: in_person address, online platform link, or hybrid
- **Virtual_Meeting_Link**: A URL for online platforms (Discord, Roll20, Foundry VTT, Zoom, etc.)
- **Time_Zone**: The time zone for displaying Scheduled_Session times to users
- **Session_Duration**: The planned length of a Scheduled_Session in hours
- **Session_Note_Link**: A connection between a Scheduled_Session and the Session_Note created after play
- **Attendance_Streak**: The consecutive number of sessions a Campaign_Member has attended
- **Campaign_Calendar**: A calendar view showing all Scheduled_Session records for a Campaign
- **Notification_Preference**: User settings controlling which session-related notifications they receive
- **No_Show**: An attendance status indicating a Campaign_Member RSVPed attending but did not show up


## Requirements

### Requirement 1: Session Scheduling

**User Story:** As a Dungeon Master, I want to schedule gaming sessions with specific dates and times, so that my players know when we're playing.

#### Acceptance Criteria

1. THE Scheduling_System SHALL allow the Campaign_Owner to create Scheduled_Session records within a Campaign
2. WHEN creating a Scheduled_Session, THE user SHALL provide date (required), start time (required), and Session_Duration (optional)
3. THE Scheduling_System SHALL allow the Campaign_Owner to set Session_Location as in_person (with address), online (with Virtual_Meeting_Link), or hybrid
4. WHEN Session_Location is online or hybrid, THE Scheduling_System SHALL require a Virtual_Meeting_Link
5. THE Scheduling_System SHALL validate Virtual_Meeting_Link format as a valid URL
6. THE Scheduling_System SHALL allow the Campaign_Owner to add an optional session title and description
7. THE Scheduling_System SHALL display all Scheduled_Session records on the Campaign_Calendar
8. THE Scheduling_System SHALL allow the Campaign_Owner to edit and delete Scheduled_Session records
9. WHEN a Scheduled_Session is created, THE Scheduling_System SHALL send email invitations to all Campaign_Member users
10. THE invitation email SHALL include Campaign name, session date/time (in recipient's Time_Zone), Session_Location details, and an RSVP link
11. THE Scheduling_System SHALL automatically convert session times to each Campaign_Member's Time_Zone preference
12. THE Scheduling_System SHALL allow the Campaign_Owner to set a Quorum (minimum attendees) for each Scheduled_Session


### Requirement 2: RSVP Tracking

**User Story:** As a player, I want to RSVP for scheduled sessions, so that the DM knows if I can attend.

#### Acceptance Criteria

1. THE Scheduling_System SHALL allow Campaign_Member users to set their RSVP_Status for each Scheduled_Session
2. THE RSVP_Status options SHALL be: attending, not_attending, maybe, or no_response
3. WHEN a Campaign_Member updates their RSVP_Status, THE Scheduling_System SHALL send a notification email to the Campaign_Owner
4. THE Scheduling_System SHALL display a list of RSVP responses on the Scheduled_Session detail view showing each Campaign_Member's name and RSVP_Status
5. THE Scheduling_System SHALL display RSVP counts (e.g., "Attending: 4, Maybe: 1, Not Attending: 1") on the Campaign_Calendar
6. THE Scheduling_System SHALL highlight Scheduled_Session records on the Campaign_Calendar with color coding based on RSVP count vs. Quorum
7. WHEN the number of attending responses drops below Quorum, THE Scheduling_System SHALL send an alert email to the Campaign_Owner
8. THE Scheduling_System SHALL allow Campaign_Member users to change their RSVP_Status at any time before the session starts
9. THE Scheduling_System SHALL display RSVP_Status with visual indicators (icons or badges) next to Campaign_Member names
10. THE Scheduling_System SHALL provide a one-click RSVP link in invitation emails allowing users to respond without logging in


### Requirement 3: Session Reminders

**User Story:** As a player or Dungeon Master, I want to receive reminders before scheduled sessions, so that I don't forget when we're playing.

#### Acceptance Criteria

1. THE Scheduling_System SHALL send Session_Reminder emails to all Campaign_Member users with RSVP_Status attending or maybe
2. THE Scheduling_System SHALL send a Session_Reminder 24 hours before the Scheduled_Session start time
3. THE Scheduling_System SHALL send a Session_Reminder 1 hour before the Scheduled_Session start time (optional, user preference)
4. THE Session_Reminder email SHALL include Campaign name, session date/time, Session_Location, Virtual_Meeting_Link (if applicable), and RSVP_Status
5. THE Scheduling_System SHALL allow users to configure Notification_Preference settings for Session_Reminder timing (24 hours, 1 hour, custom)
6. THE Scheduling_System SHALL NOT send Session_Reminder emails to Campaign_Member users with RSVP_Status not_attending
7. THE Scheduling_System SHALL send a Session_Reminder to the Campaign_Owner regardless of their RSVP_Status
8. THE Session_Reminder SHALL include a direct link to the Virtual_Meeting_Link if the session is online or hybrid
9. THE Scheduling_System SHALL allow users to disable Session_Reminder emails entirely via Notification_Preference
10. THE Scheduling_System SHALL provide in-app notifications as an alternative to email reminders


### Requirement 4: Recurring Sessions

**User Story:** As a Dungeon Master, I want to schedule recurring sessions, so that I don't have to manually create a session every week.

#### Acceptance Criteria

1. THE Scheduling_System SHALL allow the Campaign_Owner to create a Recurring_Schedule for a Campaign
2. WHEN creating a Recurring_Schedule, THE user SHALL select Session_Frequency: weekly, bi_weekly, monthly, or custom
3. THE Scheduling_System SHALL allow the Campaign_Owner to set the day of week and start time for recurring sessions
4. THE Scheduling_System SHALL allow the Campaign_Owner to set a recurrence end date or leave it open-ended
5. WHEN a Recurring_Schedule is saved, THE Scheduling_System SHALL automatically create Scheduled_Session records for the next 4 occurrences
6. THE Scheduling_System SHALL create new Scheduled_Session records for recurring sessions 30 days in advance as the schedule progresses
7. THE Scheduling_System SHALL allow the Campaign_Owner to edit a single Scheduled_Session without affecting other occurrences
8. THE Scheduling_System SHALL allow the Campaign_Owner to edit the Recurring_Schedule, which updates all future Scheduled_Session records
9. THE Scheduling_System SHALL allow the Campaign_Owner to cancel a single occurrence without deleting the Recurring_Schedule
10. THE Scheduling_System SHALL display a "recurring" badge on Scheduled_Session records that are part of a Recurring_Schedule


### Requirement 5: Attendance Tracking

**User Story:** As a Dungeon Master, I want to track who actually attended sessions, so that I can see participation history.

#### Acceptance Criteria

1. THE Scheduling_System SHALL allow the Campaign_Owner to mark actual attendance after a Scheduled_Session occurs
2. WHEN a session date passes, THE Scheduling_System SHALL prompt the Campaign_Owner to confirm attendance
3. THE Campaign_Owner SHALL be able to mark each Campaign_Member as attended, No_Show, or excused_absence
4. THE Scheduling_System SHALL store Attendance_Record data for each Scheduled_Session showing which Campaign_Member users attended
5. THE Scheduling_System SHALL display attendance history on the Campaign_Member profile showing total sessions attended and attendance percentage
6. THE Scheduling_System SHALL track Attendance_Streak for each Campaign_Member (consecutive sessions attended)
7. THE Scheduling_System SHALL display Attendance_Streak badges on Campaign_Member profiles for streaks of 5+ sessions
8. THE Scheduling_System SHALL display aggregate attendance statistics on the Campaign dashboard showing most/least frequent attendees
9. THE Scheduling_System SHALL link Attendance_Record to Session_Note records created for the session
10. THE Scheduling_System SHALL allow the Campaign_Owner to export attendance history as a CSV file


### Requirement 6: Session Proposals and Voting

**User Story:** As a Campaign Member, I want to propose session dates and vote on them, so that the party can collaboratively choose when to play.

#### Acceptance Criteria

1. THE Scheduling_System SHALL allow any Campaign_Member to create Session_Proposal records suggesting session dates and times
2. WHEN creating a Session_Proposal, THE user SHALL provide multiple proposed date/time options (minimum 2, maximum 10)
3. THE Scheduling_System SHALL send notification emails to all Campaign_Member users when a Session_Proposal is created
4. THE Scheduling_System SHALL allow Campaign_Member users to Vote on each proposed date/time option
5. EACH Campaign_Member SHALL be able to Vote for multiple options indicating all dates that work for them
6. THE Scheduling_System SHALL display Vote counts for each proposed option in real-time
7. THE Scheduling_System SHALL highlight the option with the most Vote records
8. THE Scheduling_System SHALL allow the Campaign_Owner to convert a Session_Proposal option into a Scheduled_Session
9. WHEN a Session_Proposal is converted to a Scheduled_Session, THE Scheduling_System SHALL automatically set RSVP_Status to attending for all Campaign_Member users who Voted for that option
10. THE Scheduling_System SHALL close voting on a Session_Proposal after 7 days or when the Campaign_Owner manually closes it
11. THE Scheduling_System SHALL display active Session_Proposal records on the Campaign dashboard


### Requirement 7: Campaign Calendar View

**User Story:** As a user, I want to see all scheduled sessions in a calendar view, so that I can visualize when sessions are happening.

#### Acceptance Criteria

1. THE Scheduling_System SHALL provide a Campaign_Calendar view displaying all Scheduled_Session records
2. THE Campaign_Calendar SHALL support month, week, and agenda (list) view modes
3. THE Campaign_Calendar SHALL display each Scheduled_Session as a calendar event showing session title, date/time, and RSVP count
4. THE Campaign_Calendar SHALL use color coding to indicate session status: confirmed (enough RSVPs), tentative (below Quorum), or past
5. THE Campaign_Calendar SHALL allow users to click on a Scheduled_Session to view full details including Session_Location, RSVPs, and description
6. THE Campaign_Calendar SHALL display the current user's RSVP_Status prominently on each session event
7. THE Campaign_Calendar SHALL allow users to filter by RSVP_Status (show only sessions I'm attending, show all sessions)
8. THE Campaign_Calendar SHALL display recurring sessions with a distinctive visual marker
9. THE Campaign_Calendar SHALL provide an export option to download sessions as an iCal file for import into external calendar apps
10. THE Campaign_Calendar SHALL integrate with Google Calendar, Apple Calendar, and Outlook via calendar subscription feeds
11. THE Campaign_Calendar SHALL display time zone selector allowing users to view sessions in their preferred Time_Zone


### Requirement 8: Party Availability Tracking

**User Story:** As a Dungeon Master, I want to see when party members are generally available, so that I can schedule sessions that work for everyone.

#### Acceptance Criteria

1. THE Scheduling_System SHALL allow Campaign_Member users to set their general availability by day of week and time ranges
2. THE Availability_Calendar SHALL display an overlay showing when the most Campaign_Member users are available
3. THE Scheduling_System SHALL suggest optimal session times based on overlapping availability of Campaign_Member users
4. WHEN creating a Scheduled_Session, THE Scheduling_System SHALL highlight suggested times that work for the most people
5. THE Scheduling_System SHALL calculate and display "best time" recommendations showing day/time combinations with maximum availability
6. THE Availability_Calendar SHALL allow Campaign_Member users to mark blackout dates when they are unavailable (vacations, work travel, etc.)
7. THE Scheduling_System SHALL warn the Campaign_Owner when scheduling a session during a Campaign_Member's blackout date
8. THE Scheduling_System SHALL display availability heatmap on the Campaign_Calendar showing which days have the most available players
9. THE Scheduling_System SHALL allow Campaign_Member users to update their availability preferences at any time
10. THE Scheduling_System SHALL send a reminder email every 90 days asking Campaign_Member users to review and update their availability


### Requirement 9: Integration with Campaign System

**User Story:** As a Dungeon Master, I want scheduled sessions to link with session notes, so that planning and documentation are connected.

#### Acceptance Criteria

1. THE Scheduling_System SHALL link Scheduled_Session records to Session_Note records created in the Campaign_System
2. WHEN a Scheduled_Session date passes and a Session is created in the Campaign_System, THE Scheduling_System SHALL suggest linking them
3. THE Campaign_System SHALL display the Scheduled_Session details (date, attendees) when viewing a linked Session_Note
4. THE Campaign_Calendar SHALL indicate which Scheduled_Session records have linked Session_Note records with a "completed" badge
5. THE Scheduling_System SHALL allow the Campaign_Owner to create a Session_Note directly from a Scheduled_Session
6. WHEN a Session_Note is created from a Scheduled_Session, THE Campaign_System SHALL pre-populate the Session date and attendee list
7. THE Scheduling_System SHALL display upcoming Scheduled_Session records on the Campaign dashboard alongside recent Session_Note records
8. THE Scheduling_System SHALL allow navigation between Scheduled_Session and linked Session_Note in both directions


### Requirement 10: Notification Preferences

**User Story:** As a user, I want to control which session-related notifications I receive, so that I'm not overwhelmed by emails.

#### Acceptance Criteria

1. THE Scheduling_System SHALL provide Notification_Preference settings for each user
2. THE Notification_Preference settings SHALL include toggles for: session_invitations, rsvp_reminders, session_reminders, proposal_notifications, and attendance_confirmations
3. THE Scheduling_System SHALL respect user Notification_Preference settings when sending all notification emails
4. THE Scheduling_System SHALL allow users to choose notification delivery method: email, in-app, or both
5. THE Scheduling_System SHALL provide a "digest" option consolidating multiple notifications into a single daily summary email
6. THE Scheduling_System SHALL include an "unsubscribe from this campaign's notifications" link in all notification emails
7. WHEN a user unsubscribes from campaign notifications, THE Scheduling_System SHALL disable all notification types for that Campaign while maintaining their Campaign_Member status
8. THE Scheduling_System SHALL allow users to configure different Notification_Preference settings per Campaign
9. THE Scheduling_System SHALL display notification preferences on the user account settings page
10. THE Scheduling_System SHALL keep critical notifications (session cancellations) enabled regardless of Notification_Preference settings



