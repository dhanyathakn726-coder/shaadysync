
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import ReminderAssistant from "./ReminderAssistant";
import { supabase } from "./supabase";

const EVENT_NAMES = ["Wedding", "Reception", "Haldi", "Mehendi"];

const initialGuests = [
  { id: 1, name: "Aarav Sharma", phone: "9876543210", side: "Bride", event: "Wedding", familySize: 3, status: "Confirmed" },
  { id: 2, name: "Priya Reddy", phone: "9876543211", side: "Groom", event: "Wedding", familySize: 2, status: "Pending" },
  { id: 3, name: "Rahul Mehta", phone: "9876543212", side: "Bride", event: "Reception", familySize: 4, status: "Confirmed" },
  { id: 4, name: "Sneha Iyer", phone: "9876543213", side: "Groom", event: "Haldi", familySize: 2, status: "Declined" },
  { id: 5, name: "Karthik Rao", phone: "9876543214", side: "Bride", event: "Wedding", familySize: 5, status: "Pending" },
  { id: 6, name: "Ananya Nair", phone: "9876543215", side: "Groom", event: "Reception", familySize: 2, status: "Confirmed" },
];

const defaultProfile = {
  hostName: "Wedding Host",
  partnerName: "",
  phone: "",
  email: "",
  weddingDate: "",
  venue: "",
};

const emptyForm = {
  name: "",
  phone: "",
  side: "Bride",
  event: "Wedding",
  familySize: 1,
  status: "Pending",
};

const readStorage = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
  } catch {
    return fallback;
  }
};

const readGuests = () => {
  try {
    const saved = localStorage.getItem("shaadysync-guests");
    return saved ? JSON.parse(saved) : initialGuests;
  } catch {
    return initialGuests;
  }
};

function getEventStatus(guest, eventName) {
  const response = guest.eventRsvps?.[eventName];

  if (response === "Confirmed" || response === "Yes") return "Confirmed";
  if (response === "Declined" || response === "No") return "Declined";
  if (response === "Pending" || response === "") return "Pending";

  return guest.event === eventName ? guest.status || "Pending" : "Pending";
}

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    edit: <><path d="m16 4 4 4L9 19l-5 1 1-5Z"/><path d="m14 6 4 4"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    arrow: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    external: <><path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></>,
  };

  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.grid}
    </svg>
  );
}

/* LOGIN AND SESSION PROTECTION */
export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) setLoginError(error.message);
      setSession(data?.session ?? null);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (active) setSession(newSession);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");
    setLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      setSession(data.session);
    } catch (error) {
      setLoginError(error.message || "Unable to sign in. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoginError(error.message);
      return;
    }

    setSession(null);
    setPassword("");
    setEmail("");
  };

  if (checkingSession) {
    return (
      <div style={authStyles.page}>
        <div style={authStyles.card}>Loading ShaadiSync...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={authStyles.page}>
        <form style={authStyles.card} onSubmit={handleLogin}>
          <div style={authStyles.logo}>♥</div>
          <h1 style={authStyles.heading}>shaadi<span style={{ color: "#b66b83" }}>sync</span></h1>
          <p style={authStyles.subtitle}>Your celebration, beautifully organized.</p>

          <label style={authStyles.label} htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            style={authStyles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label style={authStyles.label} htmlFor="login-password">Password</label>
          <input
            id="login-password"
            style={authStyles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          {loginError && (
            <p role="alert" style={authStyles.error}>{loginError}</p>
          )}

          <button type="submit" disabled={loggingIn} style={authStyles.button}>
            {loggingIn ? "Signing in..." : "Sign in to ShaadiSync"}
          </button>

          <p style={authStyles.help}>
            Use the email address and password you created in Supabase Authentication.
          </p>
        </form>
      </div>
    );
  }

  return <Dashboard user={session.user} onLogout={handleLogout} />;
}

const authStyles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    background: "linear-gradient(135deg, #fff8f5, #f5e9ef)",
    fontFamily: "inherit",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "36px",
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 16px 50px rgba(80, 40, 60, 0.12)",
    boxSizing: "border-box",
  },
  logo: {
    fontSize: "38px",
    color: "#b66b83",
    textAlign: "center",
  },
  heading: {
    textAlign: "center",
    fontSize: "32px",
    margin: "8px 0",
    color: "#49323e",
  },
  subtitle: {
    textAlign: "center",
    color: "#786873",
    marginBottom: "28px",
  },
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#49323e",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    border: "1px solid #e3d7de",
    borderRadius: "9px",
    marginBottom: "18px",
    fontSize: "15px",
  },
  button: {
    width: "100%",
    padding: "14px",
    border: 0,
    borderRadius: "9px",
    background: "#9b526e",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    color: "#b42318",
    background: "#fff1f0",
    padding: "10px",
    borderRadius: "8px",
    fontSize: "14px",
  },
  help: {
    color: "#786873",
    fontSize: "12px",
    lineHeight: 1.6,
    textAlign: "center",
    marginTop: "18px",
  },
};

