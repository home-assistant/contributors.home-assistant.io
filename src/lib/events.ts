// The events of the contributor community, from three public calendars:
//
// - The Google Calendar of the Open Home Foundation developers, with the
//   release dates and the community syncs.
// - The Home Assistant Meetups calendar on Luma.
// - The Community Day calendar on Luma: one day with local meetups all over
//   the world. Those are shown as one event, with the meetups inside it, so
//   they don't bury everything else.
//
// The build reads each ICS feed once, expands the recurring events, and keeps
// the ones coming up, mixed in one timeline. The events page and the homepage
// show them.
//
// Nothing here may fail the build. A feed that can't be read is left out.
// When none can be read, the pages show the subscribe links and a line that
// the calendar couldn't be loaded.

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ICAL from "ical.js";

const CALENDAR_ID = "p07n98go11onamd08d0kmq6jhs@group.calendar.google.com";

export const CALENDAR = {
  // Adds the calendar to the Google Calendar of the visitor.
  google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(CALENDAR_ID)}`,
  // For Apple Calendar, Outlook, Thunderbird, and every other app that can
  // subscribe to a calendar by URL.
  ics: `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`,
};

// A local meetup of a Community Day.
export interface Meetup {
  title: string;
  place?: string;
  url?: string;
}

export interface CalendarEvent {
  // Unique on the events page, so other pages can link to one event, like
  // matter-monthly-community-sync-2026-10-12.
  id: string;
  title: string;
  start: Date;
  end: Date;
  // An all-day event, like a release day. Its date is the same everywhere,
  // so it has no time and no time zone.
  allDay: boolean;
  // A public page about the event, if its description or location has one.
  url?: string;
  // What the event is about, from its description, as paragraphs of text.
  description: string[];
  // The video call to join, like a Google Meet link.
  joinUrl?: string;
  // The shared document with the agenda and the notes of the meeting.
  notesUrl?: string;
  // Where it happens, for an event in a place, like a meetup.
  place?: string;
  // The meetups of a Community Day.
  meetups?: Meetup[];
}

interface Feed {
  id: string;
  url: string;
  // Turns the events of this feed into the events of the timeline.
  shape?: (events: CalendarEvent[]) => CalendarEvent[];
}

// A new Community Day calendar is one more entry here.
const FEEDS: Feed[] = [
  { id: "developers", url: CALENDAR.ics },
  {
    id: "meetups",
    url: "https://api.lu.ma/ics/get?entity=calendar&id=cal-6Tm2FkWzoBpLXWr",
  },
  {
    id: "community-day",
    url: "https://api.lu.ma/ics/get?entity=calendar&id=cal-QXZXEJrvB3UaI63",
    shape: (events) => communityDays(events, "https://luma.com/communityday2026"),
  },
];

export interface UpcomingEvents {
  // False when the feed couldn't be read. The events are empty then.
  loaded: boolean;
  events: CalendarEvent[];
}

// How far ahead the pages look.
const WINDOW_DAYS = 92;
// Keep the build moving when Google is slow.
const FETCH_TIMEOUT_MS = 10_000;
// A local build or `pnpm dev` reuses the feed for a while, instead of asking
// Google on every run. A new build on Netlify is at least this old.
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const CACHE_DIR = path.join(process.cwd(), "node_modules/.cache/events");

// The syncs are open to everyone, so their Google Meet link and meeting notes
// show on the site, like they do in the calendar itself. The phone dial-in
// numbers and PINs, and the recordings and chats of past meetings, stay off
// the site: they are in the calendar for those who subscribe.
//
// A page about the event only shows when it goes to one of these public
// sites.
const PUBLIC_HOSTS = [
  "home-assistant.io",
  "openhomefoundation.org",
  "esphome.io",
  "music-assistant.io",
  "github.com",
  "youtube.com",
  "youtu.be",
  "luma.com",
  "lu.ma",
];

let upcoming: Promise<UpcomingEvents> | undefined;

// Every page that shows events shares one read of the feed per build.
export function getUpcomingEvents(): Promise<UpcomingEvents> {
  upcoming ??= loadUpcomingEvents();
  return upcoming;
}

async function loadUpcomingEvents(): Promise<UpcomingEvents> {
  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const results = await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const events = expandEvents(await readFeed(feed), now, until);
        return feed.shape ? feed.shape(events) : events;
      } catch (error) {
        console.warn(`[events] Could not load the ${feed.id} calendar, its events are left out: ${error}`);
        return undefined;
      }
    }),
  );

  const loaded = results.filter((events) => events !== undefined);
  const events = loaded.flat().sort((a, b) => a.start.getTime() - b.start.getTime());

  return { loaded: loaded.length > 0, events };
}

async function readFeed(feed: Feed): Promise<string> {
  const cacheFile = path.join(CACHE_DIR, `${feed.id}.ics`);

  try {
    if (Date.now() - statSync(cacheFile).mtimeMs < CACHE_MAX_AGE_MS) {
      return readFileSync(cacheFile, "utf8");
    }
  } catch {
    // No cached feed yet.
  }

  const response = await fetch(feed.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`the feed answered with HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text.startsWith("BEGIN:VCALENDAR")) {
    throw new Error("the feed is not an iCalendar file");
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cacheFile, text);
  return text;
}

