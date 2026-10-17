
import { useEffect, useState } from "react";

function buildReminder(guest, eventName, tone, profile) {
  if (!guest) return "";

  const hostName = profile?.hostName || "Your wedding host";
  const partnerName = profile?.partnerName?.trim();
  const coupleName = partnerName
    ? `${hostName} and ${partnerName}`
    : hostName;

  const date = profile?.weddingDate
    ? new Date(`${profile.weddingDate}T12:00:00`).toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )
    : "";

  const eventDate = date
    ? ` on ${date}`
    : "";

  const venue = profile?.venue?.trim()
    ? ` The celebration will be at ${profile.venue.trim()}.`
    : "";

  const greetings = {
    Friendly: `Hi ${guest.name}! 😊`,
    Polite: `Hello ${guest.name}, I hope you're doing well.`,
    Formal: `Dear ${guest.name},`,
    Festive: `Hey ${guest.name}! 💖✨`,
  };

  const messages = {
    Friendly: `Just checking in about ${coupleName}'s ${eventName} celebration${eventDate}. We'd love to know if you can make it!${venue}\n\nWhenever you get a moment, please update your RSVP. Hope to celebrate with you! ❤️`,
    Polite: `We would be delighted to have you join us for ${coupleName}'s ${eventName}${eventDate}.${venue}\n\nWhen convenient, could you please let us know whether you'll be attending? Thank you, and we hope to celebrate together.`,
    Formal: `We are writing to kindly follow up on your invitation to ${coupleName}'s ${eventName}${eventDate}.${venue}\n\nPlease share your attendance confirmation at your convenience. We appreciate your time and look forward to hearing from you.`,
    Festive: `The celebrations are calling! 🎉 We'd love to have you with us for ${coupleName}'s ${eventName}${eventDate}.${venue}\n\nPlease let us know if you'll be joining the fun. Your presence would make the occasion even more special! 🥳💕`,
  };

  return `${greetings[tone]}\n\n${messages[tone]}\n\nWarm wishes,\n${hostName}`;
}

export default function ReminderAssistant({
  guests,
  profile,
  eventNames,
  getEventStatus,
  notify,
}) {
  const [guestId, setGuestId] = useState("");
  const [eventName, setEventName] = useState("Wedding");
  const [tone, setTone] = useState("Polite");
  const [message, setMessage] = useState("");

  const guest =
    guests.find((item) => String(item.id) === String(guestId)) ||
    guests.find((item) => item.status === "Pending") ||
    guests[0] ||
    null;

  useEffect(() => {
    if (guest) {
      setGuestId(String(guest.id));
    }
  }, [guest?.id]);

  useEffect(() => {
    setMessage(
      buildReminder(guest, eventName, tone, profile)
    );
  }, [
    guest?.id,
    guest?.name,
    eventName,
    tone,
    profile?.hostName,
    profile?.partnerName,
    profile?.weddingDate,
    profile?.venue,
  ]);

  const copyMessage = async () => {
    if (!message.trim()) {
      notify("Generate a reminder first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      notify("Reminder copied to clipboard!");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      const copied = document.execCommand("copy");
      textarea.remove();

      notify(
        copied
          ? "Reminder copied to clipboard!"
          : "Copy failed. Please select and copy the message."
      );
    }
  };

  const openWhatsApp = () => {
    if (!guest) {
      notify("Please select a guest first.");
      return;
    }

    const phone = String(guest.phone || "").replace(/\D/g, "");

    if (phone.length < 10 || phone.length > 15) {
      notify("Please add a valid phone number for this guest.");
      return;
    }

    const internationalPhone =
      phone.length === 10 ? `91${phone}` : phone;

    const url =
      `https://wa.me/${internationalPhone}?text=` +
      encodeURIComponent(message);

    window.open(url, "_blank", "noopener,noreferrer");
    notify("WhatsApp reminder is ready to send!");
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "7px",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #e4dce5",
    borderRadius: "9px",
    background: "#fff",
    color: "#392b3c",
    font: "inherit",
    fontSize: "14px",
  };

  const fieldStyle = {
    minWidth: 0,
    flex: "1 1 190px",
  };

  return (
    <section
      className="panel"
      style={{
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <div className="panel-heading">
        <div>
          <h3>AI Message Assistant</h3>
          <p>
            Create a thoughtful, personalized reminder for any celebration.
          </p>
        </div>
        <span
          style={{
            padding: "7px 10px",
            borderRadius: "20px",
            background: "#f4eafa",
            color: "#76527e",
            fontSize: "11px",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          SMART TEMPLATES
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          marginTop: "22px",
        }}
      >
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="reminder-guest">
            Choose guest
          </label>
          <select
            id="reminder-guest"
            value={guest ? String(guest.id) : ""}
            onChange={(e) => setGuestId(e.target.value)}
            style={inputStyle}
          >
            {guests.length === 0 && (
              <option value="">No guests available</option>
            )}
            {guests.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
                {item.phone ? ` · ${item.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="reminder-event">
            Event
          </label>
          <select
            id="reminder-event"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            style={inputStyle}
          >
            {eventNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="reminder-tone">
            Message tone
          </label>
          <select
            id="reminder-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={inputStyle}
          >
            <option>Friendly</option>
            <option>Polite</option>
            <option>Formal</option>
            <option>Festive</option>
          </select>
        </div>
      </div>

      {guest && (
        <div
          style={{
            marginTop: "15px",
            padding: "11px 13px",
            borderRadius: "9px",
            background: "#fbf8fc",
            color: "#69576d",
            fontSize: "13px",
          }}
        >
          <strong>Selected guest:</strong> {guest.name}
          {" · "}
          <strong>Event RSVP:</strong>{" "}
          {getEventStatus(guest, eventName)}
          {!guest.phone && (
            <span style={{ display: "block", marginTop: "5px" }}>
              Add a phone number to open WhatsApp for this guest.
            </span>
          )}
        </div>
      )}

      <label
        htmlFor="reminder-message"
        style={{ ...labelStyle, marginTop: "20px" }}
      >
        Your personalized reminder
      </label>

      <textarea
        id="reminder-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={8}
        placeholder="Your reminder will appear here..."
        style={{
          ...inputStyle,
          resize: "vertical",
          lineHeight: 1.7,
          minHeight: "190px",
        }}
      />

      <p
        style={{
          fontSize: "12px",
          color: "#847587",
          marginTop: "7px",
        }}
      >
        You can edit the message before copying or opening WhatsApp.
        These personalized templates work without an AI API key.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "15px",
        }}
      >
        <button
          type="button"
          className="outline-button"
          onClick={() =>
            setMessage(buildReminder(guest, eventName, tone, profile))
          }
          disabled={!guest}
        >
          Generate reminder
        </button>

        <button
          type="button"
          className="outline-button"
          onClick={copyMessage}
          disabled={!guest || !message.trim()}
        >
          Copy message
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={openWhatsApp}
          disabled={!guest || !message.trim()}
        >
          <span style={{ marginRight: "7px" }}>↗</span>
          Open WhatsApp
        </button>
      </div>
    </section>
  );
}