/* EXISTING ADMIN DASHBOARD */
function Dashboard({ user, onLogout }) {
  const [guests, setGuests] = useState(readGuests);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState("");
  const [activePage, setActivePage] = useState("Guests");

  const [profile, setProfile] = useState(() =>
    readStorage("shaadysync-host-profile", { ...defaultProfile, email: user.email || "" })
  );
  const [profileDraft, setProfileDraft] = useState(() =>
    readStorage("shaadysync-host-profile", { ...defaultProfile, email: user.email || "" })
  );
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    localStorage.setItem("shaadysync-guests", JSON.stringify(guests));
  }, [guests]);

  useEffect(() => {
    localStorage.setItem("shaadysync-host-profile", JSON.stringify(profile));
  }, [profile]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const stats = useMemo(() => ({
    total: guests.length,
    confirmed: guests.filter((g) => g.status === "Confirmed").length,
    pending: guests.filter((g) => g.status === "Pending").length,
    declined: guests.filter((g) => g.status === "Declined").length,
    attendees: guests.filter((g) => g.status === "Confirmed")
      .reduce((sum, g) => sum + Number(g.familySize || 1), 0),
  }), [guests]);

  const filteredGuests = guests.filter((guest) => {
    const matchesSearch =
      guest.name.toLowerCase().includes(search.toLowerCase()) ||
      (guest.phone || "").includes(search);
    const matchesFilter = filter === "All" || guest.status === filter;
    const matchesPage = activePage !== "Messages" || guest.status === "Pending";
    return matchesSearch && matchesFilter && matchesPage;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (guest) => {
    setEditingId(guest.id);
    setForm({
      name: guest.name,
      phone: guest.phone || "",
      side: guest.side || "Both",
      event: guest.event || "Wedding",
      familySize: guest.familySize || 1,
      status: guest.status || "Pending",
    });
    setShowForm(true);
  };

  const saveGuest = (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      notify("Please enter the guest's name.");
      return;
    }

    if (form.phone.replace(/\D/g, "").length < 10) {
      notify("Please enter a valid phone number.");
      return;
    }

    const cleaned = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      familySize: Math.max(1, Number(form.familySize) || 1),
    };

    if (editingId !== null) {
      setGuests((current) => current.map((guest) =>
        guest.id === editingId ? { ...guest, ...cleaned } : guest
      ));
      notify("Guest details updated!");
    } else {
      setGuests((current) => [
        { ...cleaned, id: Date.now(), eventRsvps: {} },
        ...current,
      ]);
      notify("Guest added successfully!");
    }

    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const deleteGuest = (id) => {
    const guest = guests.find((g) => g.id === id);
    if (!guest) return;

    if (window.confirm(`Delete ${guest.name} from the guest list?`)) {
      setGuests((current) => current.filter((g) => g.id !== id));
      notify("Guest deleted.");
    }
  };

  const updateStatus = (id, status) => {
    setGuests((current) => current.map((guest) =>
      guest.id === id ? { ...guest, status } : guest
    ));
    notify(`RSVP marked as ${status.toLowerCase()}.`);
  };

  const updateEventStatus = (id, eventName, status) => {
    setGuests((current) => current.map((guest) => {
      if (guest.id !== id) return guest;

      return {
        ...guest,
        eventRsvps: {
          ...(guest.eventRsvps || {}),
          [eventName]: status,
        },
        ...(guest.event === eventName ? { status } : {}),
      };
    }));

    notify(`${eventName} RSVP updated to ${status.toLowerCase()}.`);
  };

  const sendWhatsApp = (guest) => {
    const phone = (guest.phone || "").replace(/\D/g, "");
    const hostName = profile.hostName || "Wedding Host";
    const eventName = guest.event || "Wedding";

    const message = `Hi ${guest.name}! 💌 This is a friendly reminder from ${hostName} about our upcoming ${eventName} celebration. ${
      guest.status === "Confirmed"
        ? "We're looking forward to celebrating with you!"
        : "Kindly let us know whether you can attend. We would love to celebrate with you!"
    } Thank you! ❤️`;

    const internationalPhone = phone.length === 10 ? `91${phone}` : phone;

    if (internationalPhone.length < 10) {
      notify("Please add a valid phone number first.");
      return;
    }

    window.open(
      `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    notify("Personalized WhatsApp reminder is ready to send!");
  };

  const exportCSV = () => {
    const headers = [
      "Name", "Phone", "Side", "Primary Event", "Party Size",
      "Legacy RSVP Status", "Wedding RSVP", "Reception RSVP",
      "Haldi RSVP", "Mehendi RSVP",
    ];

    const rows = guests.map((guest) => [
      guest.name,
      guest.phone || "",
      guest.side,
      guest.event,
      guest.familySize,
      guest.status,
      ...EVENT_NAMES.map((eventName) => getEventStatus(guest, eventName)),
    ]);

    const csv = [headers, ...rows].map((row) =>
      row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shaadysync-guests.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify("Guest list exported!");
  };

  const openLiveDemo = () => {
    window.open("/src/guest.html", "_blank", "noopener,noreferrer");
  };

  const openHostProfile = () => {
    setProfileDraft({ ...profile });
    setShowProfile(true);
  };

  const saveHostProfile = (event) => {
    event.preventDefault();

    if (!profileDraft.hostName.trim()) {
      notify("Please enter the host's name.");
      return;
    }

    setProfile({
      ...profileDraft,
      hostName: profileDraft.hostName.trim(),
      partnerName: profileDraft.partnerName.trim(),
      phone: profileDraft.phone.trim(),
      email: profileDraft.email.trim(),
      venue: profileDraft.venue.trim(),
    });

    setShowProfile(false);
    notify("Wedding host profile saved!");
  };

  const confirmedPercent = stats.total
    ? Math.round((stats.confirmed / stats.total) * 100)
    : 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="heart" /></div>
          <div>
            <div className="brand-name">shaadi<span>sync</span></div>
            <div className="brand-caption">CELEBRATIONS, IN SYNC</div>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>
        <nav className="nav-list">
          <button className={`nav-item ${activePage === "Overview" ? "active" : ""}`} onClick={() => setActivePage("Overview")}><Icon name="grid" /> Overview</button>
          <button className={`nav-item ${activePage === "Guests" ? "active" : ""}`} onClick={() => setActivePage("Guests")}><Icon name="users" /> Guest list <span className="nav-count">{guests.length}</span></button>
          <button className={`nav-item ${activePage === "Events" ? "active" : ""}`} onClick={() => setActivePage("Events")}><Icon name="calendar" /> Events</button>
          <button className={`nav-item ${activePage === "Messages" ? "active" : ""}`} onClick={() => { setActivePage("Messages"); setFilter("Pending"); }}><Icon name="message" /> RSVP follow-ups {stats.pending > 0 && <span className="nav-count alert-count">{stats.pending}</span>}</button>
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-card">
            <div className="mini-icon"><Icon name="heart" /></div>
            <p className="mini-title">Made for your big day</p>
            <p className="mini-text">Less chasing. More celebrating.</p>
            <div className="mini-progress"><span style={{ width: `${confirmedPercent}%` }} /></div>
            <div className="mini-progress-label">{confirmedPercent}% confirmed</div>
          </div>
          <button type="button" className="profile-row" onClick={openHostProfile} style={{ width: "100%", textAlign: "left", border: 0, cursor: "pointer", font: "inherit", color: "inherit" }}>
            <div className="profile-avatar">{(profile.hostName || "W").trim().charAt(0).toUpperCase()}</div>
            <div className="profile-info"><strong>{profile.hostName || "Wedding Host"}</strong><span>Event organizer · Edit profile</span></div>
            <span className="profile-dots">•••</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activePage}</strong></div>
          <div className="topbar-right">
            <button type="button" className="demo-pill" onClick={openLiveDemo} style={{ cursor: "pointer", font: "inherit", border: 0 }}><span /> LIVE DEMO <Icon name="external" /></button>
            <button type="button" className="top-avatar" onClick={openHostProfile} title="Open wedding host profile" style={{ cursor: "pointer", border: 0, font: "inherit" }}>{(profile.hostName || "W").trim().charAt(0).toUpperCase()}</button>
            <button type="button" onClick={onLogout} style={{ padding: "9px 14px", border: "1px solid #e3d7de", borderRadius: "9px", background: "#fff", cursor: "pointer" }}>Log out</button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-banner">
            <div className="banner-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR CELEBRATION, ORGANIZED</div>
              <h1>Every guest. Every moment.<br /><em>All in sync.</em></h1>
              <p>One beautiful place to manage your guest list and keep every RSVP on track.</p>
              <button className="banner-button" onClick={openAdd}><Icon name="plus" /> Add a guest <Icon name="arrow" /></button>
            </div>
            <div className="banner-art" aria-hidden="true">
              <div className="art-sun" /><div className="art-ring ring-one" /><div className="art-ring ring-two" />
              <div className="art-flower flower-one">✿</div><div className="art-flower flower-two">✿</div>
              <div className="art-flower flower-three">✧</div><div className="art-arch"><div className="arch-inner" /></div>
              <div className="art-card"><span>♥</span><small>TOGETHER</small></div>
            </div>
            <div className="banner-decoration">✦</div>
          </section>

          <div className="section-heading">
            <div><h2>Your wedding at a glance</h2><p>Here’s how your guest list is coming together.</p></div>
            <button className="outline-button" onClick={exportCSV}><Icon name="download" /> Export guest list</button>
          </div>

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-top"><span>Total guests</span><div className="stat-icon lilac"><Icon name="users" /></div></div><div className="stat-number">{stats.total}</div><div className="stat-foot"><span className="foot-dot lilac-dot" /> People on your list</div></div>
            <div className="stat-card"><div className="stat-top"><span>Confirmed</span><div className="stat-icon green"><Icon name="check" /></div></div><div className="stat-number">{stats.confirmed}</div><div className="stat-foot"><span className="foot-dot green-dot" /> {stats.attendees} expected attendees</div></div>
            <div className="stat-card"><div className="stat-top"><span>Awaiting RSVP</span><div className="stat-icon amber"><Icon name="message" /></div></div><div className="stat-number">{stats.pending}</div><div className="stat-foot"><span className="foot-dot amber-dot" /> Need a little nudge</div></div>
            <div className="stat-card"><div className="stat-top"><span>Unable to attend</span><div className="stat-icon rose"><Icon name="calendar" /></div></div><div className="stat-number">{stats.declined}</div><div className="stat-foot"><span className="foot-dot rose-dot" /> RSVP declined</div></div>
          </section>

          {activePage === "Overview" && (
            <section className="overview-grid">
              <div className="panel overview-panel">
                <div className="panel-heading"><div><h3>RSVP progress</h3><p>Your guest response summary</p></div><span className="round-icon"><Icon name="check" /></span></div>
                <div className="progress-large"><div className="progress-large-fill" style={{ width: `${confirmedPercent}%` }} /></div>
                <div className="progress-caption"><strong>{confirmedPercent}%</strong> of guest entries confirmed</div>
                <div className="summary-row"><span><i className="legend-dot confirmed-dot" /> Confirmed</span><strong>{stats.confirmed}</strong></div>
                <div className="summary-row"><span><i className="legend-dot pending-dot" /> Pending</span><strong>{stats.pending}</strong></div>
                <div className="summary-row"><span><i className="legend-dot declined-dot" /> Declined</span><strong>{stats.declined}</strong></div>
              </div>
              <div className="panel overview-panel">
                <div className="panel-heading"><div><h3>Quick actions</h3><p>Keep your celebration moving</p></div></div>
                <button className="quick-action" onClick={openAdd}><span className="quick-icon lilac"><Icon name="plus" /></span><span><strong>Add a guest</strong><small>Add someone to your wedding list</small></span><Icon name="arrow" /></button>
                <button className="quick-action" onClick={() => { setActivePage("Messages"); setFilter("Pending"); }}><span className="quick-icon amber"><Icon name="message" /></span><span><strong>Follow up on RSVPs</strong><small>{stats.pending} guests are still pending</small></span><Icon name="arrow" /></button>
                <button className="quick-action" onClick={exportCSV}><span className="quick-icon green"><Icon name="download" /></span><span><strong>Download guest list</strong><small>Export your list as a CSV file</small></span><Icon name="arrow" /></button>
                <button className="quick-action" onClick={openHostProfile}><span className="quick-icon lilac"><Icon name="user" /></span><span><strong>Wedding Host Profile</strong><small>Update your wedding details</small></span><Icon name="arrow" /></button>
                <button className="quick-action" onClick={openLiveDemo}><span className="quick-icon green"><Icon name="external" /></span><span><strong>Open Live Demo</strong><small>Preview the guest RSVP page</small></span><Icon name="arrow" /></button>
              </div>
            </section>
          )}

          {activePage === "Events" && (
            <section className="panel events-panel">
              <div className="panel-heading"><div><h3>Your celebrations</h3><p>Every guest's response for each event</p></div></div>
              <div className="event-grid">
                {EVENT_NAMES.map((eventName) => {
                  const confirmed = guests.filter((g) => getEventStatus(g, eventName) === "Confirmed").length;
                  const declined = guests.filter((g) => getEventStatus(g, eventName) === "Declined").length;
                  const pending = guests.filter((g) => getEventStatus(g, eventName) === "Pending").length;
                  return (
                    <div className="event-card" key={eventName}>
                      <div className="event-symbol"><Icon name="calendar" /></div>
                      <h4>{eventName}</h4><p>{guests.length} guests on list</p>
                      <div className="event-bar"><span style={{ width: `${guests.length ? (confirmed / guests.length) * 100 : 0}%` }} /></div>
                      <small>{confirmed} confirmed · {declined} declined · {pending} pending</small>
                    </div>
                  );
                })}
              </div>
              <button className="primary-button event-add" onClick={openAdd}><Icon name="plus" /> Add a guest to an event</button>
            </section>
          )}

          {activePage === "Messages" && (
            <ReminderAssistant guests={guests} profile={profile} eventNames={EVENT_NAMES} getEventStatus={getEventStatus} notify={notify} />
          )}

          <section className="panel guest-panel">
            <div className="panel-heading guest-heading">
              <div><h3>{activePage === "Messages" ? "Guests awaiting a reply" : "Your guest list"}</h3><p>{activePage === "Messages" ? "Open a WhatsApp chat to follow up with pending guests." : "Keep every name, invitation and response in one place."}</p></div>
              <button className="primary-button" onClick={openAdd}><Icon name="plus" /> Add guest</button>
            </div>

            <div className="table-toolbar">
              <div className="search-box"><Icon name="search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests by name or phone..." /></div>
              <div className="filter-tabs">
                {["All", "Confirmed", "Pending", "Declined"].map((status) => (
                  <button key={status} onClick={() => setFilter(status)} className={filter === status ? "selected" : ""}>{status}</button>
                ))}
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead><tr><th>GUEST</th><th>SIDE</th><th>PARTY SIZE</th>{EVENT_NAMES.map((eventName) => <th key={eventName}>{eventName.toUpperCase()}</th>)}<th>ACTIONS</th></tr></thead>
                <tbody>
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id}>
                      <td><div className="guest-cell"><div className={`guest-avatar avatar-${guest.name.charCodeAt(0) % 5}`}>{guest.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}</div><div className="guest-detail"><strong>{guest.name}</strong><span>{guest.phone || "Phone not provided"}</span></div></div></td>
                      <td><span className={`side-tag ${(guest.side || "Both").toLowerCase()}`}>{guest.side || "Both"}</span></td>
                      <td><span className="party-size"><Icon name="users" /> {guest.familySize || 0}</span></td>
                      {EVENT_NAMES.map((eventName) => {
                        const status = getEventStatus(guest, eventName);
                        return <td key={eventName}><select className={`status-select ${status.toLowerCase()}`} value={status} onChange={(e) => updateEventStatus(guest.id, eventName, e.target.value)} aria-label={`${eventName} RSVP status for ${guest.name}`}><option value="Confirmed">Confirmed</option><option value="Pending">Pending</option><option value="Declined">Declined</option></select></td>;
                      })}
                      <td><div className="action-buttons"><button className="action-btn whatsapp-btn" title="Open WhatsApp invitation" onClick={() => sendWhatsApp(guest)}><Icon name="send" /></button><button className="action-btn" title="Edit guest" onClick={() => openEdit(guest)}><Icon name="edit" /></button><button className="action-btn delete-btn" title="Delete guest" onClick={() => deleteGuest(guest.id)}><Icon name="trash" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredGuests.length === 0 && <div className="empty-state"><div className="empty-icon"><Icon name="users" /></div><h4>No guests found</h4><p>Try a different search or add someone new to your list.</p><button className="primary-button" onClick={openAdd}><Icon name="plus" /> Add guest</button></div>}
            </div>
            <div className="table-footer"><span>Showing <strong>{filteredGuests.length}</strong> of <strong>{guests.length}</strong> guests</span><span className="saved-indicator"><span /> Saved in this browser</span></div>
          </section>

          <footer className="footer"><span>Made with <span className="footer-heart">♥</span> for your special day</span><span>SHAADYSYNC · WEDDING RSVP MANAGER</span></footer>
        </div>
      </main>

      {showProfile && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowProfile(false); }}>
          <div className="guest-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
            <div className="modal-heading"><div><div className="modal-kicker">YOUR SHAADISYNC ACCOUNT</div><h2 id="profile-modal-title">Wedding Host Profile</h2><p>Keep your host and wedding details up to date.</p></div><button className="modal-close" type="button" onClick={() => setShowProfile(false)} aria-label="Close profile"><Icon name="close" /></button></div>
            <form onSubmit={saveHostProfile}>
              <label>Host name <span>*</span><input autoFocus required value={profileDraft.hostName} onChange={(e) => setProfileDraft({ ...profileDraft, hostName: e.target.value })} placeholder="Your name" /></label>
              <label>Partner's name<input value={profileDraft.partnerName} onChange={(e) => setProfileDraft({ ...profileDraft, partnerName: e.target.value })} placeholder="Partner's name" /></label>
              <div className="form-two"><label>Phone number<input type="tel" value={profileDraft.phone} onChange={(e) => setProfileDraft({ ...profileDraft, phone: e.target.value })} placeholder="Contact number" /></label><label>Email<input type="email" value={profileDraft.email} onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })} placeholder="you@example.com" /></label></div>
              <label>Wedding date<input type="date" value={profileDraft.weddingDate} onChange={(e) => setProfileDraft({ ...profileDraft, weddingDate: e.target.value })} /></label>
              <label>Wedding venue<input value={profileDraft.venue} onChange={(e) => setProfileDraft({ ...profileDraft, venue: e.target.value })} placeholder="Venue and city" /></label>
              <div className="modal-note"><Icon name="check" /> Profile details are saved in this browser.</div>
              <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setShowProfile(false)}>Cancel</button><button type="submit" className="primary-button"><Icon name="check" /> Save profile</button></div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="guest-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading"><div><div className="modal-kicker">YOUR GUEST BOOK</div><h2 id="modal-title">{editingId !== null ? "Edit guest details" : "Add a new guest"}</h2><p>Every special person deserves a place on your list.</p></div><button className="modal-close" type="button" onClick={() => setShowForm(false)} aria-label="Close form"><Icon name="close" /></button></div>
            <form onSubmit={saveGuest}>
              <label>Guest name <span>*</span><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ananya Sharma" required /></label>
              <label>WhatsApp phone number <span>*</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" inputMode="tel" required /></label>
              <div className="form-two"><label>Guest side<select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}><option>Bride</option><option>Groom</option><option>Both</option></select></label><label>Primary event<select value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })}>{EVENT_NAMES.map((eventName) => <option key={eventName}>{eventName}</option>)}</select></label></div>
              <div className="form-two"><label>Party size<input type="number" min="1" max="50" value={form.familySize} onChange={(e) => setForm({ ...form, familySize: e.target.value })} required /></label><label>Overall RSVP status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Pending</option><option>Confirmed</option><option>Declined</option></select></label></div>
              <div className="modal-note"><Icon name="message" /> Use the event columns in the guest table to update each RSVP separately.</div>
              <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-button"><Icon name="check" /> {editingId !== null ? "Save changes" : "Add guest"}</button></div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast"><span className="toast-check"><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}
