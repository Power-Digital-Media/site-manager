/**
 * Power Digital Media — Site Manager
 * Data Store (localStorage persistence)
 */

const STORAGE_KEY = 'pdm_site_manager';

const SEED_DATA = {
  auth: {
    email: 'pastor@church244.org',
    name: 'Pastor Josh Watts',
    role: 'Site Administrator',
    avatar: null,
  },
  site: {
    name: 'Church 244',
    tagline: 'Come As You Are',
    domain: 'church244.org',
    status: 'live',
    lastPublished: '2026-04-18T14:30:00Z',
  },
  pages: {
    hero: {
      eyebrow: '129 Center St, Suite F · Richland, MS',
      title: 'You Belong Here.',
      subtitle: "A Christ-centered, Spirit-filled community where you're not just welcome — you're family.",
      ctaPrimary: 'Plan Your Visit',
      ctaSecondary: 'Service Times',
    },
    about: {
      eyebrow: 'Who We Are',
      title: "More Than a Church. We're Family.",
      description: "At Church 244, everything we do centers around Jesus Christ and the truth of God's Word. We're a growing community in Richland, Mississippi, and our doors are always open.",
      cards: [
        { icon: 'book', title: 'Rooted in Scripture', text: 'We believe in one true God, eternally existing in three persons — Father, Son, and Holy Spirit. The Bible is our foundation for all we do.' },
        { icon: 'heart', title: 'Built on Love', text: "We're not just a Sunday gathering — we're a family that walks through life together. You'll find genuine connection and people who truly care." },
        { icon: 'bell', title: 'Spirit-Led Worship', text: "Our worship isn't a performance — it's a posture. Come expecting to encounter God's presence in a real and powerful way every single service." },
      ],
    },
    pastor: {
      eyebrow: 'Our Pastor',
      name: 'Josh Watts',
      quote: '"I love this place and these people. They are like my family! Pastor Josh Watts is a mighty man of God."',
      bio: 'Pastor Josh is a devoted husband to Jeanette, father to Joshua and Alana, and "Pop" to Ripley. His heart burns for one thing — helping people encounter the living God and discover their purpose in Jesus Christ.',
    },
    cta: {
      title: 'Join Us This Sunday',
      description: "There's a seat with your name on it. Come experience what God is doing at Church 244.",
    },
  },
  events: [
    {
      id: 'evt_001',
      title: 'Easter Sunday Celebration',
      date: '2026-04-20',
      time: '10:00 AM',
      location: '129 Center St, Suite F, Richland, MS',
      description: 'Join us for a powerful Easter morning celebration! Special worship, a message of hope, and fellowship for the whole family.',
      published: true,
      createdAt: '2026-04-01T10:00:00Z',
    },
    {
      id: 'evt_002',
      title: 'Spring Revival',
      date: '2026-04-25',
      time: '7:00 PM',
      location: 'Church 244 Main Sanctuary',
      description: 'Three nights of anointed preaching, powerful worship, and prayer. Guest speaker Pastor Michael Torres.',
      published: true,
      createdAt: '2026-04-05T10:00:00Z',
    },
    {
      id: 'evt_003',
      title: 'Community Bake Sale',
      date: '2026-05-03',
      time: '9:00 AM',
      location: 'Church 244 Parking Lot',
      description: "Homemade treats and fellowship! All proceeds go to our community outreach fund. Bring your best recipe and your appetite!",
      published: true,
      createdAt: '2026-04-10T10:00:00Z',
    },
    {
      id: 'evt_004',
      title: 'Vacation Bible School',
      date: '2026-06-09',
      time: '6:00 PM',
      location: 'Church 244',
      description: 'A week of fun, faith, and friendship for kids ages 4-12! Games, crafts, music, and Bible stories every evening.',
      published: false,
      createdAt: '2026-04-15T10:00:00Z',
    },
  ],
  announcements: [
    {
      id: 'ann_001',
      title: '🌸 Easter Service — This Sunday!',
      message: 'Join us Easter Sunday at 10 AM for a special celebration of the Resurrection. Invite your family and friends!',
      link: '#visit',
      urgency: 'high',
      active: true,
      expiresAt: '2026-04-21T00:00:00Z',
      createdAt: '2026-04-14T10:00:00Z',
    },
    {
      id: 'ann_002',
      title: '📚 New Members Class Starting',
      message: "Interested in learning more about Church 244? Our New Members Class begins May 4th after Sunday service. All are welcome!",
      link: '',
      urgency: 'normal',
      active: true,
      expiresAt: '2026-05-04T00:00:00Z',
      createdAt: '2026-04-12T10:00:00Z',
    },
  ],
  team: [
    {
      id: 'tm_001',
      name: 'Josh Watts',
      title: 'Lead Pastor',
      bio: 'Devoted husband, father, and man of God. Pastor Josh leads Church 244 with a heart for the lost and a passion for Biblical truth.',
      photo: null,
      order: 0,
    },
    {
      id: 'tm_002',
      name: 'Jeanette Watts',
      title: "Pastor's Wife & Women's Ministry",
      bio: "Jeanette leads the Women's Ministry with grace, wisdom, and a heart for encouraging women to grow in their walk with Christ.",
      photo: null,
      order: 1,
    },
    {
      id: 'tm_003',
      name: 'Marcus Rivera',
      title: 'Youth Pastor',
      bio: 'Marcus brings energy and heart to the youth ministry, meeting teens where they are and pointing them to Jesus.',
      photo: null,
      order: 2,
    },
  ],
  settings: {
    serviceTimes: [
      { id: 'st_001', day: 'Sunday', time: '10:00 AM', label: 'Morning Worship', description: 'Our main gathering. Powerful worship, anointed preaching, community.' },
      { id: 'st_002', day: 'Wednesday', time: '6:30 PM', label: 'Bible Study & Fellowship', description: 'Dig deeper into the Word. Adult Bible study with fellowship and prayer.' },
      { id: 'st_003', day: 'Thursday', time: '6:30 PM', label: 'Youth Group', description: 'Ages 13–19. High-energy gathering — worship, the Word, and real community.' },
    ],
    contact: {
      address: '129 Center St, Suite F',
      city: 'Richland',
      state: 'MS',
      zip: '39218',
      phone: '(601) 317-1482',
      email: 'info@church244.org',
    },
    social: {
      facebook: 'https://www.facebook.com/p/Church-244-61565615548732/',
      youtube: 'https://youtube.com/@church244',
      tiktok: 'https://www.tiktok.com/tag/church244',
      instagram: '',
    },
    meta: {
      siteTitle: 'Church 244 | Richland, MS — Come As You Are',
      siteDescription: 'Church 244 in Richland, MS — A Christ-centered, Spirit-filled community where you\'re family.',
    },
  },
  activity: [
    { id: 'act_001', action: 'Updated service times', user: 'Pastor Josh', timestamp: '2026-04-18T14:30:00Z', icon: 'clock' },
    { id: 'act_002', action: 'Added Easter Sunday event', user: 'Pastor Josh', timestamp: '2026-04-14T10:15:00Z', icon: 'calendar' },
    { id: 'act_003', action: 'Published new announcement', user: 'Pastor Josh', timestamp: '2026-04-12T09:45:00Z', icon: 'megaphone' },
    { id: 'act_004', action: 'Updated hero section text', user: 'Pastor Josh', timestamp: '2026-04-10T16:20:00Z', icon: 'edit' },
    { id: 'act_005', action: 'Added team member Marcus Rivera', user: 'Pastor Josh', timestamp: '2026-04-08T11:00:00Z', icon: 'user' },
  ],
};

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Store: failed to load, using seed data', e);
  }
  return null;
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Store: failed to save', e);
  }
}

