
import { useState } from "react";

const wedding = {
  couple: "Aarav & Ananya",
  date: "Sunday, 22 November 2026",
  time: "10:30 AM onwards",
  venue: "The Grand Wedding Hall",
  address: "Mysuru, Karnataka, India",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("The Grand Wedding Hall, Mysuru, Karnataka, India"),
  bridePhoto:
    "https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=900&q=85",
  groomPhoto:
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85",
};

const schedule = [
  { time: "10:30 AM", title: "Guest arrival", detail: "Welcome and refreshments" },
  { time: "11:30 AM", title: "Wedding ceremony", detail: "The beginning of forever" },
  { time: "12:30 PM", title: "Celebration & lunch", detail: "Food, family and happy moments" },
];

const weddingEvents = ["Wedding", "Reception", "Haldi", "Mehendi"];

const emptyAnswers = {
  Wedding: "",
  Reception: "",
  Haldi: "",
  Mehendi: "",
};

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function readSavedResponses() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("shaadysync_guest_rsvps") || "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function readAdminGuests() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("shaadysync-guests") || "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getAnswersForGuest(responses, guestName) {
  const matching = responses.filter(
    (response) =>
      normalizeName(response.name || "") === normalizeName(guestName)
  );

  const answers = { ...emptyAnswers };

  matching.forEach((response) => {
    weddingEvents.forEach((eventName) => {
      const savedEvent = response.eventRsvps?.[eventName];

      if (savedEvent && typeof savedEvent === "object") {
        answers[eventName] =
          savedEvent.attendance ||
          (savedEvent.status === "Confirmed"
            ? "yes"
            : savedEvent.status === "Declined"
              ? "no"
              : "");
      } else if (typeof savedEvent === "string") {
        answers[eventName] =
          savedEvent === "Confirmed" || savedEvent === "Yes"
            ? "yes"
            : savedEvent === "Declined" || savedEvent === "No"
              ? "no"
              : "";
      }

      if (response.event === eventName) {
        answers[eventName] =
          response.attendance ||
          (response.status === "Confirmed"
            ? "yes"
            : response.status === "Declined"
              ? "no"
              : answers[eventName]);
      }
    });
  });

  return answers;
}