// Every event that is not over yet and starts before `until`, recurring ones
// expanded, sorted by start.
export function expandEvents(feed: string, now: Date, until: Date): CalendarEvent[] {
  const calendar = new ICAL.Component(ICAL.parse(feed));

  // The feed carries the definition of every time zone it uses. Register
  // them before reading any event, so "19:00 Europe/Amsterdam" is read right.
  for (const zone of calendar.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(new ICAL.Timezone(zone));
  }

  // A moved or changed instance of a recurring event is an event of its own
  // with the same UID and a RECURRENCE-ID. Tie it to its series, so the
  // series shows the changed instance instead of the original one.
  const series = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const component of calendar.getAllSubcomponents("vevent")) {
    // Without a list of exceptions, ical.js ties every moved instance in the
    // whole feed to a series, whatever its UID. Pass an empty one, and tie
    // them below, each to its own series only.
    const event = new ICAL.Event(component, { exceptions: [] });
    if (event.isRecurrenceException()) {
      exceptions.push(event);
    } else {
      series.set(event.uid, event);
    }
  }

  const singles: ICAL.Event[] = [];
  for (const exception of exceptions) {
    const parent = series.get(exception.uid);
    if (parent) {
      parent.relateException(exception);
    } else {
      singles.push(exception);
    }
  }

  const events: CalendarEvent[] = [];
  const add = (event: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
    if (isCancelled(event)) {
      return;
    }

    const calendarEvent = toCalendarEvent(event, start, end);
    if (calendarEvent.end > now && calendarEvent.start < until) {
      events.push(calendarEvent);
    }
  };

  for (const event of [...series.values(), ...singles]) {
    if (!event.isRecurring()) {
      add(event, event.startDate, event.endDate);
      continue;
    }

    // Walk the series from its first instance. An instance can be moved to
    // another day, so look a month past the window before stopping.
    const stopAt = ICAL.Time.fromJSDate(new Date(until.getTime() + 31 * 24 * 60 * 60 * 1000), true);
    const iterator = event.iterator();
    const shownExceptions = new Set<ICAL.Event>();
    for (let next = iterator.next(); next && next.compare(stopAt) < 0; next = iterator.next()) {
      const details = event.getOccurrenceDetails(next);
      add(details.item, details.startDate, details.endDate);

      if (details.item !== event) {
        shownExceptions.add(details.item);
      }
    }

    // An instance can also be moved from further away than that month, like
    // December's meetup moved to next week. The walk stopped before its
    // original date, so add the moved instances it did not reach. add()
    // still keeps only the ones in the window.
    for (const exception of Object.values(event.exceptions)) {
      if (!shownExceptions.has(exception)) {
        add(exception, exception.startDate, exception.endDate);
      }
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function isCancelled(event: ICAL.Event): boolean {
  return String(event.component.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED";
}

function toCalendarEvent(event: ICAL.Event, start: ICAL.Time, end: ICAL.Time): CalendarEvent {
  const allDay = start.isDate;
  const title = event.summary?.trim() || "Untitled event";
  // An all-day event is a date, not a moment: keep it at midnight UTC, so
  // the date reads the same in every time zone.
  const startDate = allDay ? dateOnly(start) : start.toJSDate();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // The anchor of the event on the events page, which the homepage links
  // to. Two events with the same title can be on one day, at different
  // times, so a timed event gets its UTC start time too, like
  // "community-sync-2026-10-13-1700".
  const day = startDate.toISOString().slice(0, 10);
  const time = startDate.toISOString().slice(11, 16).replace(":", "");

  return {
    id: allDay ? `${slug}-${day}` : `${slug}-${day}-${time}`,
    title,
    start: startDate,
    end: allDay ? dateOnly(end) : end.toJSDate(),
    allDay,
    url: publicLink(event),
    description: describe(event.description),
    joinUrl: joinLink(event),
    notesUrl: notesLink(event),
    place: placeOf(event),
  };
}

// The venue of an event in a place. Online events have a link as location.
function placeOf(event: ICAL.Event): string | undefined {
  const location = event.location?.trim();
  return location && !/^https?:\/\//.test(location) ? location : undefined;
}

// All meetups of a Community Day calendar as one event on the day most of them
// happen. Time zones spread them over two dates, from Auckland to San Francisco.
function communityDays(events: CalendarEvent[], url: string): CalendarEvent[] {
  if (events.length === 0) {
    return [];
  }

  const perDay = new Map<string, number>();
  for (const event of events) {
    const day = event.start.toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const [day] = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const start = new Date(`${day}T00:00:00Z`);

  return [
    {
      id: `community-day-${day}`,
      title: "Open Home Foundation Community Day",
      start,
      end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
      allDay: true,
      url,
      description: [`Local meetups all over the world, on one day. ${events.length} are planned so far.`],
      meetups: events.map(({ title, place, url }) => ({ title, place, url })),
    },
  ];
}

// Google appends how to join to the description, in the language of the
// organizer: the Meet link, the phone numbers, and the PINs. That part is
// cut off. The rest is HTML from the calendar editor, turned into plain text.
const JOIN_INSTRUCTIONS = /^.*(Google Meet|meet\.google\.com|tel\.meet|-::~).*$/m;

function describe(description: string | null): string[] {
  // Luma only links to the event page, which the title already links to.
  if (!description || description.startsWith("Get up-to-date information at:")) {
    return [];
  }

  const instructions = description.search(JOIN_INSTRUCTIONS);
  const text = (instructions === -1 ? description : description.slice(0, instructions))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function joinLink(event: ICAL.Event): string | undefined {
  const text = [event.location, event.description].filter(Boolean).join(" ");
  return text.match(/https:\/\/meet\.google\.com\/[a-z]+-[a-z]+-[a-z]+/)?.[0];
}

// Google attaches the notes document of a recurring meeting to the event,
// next to the recordings and chats of past meetings. Only the notes show.
function notesLink(event: ICAL.Event): string | undefined {
  for (const attachment of event.component.getAllProperties("attach")) {
    const name = String(attachment.getParameter("filename") ?? "");
    if (/meeting notes$/i.test(name.trim())) {
      return String(attachment.getFirstValue());
    }
  }

  return undefined;
}

function dateOnly(time: ICAL.Time): Date {
  return new Date(Date.UTC(time.year, time.month - 1, time.day));
}

// The first link to a public site, from the URL, the location, or the
// description of the event.
function publicLink(event: ICAL.Event): string | undefined {
  const text = [event.component.getFirstPropertyValue("url"), event.location, event.description]
    .filter(Boolean)
    .join(" ");

  for (const [candidate] of text.matchAll(/https?:\/\/[^\s<>"'\\]+/g)) {
    try {
      const url = new URL(candidate.replace(/[.,)]+$/, ""));
      const host = url.hostname.replace(/^www\./, "");
      if (PUBLIC_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
        return url.href;
      }
    } catch {
      // Not a URL after all.
    }
  }

  return undefined;
}