let _data = null;

export const Store = {
  init() {
    _data = load() || JSON.parse(JSON.stringify(SEED_DATA));
    save(_data);
    return _data;
  },

  reset() {
    _data = JSON.parse(JSON.stringify(SEED_DATA));
    save(_data);
    return _data;
  },

  // ─── Auth ───
  getAuth() { return _data.auth; },

  // ─── Site ───
  getSite() { return _data.site; },

  // ─── Pages ───
  getPages() { return _data.pages; },
  getPage(key) { return _data.pages[key]; },
  updatePage(key, updates) {
    _data.pages[key] = { ..._data.pages[key], ...updates };
    this._logActivity(`Updated ${key} section`, 'edit');
    save(_data);
  },

  // ─── Events ───
  getEvents() { return _data.events; },
  getEvent(id) { return _data.events.find(e => e.id === id); },
  addEvent(event) {
    const newEvent = { ...event, id: generateId('evt'), createdAt: new Date().toISOString() };
    _data.events.unshift(newEvent);
    this._logActivity(`Added event: ${newEvent.title}`, 'calendar');
    save(_data);
    return newEvent;
  },
  updateEvent(id, updates) {
    const idx = _data.events.findIndex(e => e.id === id);
    if (idx !== -1) {
      _data.events[idx] = { ..._data.events[idx], ...updates };
      this._logActivity(`Updated event: ${_data.events[idx].title}`, 'calendar');
      save(_data);
    }
  },
  deleteEvent(id) {
    const event = _data.events.find(e => e.id === id);
    _data.events = _data.events.filter(e => e.id !== id);
    if (event) this._logActivity(`Deleted event: ${event.title}`, 'trash');
    save(_data);
  },

  // ─── Announcements ───
  getAnnouncements() { return _data.announcements; },
  getAnnouncement(id) { return _data.announcements.find(a => a.id === id); },
  addAnnouncement(ann) {
    const newAnn = { ...ann, id: generateId('ann'), createdAt: new Date().toISOString() };
    _data.announcements.unshift(newAnn);
    this._logActivity(`Added announcement: ${newAnn.title}`, 'megaphone');
    save(_data);
    return newAnn;
  },
  updateAnnouncement(id, updates) {
    const idx = _data.announcements.findIndex(a => a.id === id);
    if (idx !== -1) {
      _data.announcements[idx] = { ..._data.announcements[idx], ...updates };
      this._logActivity(`Updated announcement: ${_data.announcements[idx].title}`, 'megaphone');
      save(_data);
    }
  },
  deleteAnnouncement(id) {
    const ann = _data.announcements.find(a => a.id === id);
    _data.announcements = _data.announcements.filter(a => a.id !== id);
    if (ann) this._logActivity(`Deleted announcement: ${ann.title}`, 'trash');
    save(_data);
  },

  // ─── Team ───
  getTeam() { return _data.team.sort((a, b) => a.order - b.order); },
  getTeamMember(id) { return _data.team.find(t => t.id === id); },
  addTeamMember(member) {
    const newMember = { ...member, id: generateId('tm'), order: _data.team.length };
    _data.team.push(newMember);
    this._logActivity(`Added team member: ${newMember.name}`, 'user');
    save(_data);
    return newMember;
  },
  updateTeamMember(id, updates) {
    const idx = _data.team.findIndex(t => t.id === id);
    if (idx !== -1) {
      _data.team[idx] = { ..._data.team[idx], ...updates };
      this._logActivity(`Updated team member: ${_data.team[idx].name}`, 'user');
      save(_data);
    }
  },
  deleteTeamMember(id) {
    const member = _data.team.find(t => t.id === id);
    _data.team = _data.team.filter(t => t.id !== id);
    if (member) this._logActivity(`Removed team member: ${member.name}`, 'trash');
    save(_data);
  },

  // ─── Settings ───
  getSettings() { return _data.settings; },
  updateSettings(section, updates) {
    if (_data.settings[section]) {
      if (Array.isArray(_data.settings[section])) {
        _data.settings[section] = updates;
      } else {
        _data.settings[section] = { ..._data.settings[section], ...updates };
      }
      this._logActivity(`Updated ${section} settings`, 'settings');
      save(_data);
    }
  },

  addServiceTime(st) {
    const newSt = { ...st, id: generateId('st') };
    _data.settings.serviceTimes.push(newSt);
    this._logActivity(`Added service time: ${newSt.day} ${newSt.time}`, 'clock');
    save(_data);
    return newSt;
  },
  updateServiceTime(id, updates) {
    const idx = _data.settings.serviceTimes.findIndex(s => s.id === id);
    if (idx !== -1) {
      _data.settings.serviceTimes[idx] = { ..._data.settings.serviceTimes[idx], ...updates };
      save(_data);
    }
  },
  deleteServiceTime(id) {
    _data.settings.serviceTimes = _data.settings.serviceTimes.filter(s => s.id !== id);
    save(_data);
  },

  // ─── Activity ───
  getActivity(limit = 10) { return _data.activity.slice(0, limit); },
  _logActivity(action, icon = 'edit') {
    const entry = {
      id: generateId('act'),
      action,
      user: _data.auth.name,
      timestamp: new Date().toISOString(),
      icon,
    };
    _data.activity.unshift(entry);
    if (_data.activity.length > 50) _data.activity = _data.activity.slice(0, 50);
  },

  // ─── Stats ───
  getStats() {
    return {
      pages: Object.keys(_data.pages).length,
      events: _data.events.length,
      eventsPublished: _data.events.filter(e => e.published).length,
      announcements: _data.announcements.length,
      announcementsActive: _data.announcements.filter(a => a.active).length,
      team: _data.team.length,
    };
  },

  // ─── Publish ───
  publish() {
    _data.site.lastPublished = new Date().toISOString();
    this._logActivity('Published site changes', 'rocket');
    save(_data);
  },
};