export default function GuestRSVP() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [answers, setAnswers] = useState({ ...emptyAnswers });
  const [guestCount, setGuestCount] = useState("1");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function loadGuestResponse(guestName) {
    setSubmitted(false);

    if (!guestName.trim()) {
      setPhone("");
      setAnswers({ ...emptyAnswers });
      setGuestCount("1");
      setMessage("");
      return;
    }

    const responses = readSavedResponses();
    const matching = responses.filter(
      (response) =>
        normalizeName(response.name || "") === normalizeName(guestName)
    );

    const adminGuest = readAdminGuests().find(
      (guest) =>
        normalizeName(guest.name || "") === normalizeName(guestName)
    );

    setAnswers(getAnswersForGuest(responses, guestName));

    const latest = matching[matching.length - 1];

    setPhone(latest?.phone || adminGuest?.phone || "");
    setGuestCount(
      String(latest?.guestCount > 0 ? latest.guestCount : adminGuest?.familySize || 1)
    );
    setMessage(latest?.message || adminGuest?.message || "");
  }

  function handleAnswerChange(eventName, answer) {
    setAnswers((current) => ({
      ...current,
      [eventName]: answer,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const guestName = name.trim();
    const cleanedPhone = phone.replace(/\D/g, "");

    if (!guestName) {
      alert("Please enter your full name.");
      return;
    }

    if (cleanedPhone.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    const unanswered = weddingEvents.filter(
      (eventName) => !answers[eventName]
    );

    if (unanswered.length > 0) {
      alert(
        "Please select Yes or No for every event: " +
          unanswered.join(", ")
      );
      return;
    }

    try {
      const previous = readSavedResponses();
      const adminGuests = readAdminGuests();
      const submittedAt = new Date().toISOString();

      const matchingResponses = previous.filter(
        (response) =>
          normalizeName(response.name || "") === normalizeName(guestName)
      );

      const existingAdminGuest = adminGuests.find(
        (guest) =>
          normalizeName(guest.name || "") === normalizeName(guestName)
      );

      // Store each event as a status string so the existing
      // admin dashboard can read it using getEventStatus().
      const eventRsvps = {};

      weddingEvents.forEach((eventName) => {
        eventRsvps[eventName] =
          answers[eventName] === "yes" ? "Confirmed" : "Declined";
      });

      const response = {
        id: matchingResponses[0]?.id ?? existingAdminGuest?.id ?? Date.now(),
        name: guestName,
        phone: cleanedPhone,
        eventRsvps,
        guestCount: Number(guestCount),
        message: message.trim(),
        submittedAt,
      };

      const updatedResponses = [
        ...previous.filter(
          (savedResponse) =>
            normalizeName(savedResponse.name || "") !==
            normalizeName(guestName)
        ),
        response,
      ];

      const weddingStatus = eventRsvps.Wedding;

      let updatedAdminGuests;

      if (existingAdminGuest) {
        updatedAdminGuests = adminGuests.map((guest) => {
          if (guest.id !== existingAdminGuest.id) return guest;

          return {
            ...guest,
            name: guestName,
            phone: cleanedPhone,
            familySize: Number(guestCount),
            status: weddingStatus,
            eventRsvps: {
              ...(guest.eventRsvps || {}),
              ...eventRsvps,
            },
            rsvpSubmittedAt: submittedAt,
            message: message.trim(),
          };
        });
      } else {
        updatedAdminGuests = [
          {
            id: response.id,
            name: guestName,
            phone: cleanedPhone,
            side: "Both",
            event: "Wedding",
            familySize: Number(guestCount),
            status: weddingStatus,
            eventRsvps,
            rsvpSubmittedAt: submittedAt,
            message: message.trim(),
          },
          ...adminGuests,
        ];
      }

      // Save both records before showing success.
      localStorage.setItem(
        "shaadysync_guest_rsvps",
        JSON.stringify(updatedResponses)
      );

      localStorage.setItem(
        "shaadysync-guests",
        JSON.stringify(updatedAdminGuests)
      );

      setSubmitted(true);
    } catch (error) {
      console.error("RSVP save error:", error);
      alert("Unable to save your response. Please try again.");
    }
  }

  return (
    <main className="guest-page">
      <header className="guest-topbar">
        <a className="brand" href="/src/guest.html">
          <span className="brand-mark">S</span>
          <span>ShaadiSync</span>
        </a>
        <span className="invitation-label">A SPECIAL INVITATION</span>
      </header>

      <section className="invitation-card invitation-redesigned">
        <div className="floral floral-top" aria-hidden="true">✿ ❀ ✿</div>

        <div className="invitation-content">
          <section className="invitation-hero">
            <span className="eyebrow">TOGETHER WITH THEIR FAMILIES</span>
            <h1>You're Invited</h1>
            <p className="intro">
              With love and joy, we invite you to celebrate
              the beginning of our forever.
            </p>

            <div className="ornament" aria-hidden="true">
              <span />
              <span className="ornament-heart">♥</span>
              <span />
            </div>

            <p className="celebration-label">THE WEDDING OF</p>
            <h2 className="couple-names">{wedding.couple}</h2>
            <p className="wedding-date">{wedding.date}</p>
            <p className="wedding-time">{wedding.time}</p>
          </section>

          <section className="couple-gallery" aria-label="Meet the couple">
            <article className="couple-photo-card">
              <img src={wedding.bridePhoto} alt="Bride portrait" loading="lazy" />
              <div className="couple-photo-caption">
                <span>THE BRIDE</span>
                <h3>Ananya</h3>
              </div>
            </article>

            <article className="couple-photo-card">
              <img src={wedding.groomPhoto} alt="Groom wedding portrait" loading="lazy" />
              <div className="couple-photo-caption">
                <span>THE GROOM</span>
                <h3>Aarav</h3>
              </div>
            </article>

            <span className="gallery-heart" aria-hidden="true">♥</span>
          </section>

          <section className="event-overview-grid">
            <section className="venue-card">
              <span className="venue-icon" aria-hidden="true">⌖</span>
              <div className="venue-details">
                <span className="venue-label">WHERE WE CELEBRATE</span>
                <h3>{wedding.venue}</h3>
                <p>{wedding.address}</p>
                <a
                  className="directions-link"
                  href={wedding.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get directions on Google Maps ↗
                </a>
              </div>
            </section>

            <section className="wedding-details">
              <div className="details-heading">
                <span className="eyebrow">SAVE THE DATE</span>
                <h2>A day to remember</h2>
                <p>Our plans for the special day.</p>
              </div>

              <div className="schedule-list">
                {schedule.map((item, index) => (
                  <article className="schedule-item" key={item.title}>
                    <div className="schedule-marker">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="schedule-copy">
                      <span className="schedule-time">{item.time}</span>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <div className="invitation-divider"><span>❀</span></div>

          {!submitted ? (
            <form className="rsvp-form" onSubmit={handleSubmit}>
              <div className="form-heading">
                <span className="eyebrow">KINDLY RESPOND</span>
                <h2>Will you join us?</h2>
                <p>Your presence would mean the world to us.</p>
              </div>

              <label htmlFor="guest-name">Your full name *</label>
              <input
                id="guest-name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSubmitted(false);
                }}
                onBlur={() => loadGuestResponse(name)}
                required
                maxLength={100}
              />

              <label htmlFor="guest-phone">Your phone number *</label>
              <input
                id="guest-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="Enter your 10-digit phone number"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setSubmitted(false);
                }}
                required
                maxLength={15}
              />
              <p className="privacy-note">
                Your phone number will be included in the guest list for the event organizer.
              </p>

              <p className="privacy-note">
                Choose Yes or No for every celebration, then submit once.
              </p>

              {weddingEvents.map((eventName) => (
                <div className="event-rsvp-choice" key={eventName}>
                  <label>{eventName} — can you attend? *</label>
                  <div className="attendance-options">
                    <button
                      type="button"
                      className={
                        answers[eventName] === "yes"
                          ? "attendance-option selected"
                          : "attendance-option"
                      }
                      onClick={() => handleAnswerChange(eventName, "yes")}
                      aria-pressed={answers[eventName] === "yes"}
                    >
                      <span className="option-icon">♡</span>
                      <span>
                        <strong>Yes</strong>
                        <small>I'll be there!</small>
                      </span>
                    </button>

                    <button
                      type="button"
                      className={
                        answers[eventName] === "no"
                          ? "attendance-option selected"
                          : "attendance-option"
                      }
                      onClick={() => handleAnswerChange(eventName, "no")}
                      aria-pressed={answers[eventName] === "no"}
                    >
                      <span className="option-icon">♡</span>
                      <span>
                        <strong>No</strong>
                        <small>Unable to attend</small>
                      </span>
                    </button>
                  </div>
                </div>
              ))}

              <label htmlFor="guest-count">Number of people attending</label>
              <select
                id="guest-count"
                value={guestCount}
                onChange={(event) => setGuestCount(event.target.value)}
              >
                <option value="1">Just me</option>
                <option value="2">2 people</option>
                <option value="3">3 people</option>
                <option value="4">4 people</option>
                <option value="5">5 people</option>
              </select>

              <label htmlFor="guest-message">A little message (optional)</label>
              <textarea
                id="guest-message"
                rows={3}
                maxLength={300}
                placeholder="Send your wishes to the couple..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />

              <button className="submit-rsvp" type="submit">
                Confirm your blessings
                <span> →</span>
              </button>

              <p className="privacy-note">THANK YOU ♡</p>
            </form>
          ) : (
            <div className="success-panel" role="status">
              <span className="success-icon">✓</span>
              <h2>Your RSVP has been recorded!</h2>
              <p>Thank you, {name.trim()}. Here are your responses:</p>

              <p><strong>Phone:</strong> {phone}</p>

              {weddingEvents.map((eventName) => (
                <p key={eventName}>
                  <strong>{eventName}:</strong>{" "}
                  {answers[eventName] === "yes"
                    ? "Attending"
                    : "Not attending"}
                </p>
              ))}

              <button
                className="edit-response"
                type="button"
                onClick={() => setSubmitted(false)}
              >
                Edit my response
              </button>
            </div>
          )}

          <p className="closing-note">Made with love, for your special moments.</p>
        </div>

        <div className="floral floral-bottom" aria-hidden="true">✿ ❀ ✿</div>
      </section>

      <footer className="guest-footer">
        <span>♥</span> Powered by ShaadiSync
      </footer>
    </main>
  );
}
