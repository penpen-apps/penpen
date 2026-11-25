/**
 * penpen server — front door for the penpen app on penpen-apps.github.io.
 * Runs as the trip creator. Every request: verify Google sign-in → look up the
 * hidden "Members" list → check the role → run the matching penpen function.
 * The rest of the files in this project are the original penpen code.
 */
var SRV_CLIENT_ID = '349845707853-pj91mvme1mskhn9dbbgn9gitc6tn06dl.apps.googleusercontent.com';
var SRV_TABS = ['Trip Details', 'Itinerary', 'Bookings', 'Contacts', 'Expenses', 'Pocket Money', 'Profiles'];
var SRV_CAN = {
  viewer:  ['read'],
  crew:    ['read', 'write'],
  creator: ['read', 'write', 'admin']
};
// Functions the app may call, and what each needs. Anything not listed is refused.
var SRV_FN = {
  read:  ['penpenToday', 'penpenVoice', 'penpenDayExtras', 'penpenSafety', 'penpenProfiles', 'penpenDiaryInfo', 'penpenDiaryVideos',
          'penpenFormData', 'penpenMoneyCats', 'settleWeb', 'penpenReceipt', 'penpenReceiptPdf', 'penpenPlan', 'penpenAudit'],
  write: ['penpenAsk', 'penpenReadBooking', 'penpenFindNumber', 'penpenChat', 'penpenLiveStart', 'penpenLiveAction', 'penpenConfirm', 'addExpenseForm', 'penpenDiaryAdd', 'penpenDiaryRemoveVideo', 'penpenSaveProfile',
          'penpenSelfie', 'penpenSetHide'],
  admin: ['penpenLiveModels', 'penpenSetBudget', 'penpenQuickFix', 'penpenSetLiveLink']
};
var __PP_EMAIL = '';
var __PP_ROLE = '';
var __PP_NAME = '';
var __PP_SESS = '';

/* Stand-in for Session.getActiveUser() so the original code sees the signed-in person. */
function ppSrvUser_() { return { getEmail: function () { return __PP_EMAIL; } }; }

function srvSS_() { return SpreadsheetApp.openById(SHEET_ID); }
function srvOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- many trips ----------
   Every trip is its own sheet. The original trip is the home sheet; new trips are copies of it,
   wiped clean, kept in the "penpen trips" folder. Each request names its trip; only trips on the
   list below can be opened, and the person must be on that trip's Members tab. */
var PP_HOME = 'XXX_SHEET_ID';
var __PP_TRIP = '';
var __PP_SS = null;   // the open trip's spreadsheet, opened once per request
function ppK_(k) { return __PP_TRIP ? k + '@' + __PP_TRIP : k; }
function ppProps_() { return PropertiesService.getScriptProperties(); }
function ppTripList_() { try { return JSON.parse(ppProps_().getProperty('pp_trips') || '{}'); } catch (e) { return {}; } }
function ppUseTrip_(id) {
  id = String(id || '');
  if (!id || id === PP_HOME || !ppTripList_()[id]) id = '';
  __PP_TRIP = id; SHEET_ID = id || PP_HOME; SSID = id || PP_HOME; __PP_SS = null;
}
function ppMine_(email) { try { return JSON.parse(ppProps_().getProperty('pp_mine_' + email) || '[]'); } catch (e) { return []; } }
function ppMineAdd_(email, id) {
  if (!id) return;
  var l = ppMine_(email);
  if (l.indexOf(id) < 0) { l.push(id); ppProps_().setProperty('pp_mine_' + email, JSON.stringify(l)); }
}
function ppCodeTrip_(code) {
  if (!code) return '';
  var p = ppProps_(), all = ppTripList_();
  for (var id in all) if (p.getProperty('pp_invite@' + id) === code) return id;
  return '';
}
function ppTripName_() {
  try { var r = srvSS_().getRangeByName('TripName'); var n = r ? String(r.getDisplayValue()).trim() : ''; return n || 'My trip'; } catch (e) { return 'My trip'; }
}
function ppTripsFolder_() {
  var p = ppProps_(), id = p.getProperty('pp_trips_folder');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('penpen trips');
  p.setProperty('pp_trips_folder', f.getId());
  return f;
}
function ppMyTrips_(user) {
  var all = ppTripList_(), out = [], keep = __PP_TRIP;
  ppUseTrip_('');
  var hm = srvMemberOf_(user.email);
  if (hm) out.push({ id: '', name: ppTripName_(), role: hm.role, home: true });
  ppMine_(user.email).forEach(function (id) {
    var t = all[id]; if (!t) return;
    ppUseTrip_(id);
    var m = srvMemberOf_(user.email); if (!m) return;
    out.push({ id: id, name: t.name, start: t.start, end: t.end, where: t.where || '', role: m.role });
  });
  ppUseTrip_(keep);
  return out;
}
/* Run once from the editor (Run ▸ setupTrips) so penpen may make trip copies in your Drive. */
function setupTrips() { var f = ppTripsFolder_(); Logger.log('Trips folder ready: ' + f.getName() + ' · home sheet: ' + DriveApp.getFileById(PP_HOME).getName()); }
/* Run once from the editor (Run ▸ allowNewTrips) so penpen may make trip copies in your Drive. */
function allowNewTrips() { var f = ppTripsFolder_(); Logger.log('Trips folder ready: ' + f.getName() + ' · home sheet: ' + DriveApp.getFileById(PP_HOME).getName()); }
function ppTripsAction_(user, action, a) {
  if (action === 'trips') return { trips: ppMyTrips_(user) };
  if (action === 'newTrip') {
    // only people already on a penpen trip can start one (keeps strangers out)
    if (!ppMyTrips_(user).length) throw new Error('notmember');
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { return { trip: ppNewTrip_(user, a) }; } finally { lock.releaseLock(); }
  }
  if (action === 'removeTrip') {
    // the trip's creator can delete it (the sheet goes to the Drive bin, so it can still be restored)
    var id = String(a.id || ''), all = ppTripList_();
    if (!all[id]) throw new Error('notrip');
    ppUseTrip_(id);
    var m = srvMemberOf_(user.email);
    if (!m || m.role !== 'creator') throw new Error('notallowed');
    delete all[id]; ppProps_().setProperty('pp_trips', JSON.stringify(all));
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
    return { trips: ppMyTrips_(user) };
  }
  throw new Error('unknown action');
}
function ppNewTrip_(user, a) {
  var name = String(a.name || '').trim().slice(0, 60) || 'New trip';
  var start = String(a.start || '').slice(0, 10), end = String(a.end || '').slice(0, 10), where = String(a.where || '').trim().slice(0, 80);
  var cc = String(a.country || '').toUpperCase(); if (cc && cc !== 'XX' && !PP_PLACES[cc]) throw new Error('badcountry');
  var copy = DriveApp.getFileById(PP_HOME).makeCopy('penpen · ' + name, ppTripsFolder_());
  var id = copy.getId();
  var all = ppTripList_();
  all[id] = { name: name, start: start, end: end, where: where, by: user.email, made: new Date().toISOString() };
  ppProps_().setProperty('pp_trips', JSON.stringify(all));
  ppUseTrip_(id);
  ppBlank_(SpreadsheetApp.openById(id), user, name, start, end, where, cc, String(a.tz || ''));
  ppMineAdd_(user.email, id);
  return { id: id, name: name, start: start, end: end, where: where, role: 'creator' };
}
/* Put someone on the trip's "Who's coming" list (name + Google email) so penpen knows who "I" is.
   Returns false when the list is already full (MAXP people). */
function ppAddPerson_(ss, name, email) {
  var d = ss.getSheetByName(DET); if (!d || !email) return false;
  var rows = d.getRange(D_FIRST, 2, MAXP, 4).getValues(), lo = String(email).toLowerCase(), free = -1;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][3]).toLowerCase() === lo) return true;
    if (String(rows[i][0]).toLowerCase() === String(name).toLowerCase() && !rows[i][3]) { d.getRange(D_FIRST + i, 5).setValue(email); return true; }
    if (free < 0 && !rows[i][0]) free = i;
  }
  if (free < 0) return false;
  d.getRange(D_FIRST + free, 2).setValue(ppCellText_(name)); d.getRange(D_FIRST + free, 5).setValue(email);
  return true;
}
/* Text typed by people goes into the sheet as plain text: a leading = + - @ would otherwise run as a formula. */
function ppCellText_(s) { s = String(s == null ? '' : s); return /^[=+\-@]/.test(s) ? "'" + s : s; }
/* The trip creator adds a friend by their Google email (no invite link needed).
   Crew also go on "Who's coming", so penpen splits costs with them; viewers only get to look. */
function ppAddMember_(me, a) {
  var name = String(a.name || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40);
  var email = String(a.email || '').trim().toLowerCase(), role = String(a.role || '');
  if (!name) throw new Error('badname');
  if (email.length > 254 || !/^[a-z0-9_][^\s@<>()\[\]\\,;:"']*@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(email)) throw new Error('bademail');
  if (role !== 'crew' && role !== 'viewer') throw new Error('badrole');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (srvMemberOf_(email)) throw new Error('already');
    var ss = srvSS_(), onList = false;
    if (role === 'crew') {
      // two people with the same name would confuse "Kate paid": ask for a different name instead
      var d = ss.getSheetByName(DET), rows = d ? d.getRange(D_FIRST, 2, MAXP, 4).getValues() : [];
      if (rows.some(function (r) { return String(r[0]).trim().toLowerCase() === name.toLowerCase() && r[3] && String(r[3]).toLowerCase() !== email; })) throw new Error('samename');
      onList = ppAddPerson_(ss, name, email);
    }
    srvMembersSheet_().appendRow([email, ppCellText_(name), role, new Date(), me.email]);
    ppMineAdd_(email, __PP_TRIP);   // shows up in their My trips (the home trip is found from its Members tab)
    return { added: { name: name, email: email, role: role }, onList: onList, full: role === 'crew' && !onList };
  } finally { lock.releaseLock(); }
}
// midnight in the trip sheet's own time zone, so the date doesn't slip a day when the script runs in another zone
function ppDate_(s, tz) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? Utilities.parseDate(s, tz, 'yyyy-MM-dd') : ''; }
function ppClearBelowHead_(s) {
  if (!s) return;
  var last = s.getLastRow(), cols = Math.max(1, s.getLastColumn()); if (last < 2) return;
  var v = s.getRange(1, 1, Math.min(last, 6), cols).getValues(), h = 0;
  for (var i = 0; i < v.length; i++) if (v[i].filter(String).length >= 2) { h = i + 1; break; }
  if (!h || h >= last) return;
  s.getRange(h + 1, 1, last - h, cols).clearContent();
}
/* Wipe a fresh copy so the new trip starts empty (same steps as "start over", plus the private bits). */
function ppBlank_(ss, user, name, start, end, where, cc, tz) {
  ss.getSheets().forEach(function (s) { if (/^Backup/i.test(s.getName())) ss.deleteSheet(s); });
  var es = ss.getSheetByName(EXP), n = es.getMaxRows() - FR + 1;
  es.getRange(FR, 1, n, PX_USER).clearContent();
  es.getRange(FR, PX.rate, n, 3).clearContent();
  var pm = ss.getSheetByName(PM);
  if (pm && pm.getMaxRows() > 2) pm.getRange(3, 1, pm.getMaxRows() - 2, 5).clearContent();
  [BOOK, ITIN].forEach(function (nm) {
    var s = ss.getSheetByName(nm);
    if (s && s.getMaxRows() > 1) s.getRange(2, 1, s.getMaxRows() - 1, s.getMaxColumns()).clearContent();
  });
  ['Contacts', 'Profiles', 'Reminders', 'Change log'].forEach(function (nm) { ppClearBelowHead_(ss.getSheetByName(nm)); });
  var d = ss.getSheetByName(DET);
  ['FileTitle', 'TripName', 'TripStart', 'TripEnd'].forEach(function (nm) { var r = ss.getRangeByName(nm); if (r) r.clearContent(); });
  var loc = ss.getRangeByName('Locations');
  if (loc) loc.offset(0, 1, loc.getNumRows(), loc.getNumColumns() - 1).clearContent();
  d.getRange(D_FIRST, 2, MAXP, 4).clearContent();
  var set = function (nm, v) { var r = ss.getRangeByName(nm); if (r && v !== '') r.getCell(1, 1).setValue(v); };
  if (loc && where) loc.getCell(1, 2).setValue(where);
  if (cc) ppApplyPlace_(ss, cc, tz);   // country first: it sets the time zone the dates below are read in
  var stz = ss.getSpreadsheetTimeZone();
  set('TripName', name); set('FileTitle', name); set('TripStart', ppDate_(start, stz)); set('TripEnd', ppDate_(end, stz));
  ppAddPerson_(ss, user.name, user.email);
  var m = ss.getSheetByName('Members');
  if (m) { m.clearContents(); m.appendRow(['Email', 'Name', 'Role', 'Joined', 'Invited by']); m.appendRow([user.email, ppCellText_(user.name), 'creator', new Date(), '']); }
  SpreadsheetApp.flush();
  try { applyDetails(ss); } catch (e) {}
}

function doGet() { return srvOut_({ ok: true, app: 'penpen server' }); }

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var user = req.session ? srvSession_(req.session) : srvVerify_(req.token);
    __PP_SESS = req.session || '';
    __PP_EMAIL = user.email;
    var action = String(req.action || ''), args = req.args || {};
    if (action === 'trips' || action === 'newTrip' || action === 'removeTrip') return srvOut_({ ok: true, data: ppTripsAction_(user, action, args) });
    ppUseTrip_(action === 'join' ? ppCodeTrip_(args.code) : req.trip);
    var data = srvRoute_(user, action, args);
    if (action === 'join' && data && data.member) { ppMineAdd_(user.email, __PP_TRIP); data.trip = __PP_TRIP; try { ppAddPerson_(srvSS_(), user.name, user.email); } catch (e) {} }
    if (action === 'whoami' && __PP_TRIP && data && data.member && data.member.role !== 'viewer') { try { ppAddPerson_(srvSS_(), user.name, user.email); } catch (e) {} }
    return srvOut_({ ok: true, data: data });
  } catch (err) {
    return srvOut_({ ok: false, error: String((err && err.message) || err) });
  }
}

/* ---------- sign-in check ---------- */
function srvVerify_(tok) {
  if (!tok) throw new Error('signin');
  var key = 'tok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, tok));
  var cache = CacheService.getScriptCache();
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(tok), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('signin');
  var p = JSON.parse(r.getContentText());
  if (p.aud !== SRV_CLIENT_ID || String(p.email_verified) !== 'true' || Number(p.exp) * 1000 < Date.now()) throw new Error('signin');
  var u = { email: String(p.email).toLowerCase(), name: p.given_name || p.name || p.email, picture: p.picture || '' };
  cache.put(key, JSON.stringify(u), 300);
  return u;
}

/* ---------- remember-me sessions (30 days), so people don't re-sign in every hour ---------- */
function srvSessKey_(s) { return 'sess_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s))).slice(0, 40); }
function srvNewSession_(user) {
  var s = Utilities.getUuid() + Utilities.getUuid();
  var p = PropertiesService.getScriptProperties();
  p.setProperty(srvSessKey_(s), JSON.stringify({ email: user.email, name: user.name, exp: Date.now() + 30 * 864e5 }));
  return s;
}
function srvSession_(s) {
  var raw = PropertiesService.getScriptProperties().getProperty(srvSessKey_(s));
  if (!raw) throw new Error('signin');
  var u = JSON.parse(raw);
  if (u.exp < Date.now()) { PropertiesService.getScriptProperties().deleteProperty(srvSessKey_(s)); throw new Error('signin'); }
  return { email: u.email, name: u.name, picture: '' };
}

/* ---------- members & roles ---------- */
function srvMembersSheet_() {
  var ss = srvSS_();
  var sh = ss.getSheetByName('Members');
  if (!sh) {
    sh = ss.insertSheet('Members');
    sh.appendRow(['Email', 'Name', 'Role', 'Joined', 'Invited by']);
    sh.appendRow([Session.getEffectiveUser().getEmail().toLowerCase(), 'Kate', 'creator', new Date(), '']);
    sh.hideSheet();
  }
  return sh;
}
function srvMembers_() {
  var v = srvMembersSheet_().getDataRange().getValues(), list = [];
  for (var i = 1; i < v.length; i++) if (v[i][0]) list.push({ row: i + 1, email: String(v[i][0]).toLowerCase(), name: v[i][1], role: String(v[i][2] || 'crew') });
  return list;
}
function srvMemberOf_(email) { return srvMembers_().filter(function (m) { return m.email === email; })[0] || null; }
function srvNeed_(m, perm) {
  if (!m) throw new Error('notmember');
  if ((SRV_CAN[m.role] || []).indexOf(perm) < 0) throw new Error('notallowed');
}
function srvInvite_(fresh) {
  var p = PropertiesService.getScriptProperties();
  var c = p.getProperty(ppK_('pp_invite'));
  if (!c || fresh) { c = Utilities.getUuid().replace(/-/g, '').slice(0, 10); p.setProperty(ppK_('pp_invite'), c); }
  return c;
}
function srvReadTab_(name) {
  var sh = srvSS_().getSheetByName(name);
  if (!sh) return { headers: [], rows: [] };
  var v = sh.getDataRange().getDisplayValues();
  return { headers: v[0] || [], rows: v.slice(1).filter(function (r) { return r.join('') !== ''; }) };
}
function srvAppendByHeader_(name, obj) {
  var sh = srvSS_().getSheetByName(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var low = {}; Object.keys(obj).forEach(function (k) { low[String(k).toLowerCase()] = obj[k]; });
  sh.appendRow(head.map(function (h) { return low[h] !== undefined ? low[h] : ''; }));
  return sh.getLastRow();
}

/* ---------- actions ---------- */
function srvRoute_(user, action, a) {
  var me = srvMemberOf_(user.email);
  __PP_ROLE = me ? me.role : '';
  __PP_NAME = me ? String(me.name || '') : '';

  if (action === 'whoami') return { user: user, member: me, can: me ? SRV_CAN[me.role] : [], session: me ? (__PP_SESS || srvNewSession_(user)) : '' };

  if (action === 'join') {
    if (me) return { member: me };
    if (!a.code || a.code !== srvInvite_()) throw new Error('badinvite');
    srvMembersSheet_().appendRow([user.email, ppCellText_(user.name), 'crew', new Date(), 'invite']);
    return { member: srvMemberOf_(user.email) };
  }

  // The original penpen screens call their server functions through here.
  if (action === 'call') {
    var fn = String(a.fn || ''), args = a.args || [];
    var need = SRV_FN.read.indexOf(fn) >= 0 ? 'read' : SRV_FN.write.indexOf(fn) >= 0 ? 'write' : SRV_FN.admin.indexOf(fn) >= 0 ? 'admin' : '';
    if (!need || typeof globalThis[fn] !== "function") throw new Error('notallowed');
    srvNeed_(me, need);
    srvPersonalGuard_(me, fn, args);
    var out = globalThis[fn].apply(null, args);
    return out;
  }

  if (action === 'trip') {
    srvNeed_(me, 'read');
    var data = {};
    SRV_TABS.forEach(function (t) { data[t] = srvReadTab_(t); });
    return { me: me, can: SRV_CAN[me.role], tabs: data, members: srvMembers_().map(function (m) { return { name: m.name, role: m.role }; }) };
  }

  if (action === 'addExpense') {
    srvNeed_(me, 'write');
    var e = a.expense || {};
    return { row: srvAppendByHeader_('Expenses', e) };
  }

  if (action === 'theme') { srvNeed_(me, 'read'); return { theme: PropertiesService.getScriptProperties().getProperty(ppK_('pp_trip_theme')) || '' }; }
  if (action === 'setTheme') { srvNeed_(me, 'admin'); var th = String(a.theme || '').replace(/[^a-z]/g, '').slice(0, 20); PropertiesService.getScriptProperties().setProperty(ppK_('pp_trip_theme'), th); return { theme: th }; }

  if (action === 'setPlace') { srvNeed_(me, 'admin'); return { place: ppSetPlace_(a) }; }

  if (action === 'invite') { srvNeed_(me, 'admin'); return { code: srvInvite_(!!a.fresh) }; }
  if (action === 'members') { srvNeed_(me, 'admin'); return { members: srvMembers_() }; }
  if (action === 'addMember') { srvNeed_(me, 'admin'); return ppAddMember_(me, a); }

  if (action === 'setRole') {
    srvNeed_(me, 'admin');
    var t = srvMemberOf_(String(a.email || '').toLowerCase());
    if (!t || t.role === 'creator' || !SRV_CAN[a.role] || a.role === 'creator') throw new Error('notallowed');
    srvMembersSheet_().getRange(t.row, 3).setValue(a.role);
    return { members: srvMembers_() };
  }
  if (action === 'removeMember') {
    srvNeed_(me, 'admin');
    var t2 = srvMemberOf_(String(a.email || '').toLowerCase());
    if (!t2 || t2.role === 'creator') throw new Error('notallowed');
    srvMembersSheet_().deleteRow(t2.row);
    return { members: srvMembers_() };
  }

  throw new Error('unknown action');
}

/* The personal ("me") diary lives in the creator's Drive on this server, so only the creator
   may use it here. Everyone else's personal diary is kept in their own Drive by the app. */
function srvPersonalGuard_(me, fn, args) {
  if (me.role === 'creator') return;
  var kind = '';
  if (fn === 'penpenDiaryAdd') kind = args[0] && args[0].kind;
  if (fn === 'penpenDiaryVideos' || fn === 'penpenDiaryRemoveVideo') kind = fn === 'penpenDiaryVideos' ? args[0] : args[1];
  if (kind === 'me') throw new Error('personaldiary');
}

/* ================= Code (original penpen code) ================= */
/**
 * Brad & Kate trip tracker helpers.
 * Menu: ✈️ Trip → Add an expense · Settle up · Refresh design & charts
 */
var BTN_ADD = 'iVBORw0KGgoAAAANSUhEUgAAASwAAABIBAMAAAC+QdW+AAAAJFBMVEUOdm33+voAAAAMb2hfo56t0M6GurYhgXo1i4QOeXEOd3CTwb2E5d/4AAAADHRSTlP9/wAb//////+iaf8WBChQAAAGs0lEQVR42s2aXWwcVxmGnzM/9q5LsnOatYgq0W5zleaiGeFEoBDIWNhuhECsBaY3jeRGofSCqhuRUqImYlBQg8RFp4oEUfCFW+CmKtKiCkGblZjIpqVSf8YSwlUF6uYOERTvqMXObmZ3uJjZ3VmbVmthMnNu9ps5R2ffeb/ve8+v2Ee/yHdLSNIoa3T2rCWeRR+WKDTExbWNSgqo8o78SUMUGr0XWgKVv/dbJ5qpkLXxncrqled8o7GVLcM/P0+aZWy/H3ZtpWvU/SfSRcX6aqHTtdVuiMvzj5NyCfzP3BpkSxgpezDi6z1hDMAqrGYAFaw/4SdhCf8imShnC0YyE3d72YCFel9ftwRZQUXboNF1YmEXmSkrfpct4f89O7DaBRoRW0aGyIIVETsxnM8SrJE4tsRGPUuwOk8aIPZhdLwswUIthSggtqCqpK0RKIiNgZe5aSlf+KaVJq4nDcS+3QNaqn3NBeCgm6IXuU9Bmf8vqFhJka+REqKkJrX00WoP4I30cH3WUxhNPOvV/pxsb3qwKijKeuL5Uwm7aaeWm/MlxTASZA1U/rxn/Uj+qtdERkF3Wv4fg08IJUnEI4Ny27Nc2j3f3gm2RlG8xJoxiix1wowQ9FLUgzuamGFbu7/Ploh/a/FE//ddhUULjDu6mr1bSSTi0U0BHva8eQwXQJuJSNNO9cmbOmXDzCnQHrO0x6wzp+yo5XFg5vHRmeMAP45+cjNTw6bigT5bs1JKKWWR05Eh4yohLVkEclLKp6SFJuV4N+QnpRyH38oKk9IWckrKcUCTUpZBFielLIMupXwYcrNSFoeKrReVD5zeaLhlvIlHJQvLEsBZ4G/AFyGI50IjHgQGZeo5T7U1dkFQhhPANbAUD16HrwKvwVkX2sMEafOmkljUbqmOA6qE3Qgq4PHlQy7gMXEo/oQv8PD30FFZbnOUAHfiEMtoVf1pkzLcVie4XdFcdc3EwuFzZ3hvKC8q5paIJyEMAFTHsPDIufrLV8ugodaudvlUL58zg0qwKM5hAmrtKm3aHPjBEm8Aj9RMPIWjLH3D1Aj/8IzVGWqwVjY+ga3ReM3WxMYgoAUGCI6CGedoAMt4lANHt6OsMbFtXAKrDWMOLnRYJlhwBGVo3B4q5LVNME1QX71kQdsjFtFRAlT+jMCq4hgEGGB60ZfocwQuqNCK3W55rmAOajo044lKe/zrCwT8bm5YOU7AqiwCNYCgBqKnVOsj+ixukGhfByeuDmpAxQ3AdKOaBnE3vaGsecQLflP8V7exsz1YzoBkVha7luUFbpe53td2q/Uy4DACq8k8mQM6C90e/jj9Fm3rGtMGdJxtshV5rELT4WmaxuZ8tJ+NU0DD6GkHrStRRnrWctzWxbrGlcFer44e8TyNf740tNAnMlFultNoyiXHgUk5r8kiTEprRO6F2UhOZRG04yCLQloI+WmYlQhpwZTNbBGEtLRpC00amjTg2YeGy8T8xxIHt6LXIbBMNaBtaR4oNK3vx9pRbluceNPWCHQ8oGU/4+ro/IWRty/3vvetVU6Dil7J/fSdYWA5Sn99EW6ptSI5C4AQDZOVXcCtMiu/iFsssjJb1e3zmC3uAnj+Z7Ro0R6/i+P9jltzC5hNM/h1HnWoNZnySbUNgHNYgIpgCTgDvJQYzS1cvoKjuZjrFkxEVR8RoC/iRr0HJjVUlyUCGG6HVrt/xvlYObVcQJ+7pwrNY/cuBE+9u+eHJ9/n30eMGxdOjrkArzza2HM5N6dcZunk+xAcMm7YcPtwQRywOXzvAurcPe7rXzLClyH4cJYb9jBD9d0c6D9Nbgr58W1PdndqJv2iurt/1HI9Fw2T629Ghv7RdmHl9u7MLsv1xMSmH40x0Z/fbm/aDs1O8zcVs6+bQeSCtoyRVrfbXUBpZ1Y+qkJiMKhu2grYbtGndsaHTdT8Rn/pkxtYKD647f9o/3VnYAlD6YwlVD25eFbT27NZrKtGJ3Hq+cZ0/X8ga8fK9X8oSiERXM1Xeuax9MjK+yWFzmIyl74dGw9VU0NFq44qWyK5k/Wn7xbqoB1OERUv1G+Jfci3B9+e8dRXU93TnVjL8Aa436xkCdXocwXQIMyXsgRLeT6MznzEYpZgtYx40G9kKrQOht0TsoKZoYD3G90pkp8lsvqHwmGYGbrURiNx4eBDJxuo8geNxD2IsHA2G7Au+o3krRH/gUyIxNilwsBllrBxIQO4xvaHjU0XpT64kHp45fff3HJ/q1S4lDJfYw/4yhZY+IULR5zRtDBV8r/c7xeyfmVRZPOC538Aj1EJzgw7kJ0AAAAASUVORK5CYII=';
var BTN_SETTLE = 'iVBORw0KGgoAAAANSUhEUgAAASwAAABIBAMAAAC+QdW+AAAAJFBMVEX+/v4IcWkAAACGvrk1h35ZoZuu0M4jgnsEcXE1jYYFcmoOd29O7s1XAAAADHRSTlP+9AD/IP7+/wX/om0sx6ZvAAAGYklEQVR42tWaf2wTZRjHP3dtz40h2ysi1JhZGyEQYoQsmhhJKKZo4gA7pVMm4DVqxZAoJviTSArRgIpJ5x+alKinCYuuwRUEfwSCxSCKkaSJsk2joxAR4o8xyMRxa4t/XHt32/jHVbzzSa659727N99+3+/7Ps/7vK8UxLL4c4FSPsx/b3vlQGlVylYhWbCUNk1+4/RfaxyAVZsUm/JKm2ZWeG2o3prdunz9vqADsOSuab2pJR2qNpYt9a32+LzLNZwx5cZ5nSdn6GNg5Rs3rG12ChSA0nzoVKM8Glap/aHfcNZavj4ZqPRqGap6zHFUdN08SVFHsKVurr9DcxoWyiv1m3UbLGVoQ1cG58035VRCA/AIgGLA96YLUFFqy/dYbCmFP0/iDmvfEdIqbK3of/ATl8Daf/qnYpktF5FVocsjXEVWhS4ZSsTXuAYVf8XJgxREOT7xV/fAIjb/uIZHsGJ4eq+LYB35/KciMpR6My5CxfDzefAIpWfwT3v1w9N/n3TnEQdx+ddPy0nBlfvrM/bwIgtQ46CH9NUPXi0jq2NRMfSp6lwvKgGkgPeMLaKZmzejaefinJYzWc+Vlw0MWfyds7zmqq+cgvV9+ym51B2yKrbYHr7jGFvelXnPE0zLmWQdtD816fLct3hqz0WkeU/3JYJVezkbP7YpS9htSmUYCCHEU9ZbN0WMKyYuFV3rZsr0W8PQ1PsLAIU5RuF+am5nq/XRjweNC+VSwTqK/O5jZumCebcnBFAW3ZyaO95vJWI+VHXjunTWczWzr7KcpNl/EUUIISaX+7Ch/IOiAnExOR4XDSqxqQDxCtVxo6Co1bMY2ynTZpYGgHA4HA6H0QdHJALQoxHwrd7xOqQppdNIZUnem/YbE+/9O0BJJ2ne7aubGqkOVgfeowGzlAUlXZlqQ1l0VQP0Oh+QAqVOY11kpFuPZRjaParRRVn9iypTEv0yWVPxgCWZXWX6IFRoNZCycCkHiSJHo8h3AZDxRkMF1b4QzhcOnE1URss4rVBprKJ4SxbLTc1/xB5/KxDxdm6NSKTUYipFMQXg49bUbhoMt1D58tbiWkLVpnCeHtEr+j1NTU1NTSo0AAkAzocY2pOE7DC8p6sGdqX8tzLoiY6RTWYYpqM6Z/2MjMm3DLCvr6+vr28O7ZrFXdfSBBtUBRWg7BKM3lYVgOLIORpIVDd/ePBmLaYmWOKPJeyvbaUl2wDvCCCQG8GugIR3TLtZX3V9WBjbZHgvMDqM3l3XAd4QUDfqbUDqHLtqr9YthrpGie2DSbDfzujddRr66m2wbuy6rSZ90VZDVc4QXhmzU2oAWGwbmzqAvHcOoKGTGPO5ZoVqml72XgVQqtRWEfmliDVbAPM16bZgMBgMJsDQuMSL8Ag6oVqI+bFpHS9JFJE06iIsByCJdJF/8I+i+c02bUmAN4O+HYBGIA+gN2f9oU4G+GjCk/mMFwJSNB2QomlgWN0ULWSzBsIvl+1SAWVDdC+5at3ihKR5K4SwnFmLEOV4yldx2+3GCzEhyhfUWnHZE0K0ijXMnSJVnPy4rVbzzJhsxuwvZTlhBvOz8mAop7SiMdzwDbDnrrDYDt2LFh7oXrTwwJE7uyncsHZBnUHN4S0LXlnc3+s/O7woNrE6tjwPSLN/+9Xmd1nYqRje7hptfIufuT9Xv2SKtUjXn/7D5K4GuPbIRNNJDjgEa66QV75mG5fACWsmDOGQzfpF5gprmgoBBRNmzbgyJoF/AdZ1eBZsC5n6POYF9pl+fGhco+jsuWpRKd9N8BzLBczsVqHW/jQyruF06lz1+2VexTPZ/63FygWb5/d94ZS0LnT2yoXzNijnLZUrziUuI8msLK+0Jx52mvmjW5zLux36JSBT0mzLp+JrZVzznUtc+vQ8BGfaFrCAskwI8aSTydPYzo1BgsGEf9T4jKs4uo9REwxKQdTP6t2UavbVX6m7dbvAC0PPTF/mIlj+zT8EkEEmlXQPqtoUAWOHrHvgs0HXwHp1YHHOgFV8YHCNW3buar8sHq7svrqILoOsyoGDa2962RWoHtk+yZaVUo7Ojrhizvqw35jKywcOYs/+vjTnOCplS3PPYRssuh/ddeKc47CWvJ1ry/0Pjv7A8ce3THHURSsth042/l+OlRmH8J5avy/vACj5+mnvp5bMaNNcfmRRcucBz78BTLUQTuiSNNgAAAAASUVORK5CYII=';
var PAL = ['#0B7F8C', '#FFC93C', '#2E8B57', '#12324A', '#E8743B', '#94a3b8'];
var TITLE = {color: '#0f172a', fontSize: 13, bold: true};

function onOpen() {
  try { var d = SpreadsheetApp.getActive().getSheetByName('Dashboard'); if (d) SpreadsheetApp.getActive().setActiveSheet(d); } catch (x) {}
  SpreadsheetApp.getUi().createMenu('✈️ Trip')
    .addItem('🐧 penpen (type or say it)', 'showQuickAdd')
    .addItem('➕ Add an expense', 'showAddExpense')
    .addItem('💸 Settle up', 'showSettleUp')
    .addItem('📱 Phone app link', 'showPhoneLink')
    .addSeparator()
    .addItem('🎨 Refresh design & charts', 'setupTracker')
    .addToUi();
}

var SHEET_ID = 'XXX_SHEET_ID';
// On a trip other than the home one, always use that trip's sheet (never the sheet this script may be bound to).
function ss_() {
  if (__PP_TRIP) return __PP_SS || (__PP_SS = SpreadsheetApp.openById(SHEET_ID));
  return SpreadsheetApp.getActive() || SpreadsheetApp.openById(SHEET_ID);
}
function sh_(n) { return ss_().getSheetByName(n); }
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function goTo(name) { var s = sh_(name); if (s) SpreadsheetApp.getActive().setActiveSheet(s); }

function people_() {
  return sh_('Trip Details').getRange('B16:B21').getDisplayValues()
    .map(function (r) { return String(r[0]).trim(); }).filter(String);
}

function listFrom_(a1, fallback) {
  try {
    var dv = sh_('Expenses').getRange(a1).getDataValidation();
    if (dv) {
      var t = dv.getCriteriaType(), cv = dv.getCriteriaValues();
      if (t == SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) return cv[0].filter(String);
      if (t == SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE)
        return cv[0].getDisplayValues().map(function (r) { return r[0]; }).filter(String);
    }
  } catch (e) {}
  return fallback;
}

/* ---------------- Add expense pop-up ---------------- */
function showAddExpense() {
  var p = people_();
  var td = sh_('Trip Details');
  var curs = listFrom_('E3', ['USD', 'PHP']);
  var tripCur = td.getRange('C11').getDisplayValue();
  var data = {
    people: p,
    cats: listFrom_('C3', ['Transportation', 'Accommodation', 'Food & Drinks', 'Activities & Tours', 'Shopping & Other']),
    curs: curs,
    defCur: curs.indexOf(tripCur) >= 0 ? tripCur : curs[0],
    splits: listFrom_('G3', ['Shared'].concat(p)),
    today: Utilities.formatDate(new Date(), ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd'),
    trip: td.getRange('C7').getDisplayValue()
  };
  var html = css_() +
    '<div class="sub">' + esc_(data.trip) + '</div>' +
    '<form id="f" onsubmit="go(event)">' +
    '<label class="f">What / place</label><input type="text" id="what" placeholder="e.g. Dinner at Larsian">' +
    '<div class="row"><div><label class="f">Amount</label><input type="number" id="amt" class="amt" step="0.01" min="0" placeholder="0.00"></div>' +
    '<div><label class="f">Currency</label><div class="chips" id="cur"></div></div></div>' +
    '<label class="f">Date</label><input type="date" id="date">' +
    '<label class="f">Category</label><div class="chips" id="cat"></div>' +
    '<label class="f">Who paid?</label><div class="chips" id="payer"></div>' +
    '<label class="f">For (who it was for)</label><select id="split"></select>' +
    '<label class="f">Notes (optional)</label><input type="text" id="notes" placeholder="Anything to remember">' +
    '<div class="err" id="err"></div>' +
    '<div class="btns"><button type="button" onclick="google.script.host.close()">Cancel</button><button class="p" id="sub" type="submit">Add expense</button></div>' +
    '</form>' +
    '<div id="done" class="ok" style="display:none"><div class="big">✅</div><h2>Added!</h2><div class="muted" id="msg"></div>' +
    '<div class="btns" style="justify-content:center"><button type="button" onclick="google.script.host.close()">Done</button><button class="p" type="button" onclick="again()">Add another</button></div></div>' +
    '<script>var D=' + JSON.stringify(data).replace(/</g, '\\u003c') + ';(' + clientAdd_.toString() + ')();</script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(440).setHeight(640), '➕ Add an expense');
}

function clientAdd_() {
  function $(id) { return document.getElementById(id); }
  function el(t, props) { var e = document.createElement(t); for (var k in props) e[k] = props[k]; return e; }
  function chips(id, items, def) {
    var box = $(id); box.innerHTML = '';
    items.forEach(function (v, i) {
      box.appendChild(el('input', {type: 'radio', name: id, id: id + i, value: v, checked: v == def}));
      box.appendChild(el('label', {htmlFor: id + i, textContent: v}));
    });
  }
  function val(id) { var r = document.querySelector('input[name=' + id + ']:checked'); return r ? r.value : ''; }
  function init() {
    chips('cur', D.curs, D.defCur);
    chips('cat', D.cats, '');
    chips('payer', D.people.concat(['Pocket money', 'Not sure yet']), '');
    var s = $('split'); s.innerHTML = '';
    D.splits.forEach(function (v) { s.appendChild(el('option', {value: v, textContent: v})); });
    s.value = D.splits.indexOf('Shared') >= 0 ? 'Shared' : D.splits[0];
    $('date').value = D.today;
    $('what').focus();
  }
  window.go = function (e) {
    e.preventDefault();
    var o = {what: $('what').value.trim(), amount: $('amt').value, cur: val('cur'), date: $('date').value,
      cat: val('cat'), payer: val('payer'), split: $('split').value, notes: $('notes').value.trim()};
    if (o.payer == 'Not sure yet') o.payer = '';
    var er = $('err');
    if (!o.what) { er.textContent = 'Add what it was for.'; return; }
    if (!(Number(o.amount) > 0)) { er.textContent = 'Enter an amount above 0.'; return; }
    if (!o.cat) { er.textContent = 'Pick a category.'; return; }
    er.textContent = '';
    var b = $('sub'); b.disabled = true; b.textContent = 'Adding…';
    google.script.run.withSuccessHandler(function (r) {
      $('f').style.display = 'none'; $('done').style.display = 'block'; $('msg').textContent = r;
      b.disabled = false; b.textContent = 'Add expense';
    }).withFailureHandler(function (x) {
      er.textContent = x.message; b.disabled = false; b.textContent = 'Add expense';
    }).addExpenseForm(o);
  };
  window.again = function () { $('f').reset(); init(); $('f').style.display = 'block'; $('done').style.display = 'none'; };
  init();
}


/* ---------------- Settle up pop-up ---------------- */

function showSettleUp() {
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(css_() + settleBody_(true)).setWidth(460).setHeight(600), '💸 Settle up');
}

function settleWeb() { return settleBody_(false); }

function css_() {
  return '<style>' +
    '*{box-sizing:border-box}body{font-family:"Google Sans",Roboto,Arial,sans-serif;margin:0;padding:2px;color:#0f172a;font-size:13px}' +
    '.sub{color:#64748b;font-size:12px;margin-bottom:4px}' +
    'label.f{display:block;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px}' +
    'input[type=text],input[type=number],input[type=date],select{width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;font-size:14px;background:#fff;outline:none}' +
    'input:focus,select:focus{border-color:#0f766e;box-shadow:0 0 0 3px #ccfbf1}' +
    '.row{display:flex;gap:12px}.row>*{flex:1}.amt{font-size:20px!important;font-weight:600}' +
    '.chips{display:flex;flex-wrap:wrap;gap:6px}.chips input{display:none}' +
    '.chips label{padding:7px 13px;border:1px solid #cbd5e1;border-radius:999px;cursor:pointer;user-select:none;background:#fff;transition:all .12s}' +
    '.chips label:hover{border-color:#0f766e}.chips input:checked+label{background:#0f766e;border-color:#0f766e;color:#fff}' +
    '.btns{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;position:sticky;bottom:0;background:#fff;padding:10px 0 4px}' +
    'button{font:inherit;font-weight:600;padding:10px 18px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer}' +
    'button:hover{background:#f8fafc}button.p{background:#0f766e;border-color:#0f766e;color:#fff}button.p:hover{background:#115e59}button:disabled{opacity:.6}' +
    '.err{color:#b91c1c;font-size:12px;min-height:16px;margin-top:8px}' +
    '.ok{text-align:center;padding:40px 10px}.ok .big{font-size:44px}.ok h2{margin:8px 0 6px;font-size:20px}.muted{color:#64748b}.small{font-size:11px;margin-top:6px}' +
    '.card{border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;margin-bottom:10px}' +
    '.hero{background:#f0fdfa;border-color:#99f6e4}.hero .lbl{font-size:11px;font-weight:700;color:#0f766e;letter-spacing:.08em}.hero .v{font-size:20px;font-weight:700;color:#0f766e;margin-top:4px}' +
    '.stats{display:flex;gap:10px}.stats .card{flex:1}.stats .v{font-size:19px;font-weight:700;margin:2px 0}' +
    'table{width:100%;border-collapse:collapse;margin-top:6px}td,th{padding:7px 4px;text-align:right;border-bottom:1px solid #f1f5f9;vertical-align:top}' +
    'th{font-size:11px;color:#64748b;font-weight:600}td:first-child,th:first-child{text-align:left}' +
    '.pos{color:#0f766e;font-weight:700}.neg{color:#b91c1c;font-weight:700}' +
    '</style>';
}

/* ---------------- Design + charts ---------------- */
function setupTracker() {
  var ss = SpreadsheetApp.getActive();
  var n = Math.max(people_().length, 1);
  var db = sh_('Dashboard'), ex = sh_('Expenses');

  // Dashboard: wider "What" column so entries aren't cut off
  db.setColumnWidth(3, 160);

  var B = db.getRange('B1:B150').getDisplayValues().map(function (r) { return String(r[0]).trim(); });
  function rowOf(t) { for (var i = 0; i < B.length; i++) if (B[i].indexOf(t) == 0) return i + 1; return -1; }
  function w(c1, c2) { var s = 0; for (var c = c1; c <= c2; c++) s += db.getColumnWidth(c); return s; }
  var rWho = rowOf('Who paid what'), rCat = rowOf('By category'), rDay = rowOf('Daily spending'), rNs = rowOf('Not split yet');

  // Hide empty person rows in "Who paid what"
  if (rWho > 0) db.hideRows(rWho + 1, 7);

  // Rebuild charts
  db.getCharts().forEach(function (c) { db.removeChart(c); });
  if (rCat > 0) {
    var s = rCat + 2, e = s; while (B[e] && B[e].indexOf('Total') != 0) e++;
    db.insertChart(db.newChart().setChartType(Charts.ChartType.PIE)
      .addRange(db.getRange(s, 2, e - s + 1, 1)).addRange(db.getRange(s, 3, e - s + 1, 1))
      .setPosition(rCat, 6, 10, 0)
      .setOption('title', 'Where the money went').setOption('titleTextStyle', TITLE)
      .setOption('pieHole', 0.55).setOption('colors', PAL).setOption('pieSliceText', 'percentage')
      .setOption('legend', {position: 'right', textStyle: {fontSize: 11, color: '#334155'}})
      .setOption('backgroundColor', '#ffffff')
      .setOption('width', w(6, 9) - 20).setOption('height', 210).build());
  }
  if (rDay > 0) {
    var s2 = rDay + 2; if (B[s2 - 1].indexOf('Other') == 0) s2++;
    var e2 = s2; while (B[e2]) e2++;
    db.insertChart(db.newChart().setChartType(Charts.ChartType.COMBO)
      .addRange(db.getRange(s2, 2, e2 - s2 + 1, 1)).addRange(db.getRange(s2, 4, e2 - s2 + 1, 2))
      .setNumHeaders(0)
      .setPosition(rDay, 6, 10, 0)
      .setOption('title', 'Daily spending (₱)').setOption('titleTextStyle', TITLE)
      .setOption('seriesType', 'bars')
      .setOption('series', {0: {type: 'bars', color: '#2dd4bf', labelInLegend: 'Spent that day'},
                            1: {type: 'line', color: '#0f766e', lineWidth: 3, targetAxisIndex: 1, labelInLegend: 'Running total'}})
      .setOption('vAxes', {0: {format: 'short', gridlines: {color: '#f1f5f9'}}, 1: {format: 'short', gridlines: {count: 0}}})
      .setOption('legend', {position: 'top', textStyle: {fontSize: 11}})
      .setOption('backgroundColor', '#ffffff')
      .setOption('width', w(6, 9) - 20).setOption('height', 300).build());
  }
  var rNote = rowOf('✅ split entries');
  if (false && rWho > 0 && rNote > 0) {
    db.insertChart(db.newChart().setChartType(Charts.ChartType.BAR)
      .addRange(db.getRange(rWho + 1, 2, n + 1, 1)).addRange(db.getRange(rWho + 1, 4, n + 1, 2))
      .setNumHeaders(1)
      .setPosition(rNote + 1, 2, 10, 6)
      .setOption('title', 'Paid vs fair share (USD)').setOption('titleTextStyle', TITLE)
      .setOption('colors', ['#0f766e', '#99f6e4']).setOption('legend', {position: 'top', textStyle: {fontSize: 11}})
      .setOption('hAxis', {format: 'short', gridlines: {color: '#f1f5f9'}})
      .setOption('backgroundColor', '#ffffff')
      .setOption('width', w(2, 9) - 20).setOption('height', 190).build());
  }

  // Pop-up buttons on the Dashboard
  db.getImages().forEach(function (i) { i.remove(); });
  var add = db.insertImage(Utilities.newBlob(Utilities.base64Decode(BTN_ADD), 'image/png', 'add.png'), 8, 2, Math.max(w(8, 9) - 170, 0), 2);
  add.setWidth(150).setHeight(36).assignScript('showAddExpense').setAltTextTitle('Add an expense');


  penpenExpensesLook_(ex);

  // Tabs
  var colors = {'penpen': '#0B7F8C', 'Expenses': '#0f766e', 'Dashboard': '#0d9488', 'Itinerary': '#2563eb', 'Bookings': '#f59e0b', 'Trip Details': '#64748b', 'Pocket Money': '#d97706'};
  ss.getSheets().forEach(function (s3) {
    var nm = s3.getName();
    if (colors[nm]) s3.setTabColor(colors[nm]);
    if (nm.indexOf('Backup') == 0) s3.hideSheet();
    if (nm == 'Dashboard' || nm == 'Trip Details' || nm == QA) s3.setHiddenGridlines(true);
  });
  try { polishLayout(); } catch (err) {}
  try { onOpen(); } catch (err) {}
  ss.toast('Design, charts and buttons are refreshed.', '✈️ Trip', 5);
}


/* ---------------- Quick add pop-up ---------------- */
var BTN_QUICK = 'iVBORw0KGgoAAAANSUhEUgAAASwAAABIBAMAAAC+QdW+AAAAJFBMVEUOdW34+/sAAAAMcXBdop2s0M2Ju7ckgnsOdm81i4QOdm4A///GkXAgAAAADHRSTlP+/wAR/////2j/pQGNDVOZAAAF/0lEQVR42s2aXWxTVRzAf/ejW1vB9hKHwYSkmyaGaaTBkmAywl3YEA2EosMHIwmE+BVFm/AAPkwGJIYHjBX3oi8MDRoJiX2QkAhkd4Hogyy5I8pHIm5vEiGjla91Pe314d723m7FxDK49zxs55z23v7O//y/zofUgVs0K48U5+EXK48Uv+HpUN1q5CLSWx2v4Uc5+ufRG5WDmVpb6nCpEgvf2YJfJfrRIQ+XizXRvnkAP0u4c1Ku1hXNqcQj/RlfqRCFxcVqvconFTZvwedy50IsXo8Vifk8gwBMXShk63QrfucSQSh7D1seaVUKuwJBxf7YhEda8YoZDCyUhFVzp1LhSkCoKMfIVydxfD6BKWOTVd2S2s3gYJUXxB2sqwESFox97GA9nQkSVusOG0ua2hIkrDu74yBDrIVAla0FW1pmsLDKcZCp3K7rjPRqmtaX9ZNrwwR0PJL0dqkbNU3TNE3309PnOuiQhxpQ+coVTXRICcUbeLbmaoDX/ONaZqpKyNMO5dxccdFfvmGlkQl72vO8OZl/ar8HpfD4VXcZZCOqFQB+ue0XltwiJ9Nu0/b2q67dtHPDez2l9j1grJAik3B/Luf8FUkAUYtJvZrmJVl5umam3Qsbcmv2o6Em7VlGLrgBsQxACTgLQFX/u8/B6XTDFxilhksr51HhGfP/Cosx2WOI9tDygJ3nO7FSNQFG3O+dCRm1aVcbvbaFqpQmmjRF2dMwPQoGULITnu2EPtkGrrjE3w9e6V2uyKwPTWfEne8euMVZIj1ZGHwJtQdg8MWqJvXYriTi/B/MTgO09jSfxiU8k1AKz/w0DtBqWAaUkLg7Og9On2P7kG7Q3U/fMQDWGwJADY+O6gZ096stAC8bY/fjIlyvNVuhbUOIAKQF3rxMMsE2yJChGADrgd8hZCKigGQgmnYkW2Wv/czKX+3uu/ZUZuvjw+oklwHe4Fl7DOrzutDpIpSSgDRK8lTz0vrPhAwgZJtVmpzXMxnKsWEEoOZsYan6M6d+JI7J6yfT0Gqo14f1OcQaavzFelOXEJBKAStZZ8v6B8O2GyXLEJSRYe6wrIE4ICmz4mFihsNMw8kTIEy1Oo7BNeughAIqCIqQmQss+yWZENClWDM1P0e6sfSqKtnd/6sBUATJmXp1LrCyAKoi0qjmCwJAAbBoRe0hcc+x27gtJmpqVhCaAyx7l0ToI23zSejOwEGhiDSq5+qGrlLdt1vuBND32HBtxPHKFkgY9+Xlp121AhD6cQRrvjRrQbKoS3pJH8Oyp9NwVN6A7j5Qf6KcsSPCEBYolEBABfU+VP7QLEv8bXrbphXf769FbUhwIatDFxXAiewKISLmKYCBqppl6IKiXtZJg6CciTS/AJUrMzSh/PaBr06oAx6t+YLSngHIIZDanLT6blq0rbWrO+xZNPi21wTyjG00gCRH1jZNNeGVlr1gPNqHbm/hqLaS20mhCiQRIWdVeQRhMMCQQOhlHVAonbOAM2CsBs4ijFST+RbIpRmOAE4zVn/wMpyCvNDhjE4nEippplOwNIMegqeIAyKFdYs4IkUoR5xSCmWk2XwrJy37oJZgqc4+1w3nCGGVJ9y0RpXrD2/9ukj2DEjoAJteZfmmuqQZoLgv+fBWPhWQPT8naZrWZrtsTdMe83G7WW73NMOAaN3JzowBTr7iS1kgPRnynF98PuBBvu4b1d6cErM8p57Dva6mPTfhG1bBlOVxT4JVPF6rrjJ8o4pOJmQi3mR4uppnrc35p1nFLDJtU96u6W06oK74zsfdwN2voGjSo3UbWT9fel9efP4PP/dO/wkjdQToeMw9JJOhMB0oKg7FQAYrPBQkquievJ00X84GCav4qXP6KnElQFjLcKRljScDpPCT+Wqq134zOFhL3UNhKxYYcSmFvLtOnLwZEGOMLh33LF/l2P5gYO0qJLyr6mJ0IAhU4cOf1V+UkgjAJZtwp7Niru1BWLFvfFevaGchP/P+1tTE+Q8Nf2W1ZFKavWOzZPzrFT4KLLrvicmDDe4GErmYkN7078pivvGVRYJ0wfNfHom9qNI3lMoAAAAASUVORK5CYII=';


function showQuickAdd() {
  var qa = sh_(QA);
  var ex = [];
  if (qa) qa.getRange('B14:B40').getDisplayValues().forEach(function (r) {
    var s = String(r[0]).trim();
    if (s.charAt(0) == '“' || s.charAt(0) == '"') ex.push(s.replace(/^[“"]|[”"]\s*$/g, '').replace(/[”"].*$/, ''));
  });
  var data = {trip: sh_('Trip Details').getRange('C7').getDisplayValue(), now: quickNow_(), examples: ex.slice(0, 7)};
  var html = css_() + '<style>' +
    '.box{position:relative}.box textarea{width:100%;min-height:92px;padding:12px 52px 12px 14px;border:2px solid #0f766e;border-radius:14px;font:inherit;font-size:16px;line-height:1.4;background:#fffbeb;resize:vertical;outline:none}' +
    '.box textarea:focus{box-shadow:0 0 0 4px #ccfbf1}' +
    '.mic{position:absolute;right:10px;top:10px;width:36px;height:36px;border-radius:50%;border:none;background:#0f766e;color:#fff;font-size:17px;padding:0;cursor:pointer}' +
    '.mic.on{background:#dc2626;animation:pulse 1s infinite}@keyframes pulse{50%{box-shadow:0 0 0 7px #fecaca}}' +
    '.hint{font-size:11px;color:#64748b;margin-top:6px}.ex{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
    '.ex button{font-weight:500;font-size:12px;padding:6px 11px;background:#f8fafc;border-color:#e2e8f0;color:#334155;text-align:left}' +
    '.log{margin-top:12px}.log .it{border:1px solid #e2e8f0;border-radius:12px;padding:9px 12px;margin-bottom:6px;font-size:13px;line-height:1.35;animation:in .25s}' +
    '.log .it.bad{border-color:#fecaca;background:#fef2f2}.log .it.good{border-color:#99f6e4;background:#f0fdfa}@keyframes in{from{opacity:0;transform:translateY(-4px)}}' +
    '.btns .l{margin-right:auto}' +
    '</style>' +
    '<div class="sub">' + esc_(data.trip) + '</div>' +
    '<div class="card hero" style="padding:10px 14px"><div class="lbl">RIGHT NOW</div><div class="v" id="now" style="font-size:16px">' + esc_(data.now) + '</div></div>' +
    '<div class="box"><textarea id="t" placeholder="Type or say it, e.g. Grab 320 ' + esc_(curWord(getCtx(ss_()).local)) + ', Brad paid"></textarea><button class="mic" id="mic" title="Speak">🎤</button></div>' +
    '<div class="hint" id="hint">Always say <b>' + esc_(curWord(getCtx(ss_()).local)) + '</b> or <b>' + esc_(curWord(getCtx(ss_()).home)) + '</b>. Press <b>Enter</b> to add · Shift+Enter for a new line.</div>' +
    '<label class="f">Try one</label><div class="ex" id="ex"></div>' +
    '<div class="btns"><button class="l" id="undo" type="button">↩ Undo last</button><button type="button" onclick="google.script.host.close()">Done</button><button class="p" id="go" type="button">Add</button></div>' +
    '<div class="log" id="log"></div>' +
    '<script>var D=' + JSON.stringify(data).replace(/</g, '\\u003c') + ';(' + clientQuick_.toString() + ')();</script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(620), '🎤 Quick add');
}

function clientQuick_() {
  function $(id) { return document.getElementById(id); }
  var t = $('t'), busy = false;
  D.examples.forEach(function (s) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = s;
    b.onclick = function () { t.value = s; t.focus(); };
    $('ex').appendChild(b);
  });
  function log(msg, bad) {
    String(msg).split(' | ').reverse().forEach(function (line) {
      var d = document.createElement('div');
      d.className = 'it ' + (bad || /⚠️|Who's|not split/i.test(line) ? 'bad' : 'good');
      d.textContent = line;
      $('log').insertBefore(d, $('log').firstChild);
    });
  }
  function run(fn, arg) {
    if (busy) return; busy = true;
    var g = $('go'); g.disabled = true; g.textContent = 'Adding…';
    var r = google.script.run.withSuccessHandler(function (res) {
      log(res.msg); if (res.now) $('now').textContent = res.now;
      if (fn == 'quickAddText') t.value = '';
      busy = false; g.disabled = false; g.textContent = 'Add'; t.focus();
    }).withFailureHandler(function (e) {
      log('⚠️ ' + e.message, true); busy = false; g.disabled = false; g.textContent = 'Add';
    });
    r[fn](arg);
  }
  $('go').onclick = function () { if (t.value.trim()) run('quickAddText', t.value); else t.focus(); };
  $('undo').onclick = function () { run('quickUndo'); };
  t.addEventListener('keydown', function (e) { if (e.key == 'Enter' && !e.shiftKey) { e.preventDefault(); $('go').click(); } });
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
  if (!SR) { $('mic').style.display = 'none'; }
  $('mic').onclick = function () {
    if (rec) { rec.stop(); return; }
    var base = t.value ? t.value.trim() + ' ' : '';
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true;
    rec.onresult = function (e) { var s = ''; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; t.value = base + s; };
    rec.onerror = function () { $('hint').innerHTML = '🎤 The mic is blocked in this pop-up. Use your keyboard’s dictation instead, or just type.'; };
    rec.onend = function () { rec = null; $('mic').className = 'mic'; };
    $('mic').className = 'mic on';
    try { rec.start(); } catch (x) { rec = null; $('mic').className = 'mic'; }
  };
  t.focus();
}

function quickAddText(text) {
  text = String(text || '').trim();
  if (!text) throw new Error('Type or say an expense first.');
  return quickRun_(function (ss, email) { return handleText(ss, text, email); });
}

function quickUndo() {
  return quickRun_(function (ss) { return undoLast(ss); });
}


function placeAt_(sh, col, x, row, y, b64, name, fn, w, h) {
  while (x >= sh.getColumnWidth(col)) { x -= sh.getColumnWidth(col); col++; }
  return sh.insertImage(Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', name), col, row, Math.max(x, 0), y)
    .setWidth(w).setHeight(h).assignScript(fn).setAltTextTitle(name);
}



/* ---------------- Phone web app ---------------- */
var WEB_URL = 'https://script.google.com/macros/s/AKfycbxstZdJaJXuHdeMbr5fL1_dj2An8EOUoxYCI4FdIB97KzrPKSuGjMJ7Rraj7HeBZTOd/exec';

function examples_() {
  var qa = sh_(QA), ex = [];
  if (qa) qa.getRange('B14:B40').getDisplayValues().forEach(function (r) {
    var s = String(r[0]).trim();
    if (s.charAt(0) == '“' || s.charAt(0) == '"') ex.push(s.replace(/^[“"]/, '').replace(/[”"].*$/, ''));
  });
  return ex.slice(0, 7);
}


function clientWeb_() {
  function loadSettle() {
    google.script.run.withSuccessHandler(function (h) { document.getElementById('settle').innerHTML = h; }).settleWeb();
  }
  var tabs = document.querySelectorAll('.tabs button');
  Array.prototype.forEach.call(tabs, function (b) {
    b.onclick = function () {
      Array.prototype.forEach.call(tabs, function (x) { x.className = ''; document.getElementById(x.getAttribute('data-p')).className = 'pane'; });
      b.className = 'on'; document.getElementById(b.getAttribute('data-p')).className = 'pane on';
      if (b.getAttribute('data-p') == 'ps') loadSettle();
    };
  });
  loadSettle();
}

function showPhoneLink() {
  var url = WEB_URL || ScriptApp.getService().getUrl();
  var h = css_() + '<p>Open this on your phone and add it to your home screen (Share → Add to Home Screen on iPhone, ⋮ → Add to home screen on Android).</p>' +
    '<input type="text" id="u" readonly value="' + esc_(url) + '" onclick="this.select()">' +
    '<div class="btns"><button class="p" onclick="var u=document.getElementById(&#39;u&#39;);u.select();document.execCommand(&#39;copy&#39;);this.textContent=&#39;Copied ✓&#39;">Copy link</button></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(h).setWidth(440).setHeight(220), '📱 Phone app link');
}

function setPhoneLink() {
  var qa = sh_(QA);
  if (qa && WEB_URL) {
    qa.getRange('B4').setFormula('=HYPERLINK("' + WEB_URL + '","📱 On your phone? Open the Quick add app →")')
      .setFontColor('#0f766e').setFontWeight('bold').setFontSize(10);
  }
}


/* Replace the old in-sheet box + checkboxes on Quick Add with the pop-up button */


/* ---------------- Clean, button-first layout ---------------- */
function cellButton_(rng, label, url, size, bg, fg) {
  rng.merge().setFormula('=HYPERLINK("' + url + '","' + label + '")')
    .setBackground(bg || '#0f766e').setFontColor(fg || '#ffffff').setFontWeight('bold').setFontSize(size || 10)
    .setFontLine('none').setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, null, null, '#ffffff', SpreadsheetApp.BorderStyle.SOLID_THICK);
  return rng;
}

function polishLayout() {
  var ss = ss_(), db = sh_('Dashboard'), qa = sh_(QA);
  var gid = function (n) { var s = sh_(n); return s ? '#gid=' + s.getSheetId() : '#'; };

  prettyDashboard_();

  penpenHelpTab_();

  // Dashboard opens first; instructions tab next to it
  ss.setActiveSheet(qa); ss.moveActiveSheet(1);
  ss.setActiveSheet(db); ss.moveActiveSheet(1);
  placeQuickButtons_();
  ss.toast('Layout tidied — Dashboard first, everything on buttons.', '✈️ Trip', 4);
}


function inspectFormulas() {
  var ex = sh_('Expenses'), db = sh_('Dashboard'), out = [];
  function f(sh, a) { var x = sh.getRange(a).getFormula(); out.push(sh.getName().slice(0,3) + '!' + a + ': ' + (x || ('[v] ' + sh.getRange(a).getDisplayValue()))); }
  ['P2','V2','W2','X2','AA2','AB2','AC2','AD2','Y2','Z2'].forEach(function (a) { f(ex, a); });
  [].forEach(function (a) { f(db, a); });
  var qa = sh_(QA); f(qa, 'B11'); f(qa, 'B12');
  Logger.log(out.join('\n').replace(/=/g, '≡').replace(/&/g, '＆').replace(/\?/g, '？'));
}


/* Personal expenses: "X only" that X paid in full → 👤 Personal, left out of group totals */
function applyPersonal() {
  var ex = sh_('Expenses'), db = sh_('Dashboard'), log = [];
  function swap(sh, a1, from, to) {
    var r = sh.getRange(a1), f = r.getFormula();
    if (f.indexOf(to) >= 0) { log.push(a1 + ' already done'); return; }
    if (f.split(from).length != 2) throw new Error(a1 + ': pattern not found once');
    r.setFormula(f.replace(from, to)); log.push(a1 + ' updated');
  }
  var P = 'REGEXMATCH(L3:L&""," only$")*(ABS(MMULT(IFERROR(F3:K*(F2:K2=REGEXREPLACE(L3:L&""," only$","")&" paid"),0),SEQUENCE(6,1,1,0))-E3:E)<0.005)';
  swap(ex, 'N2', ',"✅ Split",', ',IF(' + P + ',"👤 Personal","✅ Split"),');
  swap(ex, 'AC2', 'IF(N3:N="✅ Split",1,0)', 'IF(N3:N="✅ Split",1,IF(N3:N="👤 Personal","",0))');
  swap(ex, 'V2', 'IF((E3:E="")+(D3:D=""),"",', 'IF((E3:E="")+(D3:D="")+(N3:N="👤 Personal"),"",');
  swap(ex, 'W2', 'IF((E3:E="")+(D3:D=""),"",', 'IF((E3:E="")+(D3:D="")+(N3:N="👤 Personal"),"",');
  swap(ex, 'O2', 'IF(INDEX(r,1,2)<>"✅ Split","",', 'IF(INDEX(r,1,2)<>"✅ Split",IF(INDEX(r,1,2)="👤 Personal","Personal · not in group totals",""),');
  swap(db, 'B31', "and not Col3 starts with '✅'", "and not Col3 starts with '✅' and not Col3 starts with '👤'");

  // Grey out personal rows on Expenses
  var rules = ex.getConditionalFormatRules().filter(function (r) {
    var c = r.getBooleanCondition(); return !(c && String(c.getCriteriaValues()[0]).indexOf('👤') >= 0);
  });
  var grey = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$N3="👤 Personal"')
    .setFontColor('#9ca3af').setBackground('#f8fafc').setRanges([ex.getRange('A3:M' + ex.getMaxRows())]).build();
  var tag = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('👤 Personal')
    .setFontColor('#475569').setBackground('#e2e8f0').setRanges([ex.getRange('N3:N' + ex.getMaxRows())]).build();
  ex.setConditionalFormatRules([grey, tag].concat(rules));

  // Dashboard note under "Who paid what"
  var B = db.getRange('B1:B60').getDisplayValues();
  for (var i = 0; i < B.length; i++) if (String(B[i][0]).indexOf('Only ✅') == 0)
    db.getRange(i + 1, 2).setValue('Only ✅ split entries count here. 👤 Personal items (paid by the same person they’re for) are left out of every total. Positive balance = gets money back · negative = owes.');
  SpreadsheetApp.flush();
  Logger.log(log.join(' | ') + ' || total now: ' + db.getRange('B6').getDisplayValue() + ' · N3: ' + ex.getRange('N3').getDisplayValue() + ' · O3: ' + ex.getRange('O3').getDisplayValue() + ' · settle: ' + db.getRange('F6').getDisplayValue() + ' · notsplit: ' + db.getRange('D6').getDisplayValue());
}


/* ---------------- Calm, uncluttered Dashboard ---------------- */
function prettyDashboard_() {
  var db = sh_('Dashboard');
  var noB = function (r) { r.setBorder(false, false, false, false, false, false); return r; };

  // Remove the old top link row and the old action bar
  noB(db.getRange('B1:I1').breakApart().clearContent().setBackground(null));
  db.setRowHeight(1, 18);
  noB(db.getRange('B4:I4').breakApart().clearContent().setBackground(null));
  db.setRowHeight(4, 18);

  // Header: title left, buttons right
  db.setRowHeight(2, 46); db.setRowHeight(3, 38);
  db.getRange('B2').setFontSize(24).setVerticalAlignment('bottom');
  db.getRange('B3').setVerticalAlignment('middle').setFontColor('#64748b');
  noB(db.getRange('G2:I2').breakApart().clearContent());
  cellButton_(db.getRange('G2:I2'), '🐧  Talk to penpen  →', WEB_URL, 11);
  db.getRange('G2:I2').setBorder(true, true, true, true, null, null, '#ffffff', SpreadsheetApp.BorderStyle.SOLID_THICK);

  // Find sections
  var B = db.getRange('B1:B150').getDisplayValues().map(function (r) { return String(r[0]).trim(); });
  function rowOf(t) { for (var i = 0; i < B.length; i++) if (B[i].indexOf(t) == 0) return i + 1; return -1; }
  var rWho = rowOf('Who paid what'), rCat = rowOf('By category'), rNs = rowOf('Not split yet'),
      rLat = rowOf('Latest entries'), rDay = rowOf('Daily spending'), rNote = rowOf('Only ✅');

  // Section titles: a little bigger, with breathing room above
  [rWho, rCat, rNs, rLat, rDay].forEach(function (r) {
    if (r < 1) return;
    db.getRange(r, 2).setFontSize(13).setVerticalAlignment('bottom');
    db.setRowHeight(r, 34);
    if (r > 1 && !B[r - 2]) db.setRowHeight(r - 1, 22);
  });
  if (rNote > 0) db.getRange(rNote, 2).setValue('✅ split entries only  ·  👤 personal items not counted  ·  + gets money back, − owes')
    .setFontColor('#94a3b8').setFontSize(9);

  // Dynamic tables: no empty grid lines, soft stripes only on rows that have data
  var zebra = [];
  function soften(r0, nRows, nCols, keyCol) {
    var rng = db.getRange(r0, 2, nRows, nCols);
    noB(rng);
    zebra.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($' + keyCol + r0 + '<>"",ISEVEN(ROW()))')
      .setBackground('#f8fafc').setRanges([rng]).build());
  }
  if (rWho > 0) soften(rWho + 2, 6, 8, 'B');
  if (rCat > 0) soften(rCat + 2, 5, 4, 'B');
  if (rNs > 0) soften(rNs + 2, 10, 5, 'C');
  if (rLat > 0) soften(rLat + 2, 8, 5, 'C');
  if (rDay > 0) soften(rDay + 2, 66, 4, 'B');
  var keep = db.getConditionalFormatRules().filter(function (r) {
    var c = r.getBooleanCondition(); return !(c && String(c.getCriteriaValues()[0]).indexOf('ISEVEN(ROW())') >= 0);
  });
  db.setConditionalFormatRules(keep.concat(zebra));

  try { moveSettle_(); kpiCards_(); } catch (e) { Logger.log('kpi: ' + e); }
  try { whoCards_(); } catch (e) { Logger.log('cards: ' + e); }
  try { accents_(); } catch (e) { Logger.log('accents: ' + e); }

  // Data rows a touch taller so they're easy to read
  [[rWho, 6], [rCat, 6], [rNs, 10], [rLat, 8]].forEach(function (p) {
    if (p[0] > 0) for (var i = 0; i < p[1]; i++) if (!db.isRowHiddenByUser(p[0] + 2 + i)) db.setRowHeight(p[0] + 2 + i, 26);
  });
}


/* Remove "Not split yet" + "Latest entries" tables and give the charts room */
function rearrangeDashboard() {
  var db = sh_('Dashboard');
  function rows() { return db.getRange('B1:B150').getDisplayValues().map(function (r) { return String(r[0]).trim(); }); }
  function rowOf(B, t) { for (var i = 0; i < B.length; i++) if (B[i].indexOf(t) == 0) return i + 1; return -1; }
  var B = rows(), rNs = rowOf(B, 'Not split yet'), rDay = rowOf(B, 'Daily spending');
  db.getCharts().forEach(function (c) { db.removeChart(c); });
  if (rNs > 0 && rDay > rNs) db.deleteRows(rNs, rDay - rNs);
  B = rows();
  var rNote = rowOf(B, '✅ split entries'), rCat = rowOf(B, 'By category');
  var gap = rCat - rNote - 1;
  if (rNote > 0 && gap < 10) {
    db.insertRowsAfter(rNote, 10 - gap);
    db.getRange(rNote + 1, 2, 10 - gap, 8).clearFormat();
  }
  B = rows(); rNote = rowOf(B, '✅ split entries'); rCat = rowOf(B, 'By category');
  for (var r = rNote + 1; r < rCat; r++) db.setRowHeight(r, 21);
  setupTracker();
}


/* "Who paid what" as one card per person (table stays hidden as the data source) */
function whoCards_() {
  var db = sh_('Dashboard');
  var B = db.getRange('B1:B150').getDisplayValues().map(function (r) { return String(r[0]).trim(); });
  function rowOf(t) { for (var i = 0; i < B.length; i++) if (B[i].indexOf(t) == 0) return i + 1; return -1; }
  var rWho = rowOf('Who paid what'), rCat = rowOf('By category');
  if (rWho < 0 || rCat < 0) return;
  db.hideRows(rWho + 1, 7);
  var t0 = rWho + 2;
  var names = db.getRange(t0, 2, 6, 1).getDisplayValues().map(function (r) { return r[0]; }).filter(String);
  var n = Math.max(names.length, 1);
  var perRow = n == 1 ? 1 : 2, span = 8 / perRow, half = span / 2;
  var bands = Math.ceil(n / perRow);
  var start = rWho + 8, need = 1 + bands * 6 + 3;
  if (rCat - start < need) { db.insertRowsAfter(start, need - (rCat - start)); rCat += need - (rCat - start); }
  var area = db.getRange(start, 2, rCat - start - 1, 8);
  area.breakApart(); area.clear(); area.clearDataValidations();
  db.setRowHeight(start, 8);
  var rules = db.getConditionalFormatRules().filter(function (r) {
    var c = r.getBooleanCondition(); return !(c && String(c.getCriteriaValues()[0]).indexOf('0.005') >= 0);
  });
  var ACC = ['#0f766e', '#6366f1', '#db2777', '#d97706', '#0284c7', '#7c3aed'], TINT = ['#f0fdfa', '#eef2ff', '#fdf2f8', '#fffbeb', '#f0f9ff', '#f5f3ff'];
  for (var i = 0; i < n; i++) {
    var band = Math.floor(i / perRow), col = 2 + (i % perRow) * span, r = start + 1 + band * 6, pr = t0 + i;
    [[r, 30], [r + 1, 18], [r + 2, 34], [r + 3, 8], [r + 4, 32], [r + 5, 12]].forEach(function (h) { db.setRowHeight(h[0], h[1]); });
    // name
    db.getRange(r, col, 1, span).merge().setFormula('="  "&$B' + pr)
      .setFontWeight('bold').setFontSize(12).setFontColor('#ffffff').setVerticalAlignment('middle');
    // labels
    db.getRange(r + 1, col, 1, half).merge().setValue('  PAID').setFontSize(9).setFontWeight('bold').setFontColor('#94a3b8').setVerticalAlignment('bottom');
    db.getRange(r + 1, col + half, 1, half).merge().setValue('  FAIR SHARE').setFontSize(9).setFontWeight('bold').setFontColor('#94a3b8').setVerticalAlignment('bottom');
    // amounts
    db.getRange(r + 2, col, 1, half).merge().setFormula('="  "&LocalSym&TEXT($G' + pr + ',"#,##0.00")')
      .setFontSize(17).setFontWeight('bold').setFontColor('#0f172a').setVerticalAlignment('middle');
    db.getRange(r + 2, col + half, 1, half).merge().setFormula('="  "&LocalSym&TEXT($H' + pr + ',"#,##0.00")')
      .setFontSize(17).setFontWeight('bold').setFontColor('#475569').setVerticalAlignment('middle');
    // divider + balance
    db.getRange(r + 3, col, 1, span).setBorder(null, null, true, null, null, null, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);
    var bal = db.getRange(r + 4, col, 1, span).merge()
      .setFormula('="  "&IF($I' + pr + '>0.005,"Gets back ",IF($I' + pr + '<-0.005,"Owes ","All square "))&IF(ABS($I' + pr + ')>0.005,LocalSym&TEXT(ABS($I' + pr + '),"#,##0.00")&IF(HomeCur=LocalCur,"","  ("&HomeSym&TEXT(ABS($F' + pr + '),"#,##0.00")&")"),"✓")')
      .setFontSize(13).setFontWeight('bold').setFontColor('#334155').setVerticalAlignment('middle');
    db.getRange(r, col, 6, span).setBackground(TINT[i % 6])
      .setBorder(true, true, true, true, null, null, '#ffffff', SpreadsheetApp.BorderStyle.SOLID_THICK);
    db.getRange(r, col, 1, span).setBackground(ACC[i % 6]);
    db.getRange(r + 1, col, 1, span).setFontColor(ACC[i % 6]);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$I$' + pr + '>0.005').setFontColor('#0f766e').setBackground('#f0fdfa').setRanges([bal]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$I$' + pr + '<-0.005').setFontColor('#b91c1c').setBackground('#fef2f2').setRanges([bal]).build());
  }
  db.setConditionalFormatRules(rules);
  var noteRow = start + 1 + bands * 6;
  db.getRange(noteRow, 2).setValue('✅ split entries only  ·  👤 personal items not counted').setFontSize(9).setFontColor('#94a3b8').setFontStyle('italic');
  db.setRowHeight(noteRow, 22);
  for (var k = noteRow + 1; k < rCat - 1; k++) db.setRowHeight(k, 4);
  db.setRowHeight(rCat - 1, 24);
}


function settleText_() { var r = ss_().getRangeByName('SettleText'); return r ? r.getDisplayValue() : ''; }

/* The settle-up formula used to sit in the Settle Up card (F6). Move it to a hidden cell, keep a name on it. */
function moveSettle_() {
  var ss = ss_(), db = sh_('Dashboard');
  if (ss.getRangeByName('SettleText')) return;
  db.getRange('F5:I8').breakApart();
  db.getRange('F6').moveTo(db.getRange('J11'));
  ss.setNamedRange('SettleText', db.getRange('J11'));
}

/* Top row: three colourful cards — Total spent · Not split yet · Trip */
function kpiCards_() {
  var db = sh_('Dashboard');
  var trip = db.getRange('F5:I8');
  trip.breakApart(); trip.clear();
  db.getRange('F5:I5').merge().setValue('✈️  TRIP');
  db.getRange('F6:I6').merge().setFormula('=IF(TODAY()<TripStart,"Starts in "&(TripStart-TODAY())&IF(TripStart-TODAY()=1," day"," days"),IF(TODAY()>TripEnd,"Trip complete 🎉","Day "&(TODAY()-TripStart+1)&" of "&(TripEnd-TripStart+1)))');
  db.getRange('F7:I7').merge().setFormula('=TEXT(TripStart,"ddd, mmm d")&"  →  "&TEXT(TripEnd,"ddd, mmm d")');
  db.getRange('F8:I8').merge().setFormula('=(TripEnd-TripStart+1)&" days  ·  👛 "&LocalSym&TEXT(PocketLeft,"#,##0")&" pocket money left"');
  var cards = [['B5:C8', '#0B7F8C', '#D7F1EF', '#ffffff', '#D7F1EF'],
               ['D5:E8', '#FFC93C', '#4A3200', '#4A3200', '#4A3200'],
               ['F5:I8', '#FFF7E8', '#4F6475', '#12324A', '#4F6475']];
  cards.forEach(function (c) {
    var rg = db.getRange(c[0]), r0 = rg.getRow(), c0 = rg.getColumn(), w = rg.getNumColumns();
    rg.setBackground(c[1]).setBorder(true, true, true, true, false, false, '#ffffff', SpreadsheetApp.BorderStyle.SOLID_THICK);
    db.getRange(r0, c0, 1, w).setFontColor(c[2]).setFontSize(9).setFontWeight('bold').setVerticalAlignment('bottom');
    db.getRange(r0 + 1, c0, 1, w).setFontColor(c[3]).setFontSize(22).setFontWeight('bold').setVerticalAlignment('middle');
    db.getRange(r0 + 2, c0, 1, w).setFontColor(c[4]).setFontSize(11).setFontWeight('normal');
    db.getRange(r0 + 3, c0, 1, w).setFontColor(c[4]).setFontSize(9).setFontWeight('normal').setVerticalAlignment('top');
    var cells = rg.getValues();
    for (var i = 0; i < 4; i++) {
      var cell = db.getRange(r0 + i, c0), f = cell.getFormula(), val = cells[i][0];
      if (!f && typeof val == 'string' && val && val.indexOf('  ') != 0) cell.setValue('  ' + val);
    }
  });
  db.setRowHeight(5, 26); db.setRowHeight(6, 40); db.setRowHeight(7, 22); db.setRowHeight(8, 24);
}

/* Colour accents: section titles, table headers, category names */
function accents_() {
  var db = sh_('Dashboard');
  var B = db.getRange('B1:B150').getDisplayValues().map(function (r) { return String(r[0]).trim(); });
  function rowOf(t) { for (var i = 0; i < B.length; i++) if (B[i].indexOf(t) == 0) return i + 1; return -1; }
  [['Who paid what', '#0f766e', 8], ['By category', '#6366f1', 4], ['Daily spending', '#d97706', 4]].forEach(function (s) {
    var r = rowOf(s[0]); if (r < 0) return;
    db.getRange(r, 2).setFontColor(s[1]).setFontSize(14)
      .setBorder(null, true, null, null, null, null, s[1], SpreadsheetApp.BorderStyle.SOLID_THICK);
    if (s[0] != 'Who paid what') db.getRange(r + 1, 2, 1, s[2]).setBackground(s[1] == '#6366f1' ? '#eef2ff' : '#fffbeb').setFontColor(s[1]).setFontWeight('bold');
  });
  var rCat = rowOf('By category');
  if (rCat > 0) {
    var CAT = {'Transportation': '#0f766e', 'Accommodation': '#14b8a6', 'Food & Drinks': '#f59e0b', 'Activities & Tours': '#6366f1', 'Shopping & Other': '#ec4899'};
    for (var r = rCat + 2; r < rCat + 10; r++) {
      var nm = String(db.getRange(r, 2).getDisplayValue()).trim();
      if (nm == 'Total') { db.getRange(r, 2, 1, 4).setFontWeight('bold').setBorder(true, null, null, null, null, null, '#c7d2fe', SpreadsheetApp.BorderStyle.SOLID); break; }
      if (CAT[nm]) db.getRange(r, 2).setFontColor(CAT[nm]).setFontWeight('bold');
    }
  }
  var rDay = rowOf('Daily spending');
  if (rDay > 0) db.getRange(rDay + 2, 5, 66, 1).setFontColor('#b45309').setFontWeight('bold');
}

/* Show only the paid/owes columns for the people on Trip Details */

/* Add or remove a traveler on Trip Details → cards and columns update by themselves */
function onEdit(e) {
  try {
    var r = e.range, sh = r.getSheet();
    if (sh.getName() != 'Trip Details') return;
    if (r.getColumn() > 2 || r.getLastColumn() < 2 || r.getRow() > 21 || r.getLastRow() < 16) return;
    SpreadsheetApp.flush();
    whoCards_();
    peopleColumns_();
  } catch (x) {}
}


/* ================= QuickAddParser (original penpen code) ================= */
/** Copy of the "Trip Tracker - Quick Add" parser so the Quick add pop-up can use it.
 *  If you change the parser there, paste it here again. */
/**
 * Trip Tracker – Quick Add (type or talk) → Expenses → Dashboard
 * Everything about the trip (title, dates, travelers, fair shares, currencies) lives on the Trip Details tab.
 */
var SSID = 'XXX_SHEET_ID';
const QA = 'penpen', ITIN = 'Itinerary', EXP = 'Expenses', DASH = 'Dashboard', BOOK = 'Bookings', DET = 'Trip Details', OLDSET = 'Settings';
const MAXP = 6;            // max travelers
const FR = 3;              // first data row in Expenses
const COL = {date: 1, what: 2, cat: 3, cur: 4, amt: 5, paid: 6 /* 6..11 */, split: 12, notes: 13,
  status: 14, entry: 15, owes: 16 /* 16..21 */, home: 22, local: 23, rate: 24, by: 25, at: 26,
  hf: 27, lf: 28, counts: 29, fair: 30 /* 30..35 */};
const LASTCOL = 35;
// Quick Add cells
const QA_ROW = 6, QA_STATUS = 'B7', BTN_ROW = 8, ADD_COL = 2, UNDO_COL = 4;
// Trip Details cells
const D_FIRST = 16, D_START_ROW = 40, D_SURE_ROW = 41, D_MSG = 'C42';

const UI = {accent: '#0f766e', accentSoft: '#f0fdfa', ink: '#1f2937', muted: '#6b7280', line: '#e5e7eb', autoHead: '#e5e7eb', autoCell: '#f9fafb', card: '#f8fafc', font: 'Roboto'};

const CUR = {
  USD: {sym: '$', pre: ['us\\$', '\\$', 'usd'], words: ['dollars?', 'usd', 'bucks']},
  PHP: {sym: '₱', pre: ['₱', 'php', 'p(?=\\d)'], words: ['pesos?', 'php', 'piso']},
  EUR: {sym: '€', pre: ['€', 'eur'], words: ['euros?', 'eur']},
  GBP: {sym: '£', pre: ['£', 'gbp'], words: ['pounds?', 'gbp', 'quid']},
  JPY: {sym: '¥', pre: ['¥', 'jpy'], words: ['yen', 'jpy']},
  KRW: {sym: '₩', pre: ['₩', 'krw'], words: ['won', 'krw']},
  THB: {sym: '฿', pre: ['฿', 'thb'], words: ['baht', 'thb']},
  VND: {sym: '₫', pre: ['₫', 'vnd'], words: ['dong', 'vnd']},
  IDR: {sym: 'Rp', pre: ['rp', 'idr'], words: ['rupiah', 'idr']},
  MYR: {sym: 'RM', pre: ['rm', 'myr'], words: ['ringgit', 'myr']},
  SGD: {sym: 'S$', pre: ['s\\$', 'sgd'], words: ['singapore dollars?', 'sgd']},
  AUD: {sym: 'A$', pre: ['a\\$', 'aud'], words: ['australian dollars?', 'aud']},
  CAD: {sym: 'C$', pre: ['c\\$', 'cad'], words: ['canadian dollars?', 'cad']},
  HKD: {sym: 'HK$', pre: ['hk\\$', 'hkd'], words: ['hong kong dollars?', 'hkd']},
  TWD: {sym: 'NT$', pre: ['nt\\$', 'twd'], words: ['nt dollars?', 'twd']},
  CNY: {sym: 'CN¥', pre: ['cny', 'rmb'], words: ['yuan', 'rmb', 'cny']},
  INR: {sym: '₹', pre: ['₹', 'inr', 'rs'], words: ['rupees?', 'inr']},
  MXN: {sym: 'MX$', pre: ['mxn'], words: ['mexican pesos?', 'mxn']},
  AED: {sym: 'AED ', pre: ['aed'], words: ['dirhams?', 'aed']},
  CHF: {sym: 'CHF ', pre: ['chf'], words: ['swiss francs?', 'francs?', 'chf']},
  TRY: {sym: '₺', pre: ['₺'], words: ['turkish lira', 'lira']},
  NZD: {sym: 'NZ$', pre: ['nz\\$', 'nzd'], words: ['new zealand dollars?', 'nz dollars?', 'nzd']},
  MOP: {sym: 'MOP$', pre: ['mop\\$', 'mop'], words: ['patacas?', 'mop']}
};

const CATS = [
  {label: 'Transportation', words: ['fare', 'fair', 'fares', 'taxi', 'grab', 'cab', 'tricycle', 'trike', 'jeep', 'jeepney', 'multicab', 'bus', 'ferry', 'boat', 'flight', 'flights', 'plane', 'airfare', 'van', 'habal', 'habal-habal', 'motor', 'motorbike', 'uber', 'toll', 'terminal fee', 'transport', 'transportation', 'ride', 'parking', 'gas', 'fuel', 'port fee', 'baggage', 'shuttle', 'transfer', 'pedicab', 'angkas', 'bolt', 'train', 'tuk tuk', 'tuktuk', 'metro', 'subway']},
  {label: 'Accommodation', words: ['hotel', 'room', 'inn', 'pension', 'airbnb', 'resort', 'lodging', 'accommodation', 'hostel', 'check in', 'check-in', 'day use', 'day-use', 'extra night']},
  {label: 'Food & Drinks', words: ['food', 'lunch', 'dinner', 'breakfast', 'brunch', 'snack', 'snacks', 'merienda', 'coffee', 'drink', 'drinks', 'beer', 'water', 'restaurant', 'meal', 'lechon', 'jollibee', 'mcdo', 'mcdonalds', 'eat', 'ate', 'dessert', 'grocery', 'groceries', 'milk tea', 'ice cream', 'bbq', 'barbecue', 'juice', 'cafe', 'bakery', 'starbucks', 'buko', 'halo-halo', 'pizza', 'chicken', 'seafood', 'sardines', 'smoothie', 'smoothies', 'shake', 'shakes', 'frappe', 'jollybee']},
  {label: 'Activities & Tours', words: ['tour', 'tours', 'ticket', 'tickets', 'entrance', 'canyoneering', 'whale', 'shark', 'snorkel', 'snorkeling', 'diving', 'dive', 'activity', 'massage', 'spa', 'guide', 'island hopping', 'museum', 'pool', 'rental', 'environmental fee', 'admission', 'park', 'movie', 'movies', 'cinema', 'film']},
  {label: 'Shopping & Other', words: ['souvenir', 'souvenirs', 'pasalubong', 'shopping', 'clothes', 'shirt', 'sunscreen', 'medicine', 'pharmacy', 'sim', 'load', 'laundry', 'tip', 'tips', 'atm', 'gift', 'gifts', 'toiletries']}
];
const CAT_LABELS = CATS.map(c => c.label);
const TRANSPORT_TYPES = {fare: 'Fare', fair: 'Fare', fares: 'Fare', taxi: 'Taxi', cab: 'Taxi', grab: 'Grab', bolt: 'Grab', tricycle: 'Tricycle', trike: 'Tricycle', pedicab: 'Tricycle', jeep: 'Jeepney', jeepney: 'Jeepney', multicab: 'Jeepney', bus: 'Bus', ferry: 'Boat / Ferry', boat: 'Boat / Ferry', flight: 'Flight', flights: 'Flight', plane: 'Flight', airfare: 'Flight', van: 'Van', habal: 'Habal-habal', 'habal-habal': 'Habal-habal', motor: 'Habal-habal', motorbike: 'Habal-habal', angkas: 'Habal-habal', uber: 'Taxi', toll: 'Toll', parking: 'Parking', gas: 'Gas', fuel: 'Gas', 'terminal fee': 'Terminal fee', 'port fee': 'Terminal fee', baggage: 'Baggage', shuttle: 'Van', transfer: 'Van', train: 'Train', 'tuk tuk': 'Tuk-tuk', tuktuk: 'Tuk-tuk', metro: 'Train', subway: 'Train'};
const VERB = "(?:'s)?\\s+(?:paid for|paid|pays|payed|paying|covered|put in|gave|spent|shouldered|treated|bought|got|ordered)";

/* ================= trigger (installable "on edit", created by setup) ================= */
function onQuickAdd(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet(), name = sh.getName();
  if (name === DET) return detailsEdit(e, sh);
  if (name === EXP) return ppSheetEditLog_(e, sh);
}

function quickAddEdit(e, sh) {
  const row = e.range.getRow(), col = e.range.getColumn();
  const isInput = row === QA_ROW && col >= 2 && col <= 5;
  const isAdd = row === BTN_ROW && col === ADD_COL, isUndo = row === BTN_ROW && col === UNDO_COL;
  if (!isInput && !isAdd && !isUndo) return;
  if (isAdd || isUndo) {
    if (sh.getRange(row, col).getValue() !== true) return;
    sh.getRange(row, col).setValue(false);
  }
  let email = '';
  try { email = (e.user && e.user.getEmail && e.user.getEmail()) || ppSrvUser_().getEmail() || ''; } catch (x) {}
  const lock = ppLock_();
  lock.waitLock(25000);
  const ss = sh.getParent(), tz = ss.getSpreadsheetTimeZone();
  let text = '';
  try {
    let msg;
    if (isUndo) msg = undoLast(ss);
    else {
      text = String(sh.getRange(QA_ROW, 2).getDisplayValue()).trim();
      msg = text ? handleText(ss, text, email) : 'Type or say an expense in the box first, then tick ➕ Add.';
    }
    sh.getRange(QA_STATUS).setValue(msg + '   (' + Utilities.formatDate(new Date(), tz, 'h:mm a') + ')');
    if (!isUndo && text) sh.getRange(QA_ROW, 2).clearContent();
  } catch (err) {
    sh.getRange(QA_STATUS).setValue('⚠️ ' + err.message + (text ? ' — You said: "' + text + '"' : ''));
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function detailsEdit(e, sh) {
  const row = e.range.getRow(), col = e.range.getColumn(), ss = sh.getParent();
  if (col === 2 && (row === D_START_ROW || row === D_SURE_ROW)) {
    const start = sh.getRange(D_START_ROW, 2).getValue() === true, sure = sh.getRange(D_SURE_ROW, 2).getValue() === true;
    const msg = sh.getRange(D_MSG);
    if (row === D_START_ROW) {
      if (start) msg.setValue('⚠️ To confirm, tick “Yes, I’m sure” below. Untick “Start over” to cancel.').setFontColor('#b45309');
      else { sh.getRange(D_SURE_ROW, 2).setValue(false); msg.setValue(''); }
      return;
    }
    if (!sure) return;
    if (!start) { sh.getRange(D_SURE_ROW, 2).setValue(false); msg.setValue('Tick “Start over” first, then “Yes, I’m sure”.').setFontColor('#b45309'); return; }
    const lock = ppLock_();
    lock.waitLock(25000);
    try {
      msg.setValue('⏳ Saving a copy and clearing…').setFontColor(UI.muted);
      SpreadsheetApp.flush();
      msg.setValue(startOver(ss)).setFontColor(UI.accent);
    } catch (err) {
      msg.setValue('⚠️ ' + err.message).setFontColor('#b91c1c');
    } finally {
      sh.getRange(D_START_ROW, 2, 2, 1).setValues([[false], [false]]);
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
    return;
  }
  if (row >= 5 && row < D_FIRST + MAXP) {
    const lock = ppLock_();
    lock.waitLock(25000);
    try { applyDetails(ss); } finally { lock.releaseLock(); }
  }
}

function handleText(ss, text, email) {
  if (/^\s*(undo|delete last|remove last|cancel last|undo last)\b/i.test(text)) return undoLast(ss);
  if (/^\s*(?:yes,?\s+)?start\s+(?:a\s+)?new\s+trip\b/i.test(text)) return '🗑 To start over, use the “Start over” box at the bottom of the Trip Details tab.';
  const ctx = getCtx(ss);
  if (!ctx.names.length) throw new Error('Add the travelers on the Trip Details tab first');
  const who = parseSettle(text, ctx);
  if (who) return settleLast(ss, ctx, who, email);
  const hint = inferSpeaker(text, ctx);
  // ✨ AI first (Gemini free tier) — pulls only the purchases out of a long story. Falls back to the rules below.
  const ai = aiExpenses(text, ctx, getSpeaker(ctx, email) || hint || null);
  if (ai && ai.length) return ai.map(x => addExpense(ss, ctx, x.raw, email, hint, x)).join(' | ');
  return splitExpenses(text, ctx).map(c => addExpense(ss, ctx, c, email, hint)).join(' | ');
}

/* "Kate and I…" on a 2-person trip → "I" is the other person, even in later parts of a long voice note that don't name anyone. */
function inferSpeaker(text, ctx) {
  if (ctx.names.length !== 2 || !/\b(?:i|me|my)\b/i.test(text)) return null;
  const m = [...new Set((text.toLowerCase().match(new RegExp('\\b' + ctx.NAMES + '\\b', 'g')) || []).map(w => ctx.alias[w]))];
  return m.length === 1 ? ctx.names.find(n => n !== m[0]) : null;
}

/* ================= trip details → context ================= */
function named(ss, name) { const r = ss.getRangeByName(name); return r ? r.getValue() : ''; }
function esc(s) { return s.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&"); }

function getCtx(ss) {
  const d = ss.getSheetByName(DET);
  const rows = d.getRange(D_FIRST, 2, MAXP, 4).getValues();
  const people = rows.filter(r => String(r[0]).trim()).map(r => ({name: String(r[0]).trim(), nicks: String(r[2]), email: String(r[3])}));
  return makeCtx(people, String(named(ss, 'HomeCur') || 'USD').trim(), String(named(ss, 'LocalCur') || 'PHP').trim(), ss.getSpreadsheetTimeZone());
}

function makeCtx(people, home, local, tz) {
  const alias = {};
  people.forEach(p => {
    const l = p.name.toLowerCase();
    const nicks = String(p.nicks || '').split(/[,;\/]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    [l, l + 's', l.split(/\s+/)[0]].concat(nicks).forEach(a => { if (a && a !== 'i' && a !== 'me' && !(a in alias)) alias[a] = p.name; });
  });
  const keys = Object.keys(alias).sort((a, b) => b.length - a.length);
  const names = keys.length ? keys.map(esc).join('|') : '(?!x)x';
  return {
    people: people.map(p => ({name: p.name, email: String(p.email || '').trim().toLowerCase()})),
    names: people.map(p => p.name), alias: alias, home: home, local: local, tz: tz || 'Asia/Manila',
    NAMES: '(?:' + names + ')', WHO: '(' + names + '|i)',
    aliasesOf: n => keys.filter(k => alias[k] === n)
  };
}

function tokName(ctx, tok) { tok = tok.toLowerCase(); return (tok === 'i' || tok === 'me') ? 'I' : ctx.alias[tok]; }

/* ================= parsing ================= */
function splitExpenses(text, ctx) {
  // Voice notes are mostly commas, so split on sentences, semicolons, new lines, commas and "then / afterwards".
  const parts = text.split(/(?:\.\s+|;\s*|\n+|,+\s+|\s+and then\s+|\s+then\s+|\s+also\s+|\s+afterwards\s+|\s+after that\s+)/i).map(s => s.replace(/[.,]+$/, '').trim()).filter(Boolean);
  const hasAmt = p => findAmounts(p, ctx).length > 0;
  const hasItem = p => !!findCategory(p) || /\b(?:bought|got|ordered|for)\s+(?!it\b|that\b|this\b|them\b|me\b|us\b)[a-z]/i.test(p);
  const out = [];
  let pending = [];   // pieces with no amount ("Afterwards", "Kate paid") wait for the next amount
  parts.forEach(p => {
    if (!hasAmt(p)) { pending.push(p); return; }
    const chunk = pending.concat(p).join(', ');
    pending = [];
    const last = out[out.length - 1];
    // New expense only when this piece has its own amount AND its own item, and the current expense already has both.
    // ("Lunch, Brad paid 15 dollars, Kate paid 7 dollars" stays one expense.)
    if (last && hasItem(chunk) && hasItem(last) && hasAmt(last)) out.push(chunk);
    else if (last) out[out.length - 1] += ', ' + chunk;
    else out.push(chunk);
  });
  if (pending.length) { if (out.length) out[out.length - 1] += ', ' + pending.join(', '); else out.push(pending.join(', ')); }
  return out.flatMap(t => splitByPayerItems(t, ctx));
}

/* "Brad paid 535 for lunch and Kate paid 200 for ice cream" → two separate expenses.
   Only splits when EVERY part has its own amount, its own payer and its own item. */
function splitByPayerItems(text, ctx) {
  const parts = text.split(/\s*,?\s+and\s+/i).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return [text];
  const payerRe = new RegExp('\\b' + ctx.WHO + VERB + '\\b|\\b(?:paid|covered)\\s+by\\s+' + ctx.WHO + '\\b', 'i');
  const hasItem = p => findCategory(p) || /\bfor\s+(?!it\b|that\b|this\b)[a-z]/i.test(p);
  const ok = parts.every(p => findAmounts(p, ctx).length === 1 && payerRe.test(p.toLowerCase()) && hasItem(p));
  if (!ok) return [text];
  const curTok = findAmounts(text, ctx).find(a => a.cur);
  const word = curTok ? ' ' + curWord(curTok.cur) : '';
  const low = text.toLowerCase();
  const mentioned = [...new Set((low.match(new RegExp('\\b' + ctx.NAMES + '\\b', 'g')) || []).map(w => ctx.alias[w]))];
  const other = ctx.names.length === 2 && mentioned.length === 1 ? ctx.names.find(n => n !== mentioned[0]) : null;
  const anyCur = curRegexes(ctx).anyWord;
  return parts.map(p => {
    let q = p;
    if (other) q = q.replace(/\bI\b(?=\s+(?:paid|pays|payed|paying|covered|put in|gave|spent|treated))/g, other);
    if (word && !findAmounts(q, ctx).some(a => a.cur) && !anyCur.test(q)) q += word;
    return q;
  });
}

// '"yen"/"jpy" = JPY, "dollars"/"usd"/"bucks" = USD' — what people say for this trip's two currencies
function ppCurSay_(ctx) {
  return [...new Set([ctx.local, ctx.home])].map(c => (CUR[c] ? CUR[c].words : [c.toLowerCase()]).map(w => '"' + w.replace(/s\?$/, 's').replace(/\?/g, '') + '"').join('/') + ' = ' + c).join(', ');
}
function curWord(code) { const c = CUR[code]; return c ? c.words[0].replace(/s\?$/, 's').replace(/\?/g, '') : code; }

function curRegexes(ctx) {
  const codes = [...new Set([ctx.local, ctx.home])].filter(c => CUR[c]);
  const pre = [], post = [];
  codes.forEach(c => { CUR[c].pre.forEach(p => pre.push({re: p, c: c})); CUR[c].words.forEach(w => post.push({re: w, c: c})); });
  pre.sort((a, b) => b.re.length - a.re.length);
  post.sort((a, b) => b.re.length - a.re.length);
  const preAlt = pre.map(p => (/^[a-z]/.test(p.re) ? '\\b' : '') + p.re).join('|') || '(?!x)x';
  const postAlt = post.map(p => p.re + '\\b').join('|') || '(?!x)x';
  return {
    pre: pre, post: post,
    amount: new RegExp('(' + preAlt + ')?\\s?(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d+)?\\s*(k\\b|thousand\\b|hundred\\b)?\\s*(' + postAlt + ')?', 'gi'),
    anyWord: new RegExp('(?:' + postAlt + ')', 'i'),
    anyAny: new RegExp('(?:' + preAlt + '|\\b(?:' + postAlt + '))', 'i')
  };
}

function findAmounts(t, ctx) {
  const R = curRegexes(ctx), re = R.amount;
  const out = [];
  let m;
  while ((m = re.exec(t))) {
    if (!m[2]) continue;
    const before = t.slice(0, m.index).toLowerCase(), rest = t.slice(m.index + m[0].length).toLowerCase();
    if (!m[1] && !m[5] && /^\s*(am|pm|a\.m|p\.m|:\d|o'?clock|nights?|days?|pax|people|persons?|hours?|hrs?|mins?|minutes?)\b/.test(rest)) continue;
    if (!m[1] && !m[5] && /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*$/.test(before)) continue;
    let n = parseFloat((m[2] + (m[3] || '')).replace(/,/g, ''));
    const mult = (m[4] || '').toLowerCase();
    if (mult === 'k' || mult === 'thousand') n *= 1000;
    else if (mult === 'hundred') n *= 100;
    let cur = '';
    const p1 = (m[1] || '').trim(), p5 = (m[5] || '').trim();
    if (p1) { const f = R.pre.find(x => new RegExp('^' + x.re + '$', 'i').test(p1)); if (f) cur = f.c; }
    if (!cur && p5) { const f = R.post.find(x => new RegExp('^' + x.re + '$', 'i').test(p5)); if (f) cur = f.c; }
    const lead = m[0].length - m[0].replace(/^\s+/, '').length;
    out.push({start: m.index + lead, end: m.index + m[0].length, n: n, cur: cur, text: m[0]});
  }
  return out;
}

function findCategory(s) {
  const low = ' ' + s.toLowerCase() + ' ';
  let best = null;
  CATS.forEach(c => c.words.forEach(w => {
    const m = new RegExp('\\b' + w.replace(/-/g, '\\-') + '\\b').exec(low);
    if (m && (!best || m.index < best.idx)) best = {label: c.label, word: w, idx: m.index};
  }));
  return best;
}

function parsePayments(text, amts, ctx, speaker) {
  const low = text.toLowerCase();
  const W = ctx.WHO.slice(1, -1);
  const mentioned = new Set((low.match(new RegExp('\\b' + ctx.NAMES + '\\b', 'g')) || []).map(w => ctx.alias[w]));
  const resolveI = () => speaker || (ctx.names.length === 2 && mentioned.size === 1 ? ctx.names.find(n => !mentioned.has(n)) : null);
  const used = amts.map(() => false);
  const per = {};
  ctx.names.forEach(n => per[n] = 0);
  let perAny = false, unresolvedI = 0;
  const whole = [];
  const credit = (who, n) => {
    if (who === 'I') { who = resolveI(); if (!who) { unresolvedI += n; return; } }
    per[who] += n; perAny = true;
  };
  // group payers: "Kate and I paid", "Ann, Bo and Cy paid", "we both paid", "we split it"
  let group = null, gStart = -1, gEnd = -1;
  const gm = new RegExp('\\b((?:(?:' + W + '|me)\\s*(?:,|\\band\\b|&)\\s*)+(?:' + W + '|me))' + VERB + '\\b').exec(low);
  if (gm) {
    group = [...new Set(gm[1].match(new RegExp('\\b(?:' + W + '|me)\\b', 'g')).map(t => tokName(ctx, t)))];
    gStart = gm.index; gEnd = gm.index + gm[0].length;
  } else if (/\b(?:we both|both of us|we each|each of us|we split|we shared|split it|we all|all of us|we paid)\b/.test(low)) group = ['ALL'];
  let m;
  const re1 = new RegExp('\\b' + ctx.WHO + VERB + '\\b', 'gi');
  while ((m = re1.exec(low))) {
    if (gm && m.index >= gStart && m.index < gEnd) continue;
    const who = tokName(ctx, m[1]), end = m.index + m[0].length;
    const k = amts.findIndex((a, i) => !used[i] && a.start >= end && /^[\s,:\-]*(?:for\s+(?:it|that|this|the\s+\w+)\s*)?$/.test(low.slice(end, a.start)));
    if (k >= 0) { used[k] = true; credit(who, amts[k].n); } else whole.push(who);
  }
  const re2 = new RegExp('\\b(?:paid|covered|treated|bought)\\s+by\\s+' + ctx.WHO + '\\b', 'gi');
  while ((m = re2.exec(low))) whole.push(tokName(ctx, m[1]));
  const re3 = new RegExp('\\b' + ctx.NAMES + "(?:'s)?\\s*[:,\\-]?\\s*(?=[₱$€£¥฿₩₫₹\\d])", 'gi');
  while ((m = re3.exec(low))) {
    const end = m.index + m[0].length;
    const nm = ctx.alias[m[0].replace(/(?:'s)?\s*[:,\-]?\s*$/, '').toLowerCase()];
    const k = amts.findIndex((a, i) => !used[i] && a.start >= end && a.start - end <= 1);
    if (k >= 0 && nm) { used[k] = true; credit(nm, amts[k].n); }
  }
  const rem = amts.filter((a, i) => !used[i]);
  let total = null;
  const sumPer = ctx.names.reduce((s, n) => s + per[n], 0);
  if (rem.length) total = (rem.find(a => a.cur) || rem[0]).n;
  else if (perAny || unresolvedI) total = sumPer + unresolvedI;
  const paid = {};
  let fix = '';
  if (perAny || unresolvedI) {
    ctx.names.forEach(n => { if (per[n]) paid[n] = per[n]; });
    if (unresolvedI) fix = "Who's I? (I paid " + unresolvedI + ')';
  } else if (whole.length) {
    const res = whole.map(w => w === 'I' ? resolveI() : w);
    const uniq = [...new Set(res.filter(Boolean))];
    if (res.some(x => !x) && !uniq.length) fix = "Who's I? (I paid)";
    else if (uniq.length && total !== null) uniq.forEach(n => paid[n] = total / uniq.length);
  } else if (group && total !== null) {
    let g = group[0] === 'ALL' ? ctx.names.slice() : group.map(x => x === 'I' ? resolveI() : x);
    if (g.some(x => !x)) fix = "Who's I? (I paid)";
    else { g = [...new Set(g)]; g.forEach(n => paid[n] = total / g.length); }
  }
  return {total: total, paid: paid, fix: fix, resolveI: resolveI};
}

function parseSplit(low, ctx, resolveI) {
  if (/\b(each (?:paid |pays |pay )?(?:for )?(?:our |their |his |her )?own|(?:paid|pay) (?:for )?(?:our|their) own|our own|separately)\b/.test(low)) return 'EACH';
  const only = n => new RegExp('\\b' + n + "(?:'s)?\\s+only\\b|\\bonly\\s+(?:for\\s+)?" + n + '\\b|\\bjust\\s+for\\s+' + n + '\\b|\\bfor\\s+' + n + "\\s+only\\b|\\b" + n + "'s own\\b").test(low);
  for (const name of ctx.names) {
    const al = ctx.aliasesOf(name).map(esc).join('|');
    if (al && only('(?:' + al + ')')) return name + ' only';
  }
  if (/\b(?:i|me)\s+only\b|\bonly\s+(?:for\s+)?me\b|\bjust\s+for\s+me\b|\bmy own\b/.test(low)) {
    const r = resolveI();
    if (r) return r + ' only';
  }
  return 'Shared';
}

function parseSettle(text, ctx) {
  const W = '(' + ctx.NAMES.slice(3, -1) + '|i|me)';
  const m = text.match(new RegExp('^\\s*(?:that|it)(?:\\s+one)?\\s+(?:was|is)\\s+(?:paid\\s+by\\s+)?' + W + '\\b', 'i')) ||
            text.match(new RegExp('^\\s*' + W + '\\s+(?:paid for|paid|covered|got)\\s+(?:that|it|the last one)\\b', 'i'));
  return m ? tokName(ctx, m[1]) : null;
}

function cleanDescription(s, amts, ctx) {
  let d = s;
  amts.slice().sort((a, b) => b.start - a.start).forEach(a => { d = d.slice(0, a.start) + ' ' + d.slice(a.end); });
  d = d.replace(new RegExp('\\b' + ctx.WHO + VERB + '\\b', 'gi'), ' ')
    .replace(/\b(?:paid|covered|treated|bought)\s+by\s+\w+/gi, ' ')
    .replace(new RegExp('\\b' + ctx.NAMES + "(?:'s)?\\b", 'gi'), ' ')
    .replace(curRegexes(ctx).anyAny, ' ')
    .replace(/\b(?:only|each|own|our|separately|split|shared|50\/50|fifty[- ]fifty|we|i|me|my|both|all|of us|paid|pay|spent|cost|costs|was|is|it|the|a|an|for|of|total|just|so|um|uh|okay|ok|and|went|go|going|got|yesterday|today|afterwards|after|then|where|there|that)\b/gi, ' ')
    .replace(/[,.;:!&]+/g, ' ').replace(/\s+/g, ' ').trim();
  d = d.replace(/^(?:to|at|in|on)\s+/i, '');
  return d ? d.charAt(0).toUpperCase() + d.slice(1) : '';
}

function parseRoute(s, ctx) {
  const stop = '(?=\\s+(?:for|cost|was|is|' + ctx.NAMES.slice(3, -1) + '|i|paid|split|and|we)\\b|\\s*\\d|\\s*[₱$€£¥,.]|$)';
  let m = s.match(new RegExp('\\bfrom\\s+(.+?)\\s+to\\s+(.+?)' + stop, 'i'));
  if (m) return cap(m[1].trim()) + ' → ' + cap(m[2].trim());
  m = s.match(new RegExp('\\bto\\s+(?:the\\s+)?(.+?)' + stop, 'i'));
  if (m && m[1].length < 40) return '→ ' + cap(m[1].trim());
  return '';
}

function cap(x) { return x.replace(/\b\w/g, c => c.toUpperCase()); }

function mealFor(s, tz) {
  const m = s.toLowerCase().match(/\b(breakfast|brunch|lunch|dinner|merienda|snacks?|coffee|drinks?|beer|dessert|groceries|grocery)\b/);
  if (m) return cap(m[1]);
  const h = Number(Utilities.formatDate(new Date(), tz, 'H'));
  return h < 10 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 18 ? 'Merienda' : 'Dinner';
}

function parseExpense(text, ctx, speaker) {
  const low = text.toLowerCase();
  const amts = findAmounts(text, ctx);
  let cur = '';
  for (const a of amts) if (a.cur) { cur = a.cur; break; }
  if (!cur) {
    const R = curRegexes(ctx);
    const w = R.post.find(x => new RegExp('\\b' + x.re + '\\b', 'i').test(low));
    if (w) cur = w.c;
  }
  if (!cur && ctx.home === ctx.local) cur = ctx.local;
  const P = parsePayments(text, amts, ctx, speaker);
  const cat = findCategory(text);
  const label = cat ? cat.label : 'Shopping & Other';
  // Leave out pure context like "Kate and I went to the mall today" (no amount, item or payer).
  const keep = text.split(/,+\s+/).filter(cl => findAmounts(cl, ctx).length || findCategory(cl) || new RegExp('\\b' + ctx.WHO + VERB + '\\b', 'i').test(cl)).join(', ') || text;
  const desc = cleanDescription(keep, findAmounts(keep, ctx), ctx);
  let what = desc;
  if (label === 'Transportation') {
    const type = TRANSPORT_TYPES[cat.word] || cap(cat.word), route = parseRoute(text, ctx);
    what = route ? type + ' ' + route : (desc || type);
  } else if (label === 'Food & Drinks') {
    const meal = mealFor(text, ctx.tz);
    const explicitMeal = /\b(breakfast|brunch|lunch|dinner|merienda|snacks?|coffee|drinks?|beer|dessert|groceries|grocery)\b/i.test(text);
    what = desc ? ((!explicitMeal || new RegExp('\\b' + meal + '\\b', 'i').test(desc)) ? desc : meal + ' · ' + desc) : meal;
  }
  if (!what) what = label;
  const d = new Date();
  if (/\byesterday\b/.test(low)) d.setDate(d.getDate() - 1);
  return {raw: text, date: Utilities.formatDate(d, ctx.tz, 'yyyy-MM-dd'), what: what, cat: label, cur: cur, total: P.total,
    paid: P.paid, split: parseSplit(low, ctx, P.resolveI), fix: P.fix, guessed: !cat};
}

/* ================= writing ================= */
function getSpeaker(ctx, email) {
  if (!email) return null;
  const p = ctx.people.find(x => x.email && x.email === String(email).toLowerCase());
  return p ? p.name : null;
}


function sym(cur) { return CUR[cur] ? CUR[cur].sym : (cur ? cur + ' ' : ''); }
function money(n, cur) { return sym(cur) + fmt(n); }
function fmt(n) { return Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }






/* ================= start over ================= */

/* ================= apply Trip Details to the other tabs ================= */

/* ================= layout (used by the upgrade) ================= */
function L(c) { let s = ''; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }

function baseSheet(sh, cols, rows) {
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
  if (sh.getMaxColumns() > cols) sh.deleteColumns(cols + 1, sh.getMaxColumns() - cols);
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
  sh.setHiddenGridlines(true);
  sh.getRange(1, 1, sh.getMaxRows(), cols).setFontFamily(UI.font).setFontSize(10).setFontColor(UI.ink).setVerticalAlignment('middle');
  return sh;
}
function headerStyle(r, auto) {
  r.setBackground(auto ? UI.autoHead : UI.accent).setFontColor(auto ? '#374151' : '#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
}
function lines(r) { r.setBorder(null, null, true, null, null, true, UI.line, SpreadsheetApp.BorderStyle.SOLID); }
function sectionTitle(r, text) { r.setValue(text).setFontSize(12).setFontWeight('bold').setFontColor(UI.accent); }
function tableHead(r) { r.setBackground('#f3f4f6').setFontColor(UI.muted).setFontWeight('bold').setFontSize(9); }

function buildDetails(ss, init) {
  const s = baseSheet(ss.insertSheet(DET), 8, 30);
  [16, 190, 120, 230, 250, 16, 60, 120].forEach((w, i) => s.setColumnWidth(i + 1, w));
  s.setRowHeights(1, 30, 28);
  s.getRange('B2').setValue('Trip Details').setFontSize(20).setFontWeight('bold');
  s.setRowHeight(2, 40);
  s.getRange('B3:E3').merge().setValue('Fill this in before each trip. The other tabs update on their own.').setFontColor(UI.muted);

  sectionTitle(s.getRange('B5'), 'Trip');
  s.getRange('B6:B12').setValues([['Tracker title (file name)'], ['Trip name (shown on tabs)'], ['Start date'], ['End date'], ['Home currency'], ['Trip currency'], ['Live rate']]).setFontColor(UI.muted);
  s.getRange('C6:E6').merge(); s.getRange('C7:E7').merge();
  s.getRange('C6:C9').setValues([[init.fileTitle || ''], [init.tripName || ''], [init.start || ''], [init.end || '']]);
  s.getRange('C8:C9').setNumberFormat('ddd, mmm d, yyyy').setHorizontalAlignment('left');
  s.getRange('C10:C11').setValues([[init.home || 'USD'], [init.local || 'PHP']])
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(CUR), true).setAllowInvalid(false).build());
  s.getRange('D10:D11').setFontColor(UI.muted).setBackground(UI.autoCell);
  s.getRange('C12').setFormula('=IF(HomeCur=LocalCur,1,IFERROR(GOOGLEFINANCE("CURRENCY:"&HomeCur&LocalCur),""))').setNumberFormat('0.00').setHorizontalAlignment('left').setFontColor(UI.muted).setBackground(UI.autoCell);
  s.getRange('D12:E12').merge().setFormula('=IF(HomeCur=LocalCur,"same currency","= "&LocalCur&" for 1 "&HomeCur&" (automatic)")').setFontColor(UI.muted).setFontSize(9);
  [s.getRange('C6:E6'), s.getRange('C7:E7'), s.getRange('C8:C11')].forEach(r => r.setBorder(true, true, true, true, false, true, UI.line, SpreadsheetApp.BorderStyle.SOLID));

  sectionTitle(s.getRange('B14'), 'Who’s coming (up to ' + MAXP + ')');
  s.getRange('B15:E15').setValues([['Name', 'Fair share', 'Nicknames (for voice), comma-separated', 'Google email (to work out who “I” is)']]);
  tableHead(s.getRange('B15:E15'));
  s.getRange('B15:E15').setWrap(true);
  s.setRowHeight(15, 34);
  const ppl = (init.people || []).slice(0, MAXP);
  const vals = [];
  for (let i = 0; i < MAXP; i++) { const p = ppl[i] || {}; vals.push([p.name || '', p.share === undefined ? '' : p.share, p.nicks || '', p.email || '']); }
  s.getRange(D_FIRST, 2, MAXP, 4).setValues(vals).setBorder(true, true, true, true, true, true, UI.line, SpreadsheetApp.BorderStyle.SOLID);
  s.getRange(D_FIRST, 2, MAXP, 1).setFontWeight('bold');
  s.getRange(D_FIRST, 3, MAXP, 1).setNumberFormat('0%').setHorizontalAlignment('center');
  // hidden helpers: G = weight used for shared costs, H = split options for the Expenses dropdown
  const w = [], o = [['Shared']];
  for (let i = 0; i < MAXP; i++) {
    const r = D_FIRST + i;
    w.push(['=IF(B' + r + '="",0,IF(SUM($C$' + D_FIRST + ':$C$' + (D_FIRST + MAXP - 1) + ')=0,1,N(C' + r + ')))']);
    o.push(['=IF(B' + r + '="","",B' + r + '&" only")']);
  }
  s.getRange(D_FIRST, 7, MAXP, 1).setFormulas(w);
  s.getRange(D_FIRST, 8, MAXP + 1, 1).setFormulas(o.map((x, i) => i === 0 ? ['Shared'] : x));
  s.getRange(D_FIRST, 8).setValue('Shared');
  s.getRange(D_FIRST - 1, 7, 1, 2).setValues([['weight', 'split options']]);
  s.hideColumns(7, 2);
  s.getRange('B22:E22').merge().setValue('Fair share = the part of shared costs each person pays (e.g. 50% / 50%, or 60% / 40%). Leave it blank to split evenly. For personal items, choose “[Name] only” in the Split column or say “Brad only”.')
    .setFontColor(UI.muted).setFontSize(9).setWrap(true);
  s.setRowHeight(22, 44);

  sectionTitle(s.getRange('B24'), 'Start over');
  s.getRange(D_START_ROW, 2, 2, 1).insertCheckboxes().setValues([[false], [false]]).setBackground('#fee2e2').setHorizontalAlignment('center').setFontSize(16).setFontColor('#b91c1c');
  s.getRange('C25:E25').merge().setValue('🗑 Start over — saves a copy of this trip to your Drive, then clears Expenses, Bookings, Itinerary and the details above').setWrap(true).setFontWeight('bold').setFontColor('#991b1b');
  s.getRange('C26:E26').merge().setValue('Yes, I’m sure').setFontWeight('bold').setFontColor('#991b1b');
  s.getRange('C27:E27').merge().setWrap(true).setFontSize(9);
  s.setRowHeight(25, 40); s.setRowHeight(27, 36);
  s.getRange('B29:E29').merge().setValue('White boxes = you can edit · Grey = automatic').setFontColor(UI.muted).setFontSize(9).setFontStyle('italic');

  [['FileTitle', 'C6'], ['TripName', 'C7'], ['TripStart', 'C8'], ['TripEnd', 'C9'], ['HomeCur', 'C10'], ['LocalCur', 'C11'], ['HomeSym', 'D10'], ['LocalSym', 'D11'], ['LiveRate', 'C12'],
   ['People', 'B' + D_FIRST + ':B' + (D_FIRST + MAXP - 1)], ['Weights', 'G' + D_FIRST + ':G' + (D_FIRST + MAXP - 1)], ['SplitOpts', 'H' + D_FIRST + ':H' + (D_FIRST + MAXP)]]
    .forEach(p => ss.setNamedRange(p[0], s.getRange(p[1])));
  return s;
}



function buildQuickAdd(ss) {
  const q = baseSheet(ss.insertSheet(QA), 6, 60);
  [16, 46, 170, 46, 170, 16].forEach((w, i) => q.setColumnWidth(i + 1, w));
  q.setRowHeights(1, 60, 24);
  const row = r => q.getRange(r, 2, 1, 4).merge();
  row(2).setValue('Quick Add').setFontSize(22).setFontWeight('bold');
  q.setRowHeight(2, 40);
  row(3).setFormula('=IF(TripName="","",TripName)&IFERROR("  ·  "&TEXT(TripStart,"mmm d")&" – "&TEXT(TripEnd,"mmm d"),"")').setFontColor(UI.muted);
  row(5).setValue('Type or 🎤 say an expense, then press Enter — or tick ➕ Add').setFontColor(UI.muted).setFontSize(9);
  row(QA_ROW).setFontSize(13).setWrap(true).setBackground('#fffbeb').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, null, null, UI.accent, SpreadsheetApp.BorderStyle.SOLID_THICK);
  q.setRowHeight(QA_ROW, 72);
  row(7).setValue('Your last entry will show up here.').setFontColor(UI.muted).setFontStyle('italic').setWrap(true).setFontSize(10);
  q.setRowHeight(7, 48);
  // buttons (tick boxes): B8 = Add, D8 = Undo
  q.getRange(BTN_ROW, ADD_COL).insertCheckboxes().setValue(false).setBackground(UI.accent).setFontColor('#ffffff');
  q.getRange(BTN_ROW, ADD_COL + 1).setValue('➕  Add entry').setBackground(UI.accent).setFontColor('#ffffff');
  q.getRange(BTN_ROW, UNDO_COL).insertCheckboxes().setValue(false).setBackground('#fee2e2').setFontColor('#b91c1c');
  q.getRange(BTN_ROW, UNDO_COL + 1).setValue('↩️  Undo last entry').setBackground('#fee2e2').setFontColor('#991b1b');
  q.getRange(BTN_ROW, 2, 1, 4).setFontSize(12).setFontWeight('bold').setVerticalAlignment('middle');
  q.getRange(BTN_ROW, ADD_COL).setFontSize(18).setHorizontalAlignment('center');
  q.getRange(BTN_ROW, UNDO_COL).setFontSize(18).setHorizontalAlignment('center');
  q.getRange(BTN_ROW, ADD_COL).setNote('Tick to ADD what is in the box above (same as pressing Enter). It unticks itself.');
  q.getRange(BTN_ROW, UNDO_COL).setNote('Tick to remove the last entry added with Quick Add. It unticks itself.');
  q.setRowHeight(BTN_ROW, 40);
  row(10).setValue('RIGHT NOW').setFontSize(9).setFontWeight('bold').setFontColor(UI.muted);
  row(11).setFormula('=IF(LEFT(Dashboard!F6,1)="✅",Dashboard!F6,"👉 "&SUBSTITUTE(Dashboard!F6,CHAR(10),"   👉 "))').setFontSize(14).setFontWeight('bold').setFontColor(UI.accent).setWrap(true);
  q.setRowHeight(11, 34);
  row(12).setFormula('="Total spent "&Dashboard!B6&IF(HomeCur=LocalCur,""," · "&Dashboard!B7)&IF(COUNTIF(Expenses!' + L(COL.counts) + '3:' + L(COL.counts) + ',0)>0," · "&COUNTIF(Expenses!' + L(COL.counts) + '3:' + L(COL.counts) + ',0)&" not split yet","")').setFontColor(UI.muted);
  const qp = q.protect().setDescription('Quick Add layout');
  qp.setUnprotectedRanges([q.getRange(QA_ROW, 2, 1, 4), q.getRange(BTN_ROW, ADD_COL), q.getRange(BTN_ROW, UNDO_COL)]);
  qp.setWarningOnly(true);
  return q;
}

function writeExamples(q, ctx) {
  const a = ctx.names[0] || 'Kate', b = ctx.names[1] || (ctx.names[0] ? 'Ann' : 'Brad');
  const lw = curWord(ctx.local), hw = curWord(ctx.home), ls = sym(ctx.local);
  if (q.getMaxRows() < 50) q.insertRowsAfter(q.getMaxRows(), 50 - q.getMaxRows());
  const area = q.getRange('B14:E50');
  area.breakApart().clearContent().setBorder(false, false, false, false, false, false).setFontWeight('normal').setFontStyle('normal').setFontSize(10).setFontColor(UI.ink).setWrap(true).setBackground(null);
  q.setRowHeights(14, 37, 22);
  const groups = [
    ['ONE PERSON PAID', [['Grab 320 ' + lw + ', ' + a + ' paid', 'shared by fair share'], ['Hotel 45 ' + hw + ', ' + b + ' paid', 'shared by fair share']]],
    ['SEPARATE THINGS → one row each', [[b + ' paid 535 ' + lw + ' for lunch and ' + a + ' paid 200 ' + lw + ' for ice cream', '2 rows'], ['Taxi 250 ' + lw + ' ' + a + ' paid, then coffee 180 ' + lw + ' ' + b + ' paid', '2 rows']]],
    ['ONE BILL, SEVERAL CHIPPED IN → one row', [['Dinner 1,000 ' + lw + ', ' + b + ' paid 600 and ' + a + ' paid 400', 'shared'], [a + ' and I paid 600 ' + lw + ' for dinner', 'each paid half']]],
    ['ONLY FOR ONE PERSON', [['Sunglasses 500 ' + lw + ', ' + a + ' paid, ' + b + ' only', b + ' owes ' + a + ' ' + ls + '500']]],
    ['NOT PAID YET & FIXES', [['Dinner 900 ' + lw, 'no payer = not split yet'], ['that was ' + b, 'sets who paid the last unsplit one'], ['undo', 'or tick ↩️ Undo — removes the last entry']]]
  ];
  let r = 14;
  q.getRange(r, 2, 1, 4).merge().setValue('HOW TO SAY IT — always say ' + lw + (hw !== lw ? ' or ' + hw : '')).setFontSize(9).setFontWeight('bold').setFontColor(UI.accent);
  r += 2;
  groups.forEach(g => {
    q.getRange(r, 2, 1, 4).merge().setValue(g[0]).setFontSize(9).setFontWeight('bold').setFontColor(UI.muted);
    r++;
    g[1].forEach(ex => {
      const text = '“' + ex[0] + '” → ' + ex[1];
      const rt = SpreadsheetApp.newRichTextValue().setText(text)
        .setTextStyle(0, ex[0].length + 2, SpreadsheetApp.newTextStyle().setForegroundColor(UI.ink).build())
        .setTextStyle(ex[0].length + 2, text.length, SpreadsheetApp.newTextStyle().setForegroundColor(UI.muted).setItalic(true).setFontSize(9).build())
        .build();
      q.getRange(r, 2, 1, 4).merge().setRichTextValue(rt);
      q.setRowHeight(r, text.length > 60 ? 36 : 22);
      r++;
    });
    q.getRange(r - g[1].length, 2, g[1].length, 4).setBorder(null, null, true, null, null, true, UI.line, SpreadsheetApp.BorderStyle.SOLID);
    r++;
  });
  q.getRange(r, 2, 1, 4).merge().setValue('Shared costs follow each person’s fair share on the Trip Details tab (even split if blank). Say “' + b + ' only” for personal items. Tabs: Dashboard = totals · Expenses = every entry (white columns you can edit, grey are automatic) · Itinerary · Bookings · Trip Details')
    .setFontColor(UI.muted).setFontSize(9).setWrap(true);
  q.setRowHeight(r, 48);
}

/* ================= one-time upgrade from the Brad/Kate layout ================= */

/* ================= misc ================= */
function setup() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'onQuickAdd') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onQuickAdd').forSpreadsheet(SSID).onEdit().create();
}

/* ================= ✨ AI reading (Gemini free tier) =================
   Setup: Project Settings → Script Properties → add GEMINI_API_KEY (from aistudio.google.com).
   Optional: GEMINI_MODEL to pick a model. No key, quota used up, or any error → the rules parser is used instead. */
function aiExpenses(text, ctx, speaker) {
  const props = PropertiesService.getScriptProperties();
  const key = String(props.getProperty('GEMINI_API_KEY') || '').trim().replace(/^["'\s]+|["'\s]+$/g, '');  // ignore stray spaces/quotes
  if (!key) return null;
  const models = [...new Set([props.getProperty('GEMINI_MODEL') || 'gemini-flash-latest', 'gemini-flash-lite-latest'])];
  const prompt = [
    'You turn a spoken travel-expense note into expense records for a shared trip tracker.',
    'Travelers: ' + ctx.names.join(', ') + '.',
    'The speaker ("I", "me", "my") is: ' + (speaker || 'unknown') + '.',
    'Currencies on this trip: home ' + ctx.home + ', local ' + ctx.local + '. ' + ppCurSay_(ctx) + '.',
    'Rules:',
    '- Only include real purchases or payments that have an amount. Ignore the story: things seen, feelings, people met, plans, prices only mentioned but not paid.',
    '- One record per separate purchase. Never merge different items, never invent or add up amounts that were not said.',
    '- payers: who paid and how much, using the traveler names above. If the speaker paid but is unknown, use the key "I". If nobody is said to have paid, use {}.',
    '- split: "Shared" (default), "<Name> only" if it was only for one person, or "EACH" if each paid their own.',
    '- item: a short clean label, e.g. "Lunch at Jollibee", "Movie tickets", "Smoothies", "Tricycle home". Fix obvious speech-to-text misspellings of brands and places.',
    '- category: exactly one of: ' + CAT_LABELS.join(' | ') + '.',
    '- currency: ISO code, or null if no currency was said.',
    '- day: "today" or "yesterday".',
    '- quote: the shortest part of the note that describes this purchase.',
    'Return JSON only: {"expenses":[{"item":"","category":"","currency":"' + ctx.local + '","total":0,"payers":{"Name":0},"split":"Shared","day":"today","quote":""}]}',
    'Note: ' + text
  ].join('\n');
  for (const model of models) {
    try {
      const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: {'x-goog-api-key': key},
        payload: JSON.stringify({contents: [{parts: [{text: prompt}]}], generationConfig: {temperature: 0, responseMimeType: 'application/json'}})
      });
      if (res.getResponseCode() !== 200) { console.warn('Gemini ' + model + ' → ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300)); continue; }
      const body = JSON.parse(res.getContentText());
      const out = JSON.parse(body.candidates[0].content.parts.map(p => p.text || '').join(''));
      const list = Array.isArray(out) ? out : out.expenses;
      if (!Array.isArray(list)) continue;
      return list.map(e => aiToExpense(e, ctx, speaker)).filter(Boolean);
    } catch (err) { console.warn('Gemini ' + model + ' failed: ' + err); }
  }
  return null;
}

function aiToExpense(e, ctx, speaker) {
  const num = v => Number(String(v == null ? '' : v).replace(/[^\d.]/g, '')) || 0;
  const total = num(e.total);
  if (!total) return null;
  const who = k => { k = String(k || '').trim(); return ctx.names.indexOf(k) >= 0 ? k : ctx.alias[k.toLowerCase()]; };
  const keys = Object.keys(e.payers || {});
  const paid = {};
  let fix = '';
  keys.forEach(k => {
    const n = num(e.payers[k]) || total / keys.length;
    const p = /^(i|me)$/i.test(k) ? speaker : who(k);
    if (!p) { fix = "Who's I? (I paid " + n + ')'; return; }
    paid[p] = (paid[p] || 0) + n;
  });
  let split = String(e.split || 'Shared').trim();
  if (split !== 'EACH' && split !== 'Shared') { const p = who(split.replace(/\s+only$/i, '')); split = p ? p + ' only' : 'Shared'; }
  const c = String(e.currency || '').toUpperCase();
  const cur = CUR[c] ? c : (ctx.home === ctx.local ? ctx.local : '');
  const d = new Date();
  if (e.day === 'yesterday') d.setDate(d.getDate() - 1);
  const cat = CAT_LABELS.indexOf(e.category) >= 0 ? e.category : 'Shopping & Other';
  return {raw: String(e.quote || e.item || '').trim(), date: Utilities.formatDate(d, ctx.tz, 'yyyy-MM-dd'), what: String(e.item || cat).trim(),
    cat: cat, cur: cur, total: total, paid: paid, split: split, fix: fix, guessed: false};
}

/* Run once from the editor after adding the key: checks the key works (and asks Google for permission to call Gemini). */
function testGemini() {
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, ['https://www.googleapis.com/auth/script.external_request']);  // asks for the Gemini permission if it was skipped
  const ctx = makeCtx([{name: 'Brad', nicks: 'bradley'}, {name: 'Kate', nicks: 'cate, kait, katie'}], 'USD', 'PHP', 'Asia/Manila');
  const t = 'Kate and I went to the mall, saw a kid with a huge balloon, so cute, then we had lunch at Jollybee where I paid 800 pesos, after that Kate bought smoothies for 250 pesos, the guy said the shoes were 3000 but we didnt buy them, then I got the tricycle home for 50 pesos';
  const r = aiExpenses(t, ctx, inferSpeaker(t, ctx));
  console.log(r ? JSON.stringify(r, null, 1) : 'No AI result — check GEMINI_API_KEY in Script Properties and the warnings above.');
}

function testParse() {
  const ctx = makeCtx([{name: 'Brad', nicks: 'bradley'}, {name: 'Kate', nicks: 'cate, kait, katie'}], 'USD', 'PHP', 'Asia/Manila');
  ['Lunch, Brad paid 15 dollars, Kate paid 7 dollars', 'Brad 350 Kate 250 pesos, each own', 'Sunglasses 500 pesos, Kate paid, Brad only', 'Taxi 250 pesos, I paid', 'Kate and I paid 600 pesos for dinner', 'Kate and I went to the mall today, I bought lunch at Jollybee, It was 750 pesos, Afterwards, Kate bought smoothies for 250 pesos,, we went to the movies where I paid 500 pesos after that', 'Kate got the tricycle ride home for 50 pesos']
    .forEach(t => splitExpenses(t, ctx).forEach(c => { const x = parseExpense(c, ctx, inferSpeaker(t, ctx)); console.log(c + ' => ' + JSON.stringify(x)); }));
}


/* ================= Bookings dropdowns ================= */
const BOOK_TYPES = ['Flight', 'Boat / Ferry', 'Bus', 'Van', 'Taxi', 'Grab', 'Tricycle', 'Jeepney', 'Habal-habal', 'Train', 'Car rental', 'Transfer', 'Stay', 'Tour', 'Activity', 'Food', 'Other'];
const BOOK_STATUS = ['Idea', 'To book', 'Booked', 'Unpaid', 'Paid', 'Included', 'Done'];
function setupBookings() {
  const ss = SpreadsheetApp.openById(SSID), sh = ss.getSheetByName(BOOK);
  if (sh.getMaxRows() < 200) sh.insertRowsAfter(sh.getMaxRows(), 200 - sh.getMaxRows());
  const n = sh.getMaxRows() - 1;
  const list = (vals, invalid) => SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(invalid).build();
  sh.getRange(2, 1, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).setHelpText('Pick a date (double-click for a calendar)').build()).setNumberFormat('ddd, mmm d');
  sh.getRange(2, 2, n, 1).setDataValidation(list(CAT_LABELS, false));
  sh.getRange(2, 3, n, 1).setDataValidation(list(BOOK_TYPES, true));
  sh.getRange(2, 7, n, 1).setDataValidation(list(BOOK_STATUS, false));
  const st = sh.getRange(2, 7, n, 1), sec = sh.getRange(2, 2, n, 1);
  const rule = (txt, bg, fg, r) => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(txt).setBackground(bg).setFontColor(fg).setRanges([r]).build();
  const rules = sh.getConditionalFormatRules().filter(r => !r.getRanges().some(x => x.getColumn() === 7 || x.getColumn() === 2));
  [['Idea', '#f3f4f6', '#4b5563'], ['To book', '#fef3c7', '#92400e'], ['Booked', '#dbeafe', '#1e40af'], ['Unpaid', '#fee2e2', '#991b1b'],
   ['Paid', '#dcfce7', '#166534'], ['Included', '#dcfce7', '#166534'], ['Done', '#e5e7eb', '#374151']].forEach(s => rules.push(rule(s[0], s[1], s[2], st)));
  [['Transportation', '#e0f2fe'], ['Accommodation', '#ede9fe'], ['Food & Drinks', '#ffedd5'], ['Activities & Tours', '#dcfce7'], ['Shopping & Other', '#f3f4f6']]
    .forEach(s => rules.push(rule(s[0], s[1], UI.ink, sec)));
  sh.setConditionalFormatRules(rules);
  st.setHorizontalAlignment('center');
  sh.getRange(1, 3).setNote('Pick from the list or type your own.');
  console.log('bookings dropdowns set on ' + n + ' rows');
}


/* ================= penpen (original penpen code) ================= */
/**
 * penpen · Step 1 — data foundation
 * New Expenses layout:  Date · What · Category · Amount · Currency · Paid by · For · Paid? · Notes
 *   Paid by = a traveler or "Pocket money" (the shared pot)
 *   For     = Shared (split by fair share) or a name:
 *             name = payer        → 👤 Personal (not in group totals)
 *             name = someone else → 🔁 Covered: that person owes 100% until "Paid back"
 *   Paid?   = Paid · Not yet (shown, but not in who-owes-who) · Paid back (for covered items)
 * Pocket Money tab: money each person puts in the pot. Leftover pot money is shared by fair share.
 * Run penpenSetupStep1() once (safe to run again).
 */
const PX = {date: 1, what: 2, cat: 3, amt: 4, cur: 5, by: 6, forr: 7, paid: 8, notes: 9,
  status: 10, entry: 11, loc: 12, home: 13, local: 14, rate: 15, addedBy: 16, at: 17,
  hf: 18, lf: 19, counts: 20, spend: 21, share: 22 /* 22..27 */, pd: 28 /* 28..33 */};
const PX_USER = 9, PX_LAST = 35;
const PM = 'Pocket Money', POCKET = 'Pocket money';
const PAID_OPTS = ['Paid', 'Not yet', 'Paid back'];
const TZ_OPTS = ['Asia/Manila', 'America/Los_Angeles', 'America/New_York', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Bangkok', 'Asia/Ho_Chi_Minh', 'Asia/Seoul', 'Asia/Hong_Kong', 'Europe/London', 'Australia/Sydney'];
function expCats_() { return CAT_LABELS.concat(['Settle up']); }

/* ============================ one-time setup ============================ */
function penpenSetupStep1() {
  const ss = SpreadsheetApp.openById(SSID), tz = ss.getSpreadsheetTimeZone(), log = [];
  const lock = ppLock_(); lock.waitLock(30000);
  try {
    // 1) backup copy of the whole file
    const file = DriveApp.getFileById(SSID), parents = file.getParents();
    const folder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
    if (folder.searchFiles("title contains 'backup before penpen'").hasNext()) log.push('backup: already made earlier — skipped');
    else {
      const bak = file.makeCopy(ss.getName() + ' (backup before penpen ' + Utilities.formatDate(new Date(), tz, 'MMM d, h:mm a') + ')', folder);
      log.push('backup: ' + bak.getName());
    }
    // 2) Trip Details: locations + dropdown helpers
    log.push(penpenTripDetails_(ss));
    // 3) Pocket Money tab
    log.push(penpenPocket_(ss));
    // 4) Expenses: migrate rows into the new layout
    log.push(penpenExpenses_(ss));
    // 5) Dashboard basics
    log.push(penpenDashboard_(ss));
    log.push(penpenJustMe_(ss));
    penpenExpensesLook_(ss.getSheetByName(EXP));
    const order = [DASH, QA, EXP, PM, ITIN, BOOK, DET];
    order.forEach((nm, i) => { const s = ss.getSheetByName(nm); if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); } });
    const pm = ss.getSheetByName(PM); if (pm) pm.setTabColor('#d97706');
    ss.setActiveSheet(ss.getSheetByName(DASH));
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  console.log(log.join('\n'));
  return log.join('\n');
}

/* ---------- Trip Details ---------- */
function penpenTripDetails_(ss) {
  const d = ss.getSheetByName(DET);
  if (ss.getRangeByName('LocPlace')) return 'trip details: locations already set up';
  // 3 new columns after E (Currency · Time zone · Notes for the locations table); old helpers move to J/K
  d.insertColumnsAfter(5, 3);
  const lc = d.getMaxColumns();
  d.insertColumnsAfter(lc, 2);
  const PC = lc + 1, FC = lc + 2;           // hidden dropdown lists: Paid by options, For options
  d.getRange(D_FIRST - 1, PC, 1, 2).setValues([['paid by options', 'for options']]);
  const pf = [], ff = [['Shared']];
  for (let i = 0; i < MAXP; i++) {
    const r = D_FIRST + i;
    pf.push(['=IF($B' + r + '="","",$B' + r + ')']);
    ff.push(['=IF($B' + r + '="","",$B' + r + ')']);
  }
  pf.push([POCKET]);
  d.getRange(D_FIRST, PC, MAXP + 1, 1).setFormulas(pf.map((x, i) => i === MAXP ? [''] : x));
  d.getRange(D_FIRST + MAXP, PC).setValue(POCKET);
  d.getRange(D_FIRST, FC, MAXP + 1, 1).setFormulas(ff.map((x, i) => i === 0 ? [''] : x));
  d.getRange(D_FIRST, FC).setValue('Shared');
  ss.setNamedRange('PayerOpts', d.getRange(D_FIRST, PC, MAXP + 1, 1));
  ss.setNamedRange('ForOpts', d.getRange(D_FIRST, FC, MAXP + 1, 1));
  d.hideColumns(PC, 2);

  d.getRange('B22').setValue('Fair share = the part of shared costs each person pays (e.g. 50% / 50%, or 60% / 40%). Leave it blank to split evenly. ' +
    'In Expenses, “For” = Shared, or a name when it was only for one person.');

  // Locations block: rows 24–37 (Start over moves down to rows 39–42)
  d.insertRowsAfter(22, 15);
  const blk = d.getRange(23, 1, 15, d.getMaxColumns());
  blk.breakApart(); blk.clear(); blk.clearDataValidations();
  sectionTitle(d.getRange('B24'), 'Locations');
  d.getRange('C24:H24').merge().setValue('Where you’ll be, in order. penpen uses this for the local currency, time and weather.')
    .setFontColor(UI.muted).setFontSize(9);
  d.getRange('B25:H25').setValues([['', 'Place', 'From', 'To', 'Currency', 'Time zone', 'Notes']]);
  tableHead(d.getRange('B25:H25'));
  const N = 12, r0 = 26;
  d.getRange(r0, 2, N, 1).setValues(Array.from({length: N}, (_, i) => ['Location ' + (i + 1)])).setFontColor(UI.muted);
  d.getRange(r0, 3, N, 6).setBorder(true, true, true, true, true, true, UI.line, SpreadsheetApp.BorderStyle.SOLID);
  d.getRange(r0, 3, N, 1).setFontWeight('bold');
  d.getRange(r0, 4, N, 2).setNumberFormat('ddd, mmm d').setHorizontalAlignment('left')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build());
  d.getRange(r0, 6, N, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(CUR), true).setAllowInvalid(false).build());
  d.getRange(r0, 7, N, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(TZ_OPTS, true).setAllowInvalid(true).build());
  d.getRange(r0, 8, N, 1).setFontSize(9).setFontColor(UI.muted).setWrap(true);
  [[6, 90], [7, 140], [8, 260]].forEach(w => d.setColumnWidth(w[0], w[1]));
  const loc = [
    ['Manila', '2026-12-04', '2026-12-04', 'Land 5:40 AM (PR 103), fly to Dipolog 8:55 AM (PR 2555)'],
    ['Dipolog', '2026-12-04', '2026-12-04', 'Rest at a day-use place, 5:00 PM boat to Cebu'],
    ['Cebu City', '2026-12-05', '2026-12-05', 'RF Suites Hotel'],
    ['Moalboal', '2026-12-06', '2026-12-06', 'Tour day 1 · canyoneering · Gravino Tourist Inn'],
    ['Oslob', '2026-12-07', '2026-12-07', 'Tour day 2 · whale sharks · sleep at Harolds Hotel Cebu'],
    ['Cebu City', '2026-12-08', '2026-12-10', 'Harolds Hotel Cebu · evening boat to Dipolog on Dec 10'],
    ['Dipolog', '2026-12-11', '2026-12-13', 'Antonio’s Pension House']];
  d.getRange(r0, 3, loc.length, 6).setValues(loc.map(l => [l[0], l[1], l[2], 'PHP', 'Asia/Manila', l[3]]));
  [['Locations', 'B' + r0 + ':H' + (r0 + N - 1)], ['LocPlace', 'C' + r0 + ':C' + (r0 + N - 1)], ['LocFrom', 'D' + r0 + ':D' + (r0 + N - 1)],
   ['LocTo', 'E' + r0 + ':E' + (r0 + N - 1)], ['LocCur', 'F' + r0 + ':F' + (r0 + N - 1)], ['LocTz', 'G' + r0 + ':G' + (r0 + N - 1)]]
    .forEach(p => ss.setNamedRange(p[0], d.getRange(p[1])));
  d.setRowHeight(24, 34);
  return 'trip details: 7 locations added';
}

/* ---------- Pocket Money ---------- */
function penpenPocket_(ss) {
  if (ss.getSheetByName(PM)) return 'pocket money: tab already there';
  const p = baseSheet(ss.insertSheet(PM), 9, 200);
  [100, 120, 110, 85, 260, 110, 24, 130, 120].forEach((w, i) => p.setColumnWidth(i + 1, w));
  p.getRange('A1:F1').merge().setValue('👛 Pocket money — cash everyone puts in the pot. To pay from it, pick “Pocket money” in Expenses → Paid by.')
    .setFontColor(UI.accent).setFontWeight('bold').setBackground(UI.accentSoft).setWrap(true);
  p.setRowHeight(1, 34);
  p.getRange('A2:E2').setValues([['Date', 'Who put in', 'Amount', 'Currency', 'Notes']]);
  headerStyle(p.getRange('A2:E2'), false);
  p.getRange('F2').setFormula('={"In "&LocalCur;ARRAYFORMULA(IF(C3:C="","",IF(D3:D=LocalCur,C3:C,IF(D3:D=HomeCur,C3:C*LiveRate,""))))}');
  headerStyle(p.getRange('F2'), true);
  p.setRowHeight(2, 32); p.setFrozenRows(2);
  const n = p.getMaxRows() - 2;
  p.getRange(3, 1, n, 1).setNumberFormat('ddd, mmm d').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build());
  p.getRange(3, 2, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ss.getRangeByName('People'), true).setAllowInvalid(false).build());
  p.getRange(3, 3, n, 1).setNumberFormat('#,##0.00');
  p.getRange(3, 4, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ss.getSheetByName(DET).getRange('C10:C11'), true).setAllowInvalid(true).build());
  p.getRange(3, 6, n, 1).setNumberFormat('#,##0.00').setBackground(UI.autoCell).setFontColor(UI.muted);
  lines(p.getRange(3, 1, 40, 6));
  // summary
  p.getRange('H2:I2').setValues([['Put in', '']]);
  p.getRange('I2').setFormula('=SUM(F3:F)');
  p.getRange('H3').setValue('Spent from it');
  p.getRange('I3').setFormula('=SUMPRODUCT(IFERROR((Expenses!J3:J="👛 Pocket money")*Expenses!D3:D*Expenses!S3:S,0))');
  p.getRange('H4').setValue('Left');
  p.getRange('I4').setFormula('=I2-I3');
  p.getRange('H6').setValue('Put in by');
  for (let i = 0; i < MAXP; i++) {
    const r = 7 + i;
    p.getRange(r, 8, 1, 2).setFormulas([['=IF(INDEX(People,' + (i + 1) + ')="","",INDEX(People,' + (i + 1) + '))', '=IF(H' + r + '="","",SUMIF($B$3:$B,H' + r + ',$F$3:$F))']]);
  }
  p.getRange('I2:I12').setNumberFormat('"₱"#,##0.00');
  p.getRange('H2:H12').setFontColor(UI.muted);
  p.getRange('H4:I4').setFontWeight('bold').setFontColor(UI.accent).setFontSize(12);
  p.getRange('H6').setFontWeight('bold');
  p.getRange('H2:I4').setBackground(UI.card).setBorder(true, true, true, true, null, null, UI.line, SpreadsheetApp.BorderStyle.SOLID);
  ss.setNamedRange('PocketIn', p.getRange('I2'));
  ss.setNamedRange('PocketOut', p.getRange('I3'));
  ss.setNamedRange('PocketLeft', p.getRange('I4'));
  p.getRange('F1:F').protect().setDescription('Automatic').setWarningOnly(true);
  p.getRange('H1:I20').protect().setDescription('Automatic').setWarningOnly(true);
  return 'pocket money: tab created';
}

/* ---------- Expenses ---------- */
function penpenExpenses_(ss) {
  const es = ss.getSheetByName(EXP);
  const hdr = es.getRange(2, 1, 1, es.getMaxColumns()).getDisplayValues()[0].map(s => String(s).trim());
  if (hdr[PX.by - 1] === 'Paid by') { penpenBuildExpenses_(ss, es, true); return 'expenses: already new layout (formulas refreshed)'; }
  const ix = h => hdr.indexOf(h);
  const iS = ix('Split'), iN = ix('Notes'), iR = hdr.findIndex(h => h.indexOf('Rate') === 0), iBy = ix('Added by'), iAt = ix('Logged at');
  if (iS < 0 || iN < 0) throw new Error('Expenses headers not as expected: ' + hdr.join(' | '));
  const names = ss.getRangeByName('People').getDisplayValues().map(r => String(r[0]).trim()).filter(String);
  const payCols = names.map(n => ({n: n, i: ix(n + ' paid')})).filter(p => p.i >= 0);
  // keep a hidden copy of the old tab
  const old = es.copyTo(ss).setName('Backup – Expenses (old ' + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'MMM d') + ')');
  old.hideSheet();
  const v = es.getRange(FR, 1, es.getMaxRows() - FR + 1, es.getMaxColumns()).getValues();
  const out = [];
  v.forEach(r => {
    if (r[1] === '' && r[4] === '') return;
    const amt = Number(r[4]) || 0, notes = String(r[iN] || ''), split = String(r[iS] || '').trim();
    const forr = (!split || split === 'Shared' || split === '50/50') ? 'Shared' : split.replace(/\s+only$/i, '');
    const tail = [iR >= 0 ? r[iR] : '', iBy >= 0 ? r[iBy] : '', iAt >= 0 ? r[iAt] : ''];
    const row = (total, by, paid) => out.push({main: [r[0], r[1], r[2], total, r[3], by, forr, paid, notes], tail: tail});
    const payers = payCols.filter(p => Number(r[p.i]) > 0);
    if (!payers.length) {
      let by = '', paid = 'Not yet';
      for (const n of names) {
        const m = notes.match(new RegExp('\\b' + n + '\\b[^.·]*?\\b(will pay|to pay|pays|paid)\\b', 'i'));
        if (m) { by = n; paid = /will pay|to pay/i.test(m[1]) ? 'Not yet' : 'Paid'; break; }
      }
      row(amt, by, paid);
    } else if (payers.length === 1) row(amt, payers[0].n, 'Paid');
    else {
      let sum = 0;
      payers.forEach(p => { const a = Number(r[p.i]); sum += a; row(a, p.n, 'Paid'); });
      if (amt - sum > 0.005) row(Math.round((amt - sum) * 100) / 100, '', 'Paid');
    }
  });
  penpenBuildExpenses_(ss, es, false);
  if (out.length) {
    es.getRange(FR, 1, out.length, PX_USER).setValues(out.map(o => o.main));
    es.getRange(FR, PX.rate, out.length, 3).setValues(out.map(o => o.tail));
  }
  return 'expenses: migrated ' + out.length + ' rows (old tab kept hidden as "' + old.getName() + '")';
}

function penpenBuildExpenses_(ss, es, keepData) {
  es.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(p => { try { p.remove(); } catch (e) {} });
  es.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => { try { p.remove(); } catch (e) {} });
  es.clearConditionalFormatRules();
  es.setFrozenRows(0); es.setFrozenColumns(0);
  es.showColumns(1, es.getMaxColumns());
  const all = es.getRange(1, 1, es.getMaxRows(), es.getMaxColumns());
  all.breakApart();
  if (keepData) { es.getRange(1, 1, 2, es.getMaxColumns()).clear(); es.getRange(1, PX.status, es.getMaxRows(), PX_LAST - PX.status + 1).clearContent(); }
  else { all.clear(); all.clearNote(); }
  all.clearDataValidations();
  baseSheet(es, PX_LAST, 400);
  const N = es.getMaxRows() - FR + 1, C = L;
  const A = c => C(c) + '3:' + C(c);                         // e.g. "D3:D"
  const sym = 'IF(E3:E=HomeCur,HomeSym,IF(E3:E=LocalCur,LocalSym,E3:E&" "))';
  const rate = 'IF(O3:O="",LiveRate,O3:O)';

  es.getRange(1, 1, 1, PX_USER).setBackground(UI.accentSoft);
  es.getRange('A1').setValue('✏️  You can type or edit in these columns').setFontColor(UI.accent).setFontWeight('bold');
  es.getRange(1, PX.status, 1, PX.at - PX.status + 1).setBackground('#f3f4f6');
  es.getRange(1, PX.status).setValue('🔒  Filled in automatically — please don\'t type here').setFontColor(UI.muted).setFontWeight('bold');
  es.getRange(2, 1, 1, PX_USER).setValues([['Date', 'What / Place', 'Category', 'Amount', 'Currency', 'Paid by', 'For', 'Paid?', 'Notes']]);

  // status
  es.getRange(2, PX.status).setFormula('={"Status";ARRAYFORMULA(IF(LEN(B3:B&D3:D)=0,"",' +
    'IF((D3:D="")+(E3:E="")+(G3:G="")+REGEXMATCH(I3:I&"","^⚠"),"⚠️ Needs a look",' +
    'IF(H3:H="Not yet","⏳ Not paid yet",' +
    'IF(F3:F="","⚠️ Needs a look",' +
    'IF(C3:C="Settle up","💸 Settle up",' +
    'IF(F3:F="' + POCKET + '","👛 Pocket money",' +
    'IF(G3:G="Shared","✅ Split",' +
    'IF(G3:G=F3:F,"👤 Personal",' +
    'IF(H3:H="Paid back","✅ Paid back","🔁 Covered"))))))))))}');
  // this entry (plain words)
  es.getRange(2, PX.entry).setFormula('={"This entry";ARRAYFORMULA(IFERROR(LET(st,J3:J,' +
    'amt,' + sym + '&TEXT(D3:D,"#,##0.00"),' +
    'miss,REGEXREPLACE(IF(D3:D="","amount · ","")&IF(E3:E="","currency · ","")&IF(F3:F="","who paid · ","")&IF(G3:G="","who it’s for · ",""),"\\s·\\s$",""),' +
    'two,COUNTIF(People,"?*")=2,' +
    'oth,IF(F3:F=INDEX(People,1),INDEX(People,2),INDEX(People,1)),' +
    'wp,IFERROR(VLOOKUP(F3:F,{People,Weights},2,FALSE)/SUM(Weights),0),' +
    'IFS(st="","",' +
    'st="⚠️ Needs a look",IF(miss="","Check the note","Missing: "&miss),' +
    'st="⏳ Not paid yet",IF(F3:F="","Not paid yet",F3:F&" will pay"),' +
    'st="💸 Settle up",F3:F&" paid "&G3:G&" "&amt,' +
    'st="👛 Pocket money","From pocket money · "&IF(G3:G="Shared","shared","for "&G3:G),' +
    'st="✅ Split",IF(two,oth&" owes "&F3:F&" "&' + sym + '&TEXT(D3:D*(1-wp),"#,##0.00"),"Shared · "&F3:F&" paid"),' +
    'st="👤 Personal","Just for "&F3:F&" · not in group totals",' +
    'st="✅ Paid back",G3:G&" paid "&F3:F&" back",' +
    'st="🔁 Covered",G3:G&" owes "&F3:F&" "&amt&" · not paid back yet",' +
    'TRUE,"")),""))}');
  es.getRange(2, PX.loc).setFormula('={"Location";ARRAYFORMULA(IF(A3:A="","",IFERROR(VLOOKUP(A3:A,SORT(FILTER({LocFrom,LocPlace},LocFrom<>""),1,TRUE),2,TRUE),"")))}');
  es.getRange(2, PX.home).setFormula('={"Total "&HomeCur;ARRAYFORMULA(IF(' + A(PX.spend) + '=1,IFERROR(D3:D*' + A(PX.hf) + ',""),""))}');
  es.getRange(2, PX.local).setFormula('={"Total "&LocalCur;ARRAYFORMULA(IF(' + A(PX.spend) + '=1,IFERROR(D3:D*' + A(PX.lf) + ',""),""))}');
  es.getRange(2, PX.rate, 1, 3).setValues([['Rate (locked)', 'Added by', 'Logged at']]);
  es.getRange(2, PX.hf).setFormula('={"home f";ARRAYFORMULA(IF(D3:D="","",IF(E3:E=HomeCur,1,IF(E3:E=LocalCur,1/' + rate + ',""))))}');
  es.getRange(2, PX.lf).setFormula('={"local f";ARRAYFORMULA(IF(D3:D="","",IF(E3:E=LocalCur,1,IF(E3:E=HomeCur,' + rate + ',""))))}');
  es.getRange(2, PX.counts).setFormula('={"counts";ARRAYFORMULA(IF(J3:J="","",IF(REGEXMATCH(J3:J&"","^(✅ Split|👛|🔁|💸)"),1,0)))}');
  es.getRange(2, PX.spend).setFormula('={"spend";ARRAYFORMULA(IF(J3:J="","",IF(REGEXMATCH(J3:J&"","^(✅|👛|🔁)"),1,0)))}');
  for (let i = 0; i < MAXP; i++) {
    const k = i + 1;
    es.getRange(2, PX.share + i).setFormula('={"share ' + k + '";ARRAYFORMULA(IF(D3:D="","",IF(INDEX(People,' + k + ')="",0,IF(G3:G="Shared",IFERROR(D3:D*INDEX(Weights,' + k + ')/SUM(Weights),0),IF(G3:G=INDEX(People,' + k + '),D3:D,0)))))}');
    es.getRange(2, PX.pd + i).setFormula('={"paid ' + k + '";ARRAYFORMULA(IF(D3:D="","",IF((INDEX(People,' + k + ')<>"")*(F3:F=INDEX(People,' + k + ')),D3:D,0)))}');
  }

  headerStyle(es.getRange(2, 1, 1, PX_USER), false);
  headerStyle(es.getRange(2, PX.status, 1, PX.at - PX.status + 1), true);
  es.setRowHeight(1, 28); es.setRowHeight(2, 36);
  es.setFrozenRows(2); es.setFrozenColumns(2);
  [100, 240, 150, 100, 85, 110, 100, 90, 300, 130, 250, 110, 95, 95, 90, 170, 140].forEach((w, i) => es.setColumnWidth(i + 1, w));
  lines(es.getRange(FR, 1, N, PX.at));
  es.getRange(FR, PX.status, N, PX.at - PX.status + 1).setBackground(UI.autoCell).setFontColor(UI.muted);
  es.getRange(FR, PX.entry, N, 1).setFontColor(UI.ink);
  es.getRange(2, PX.status, N + 1, 1).setBorder(null, true, null, null, null, null, '#9ca3af', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  es.getRange(FR, PX.date, N, 1).setNumberFormat('ddd, mmm d');
  es.getRange(FR, PX.amt, N, 1).setNumberFormat('#,##0.00');
  es.getRange(FR, PX.home, N, 2).setNumberFormat('#,##0.00').setFontColor(UI.ink);
  es.getRange(FR, PX.rate, N, 1).setNumberFormat('0.00');
  es.getRange(FR, PX.at, N, 1).setNumberFormat('mmm d, h:mm am/pm');
  es.getRange(FR, PX.notes, N, 1).setFontSize(9);
  es.getRange(FR, PX.by, N, 3).setHorizontalAlignment('center');

  const dv = SpreadsheetApp.newDataValidation;
  es.getRange(FR, PX.date, N, 1).setDataValidation(dv().requireDate().setAllowInvalid(true).build());
  es.getRange(FR, PX.cat, N, 1).setDataValidation(dv().requireValueInList(expCats_(), true).setAllowInvalid(false).build());
  es.getRange(FR, PX.cur, N, 1).setDataValidation(dv().requireValueInRange(ss.getSheetByName(DET).getRange('C10:C11'), true).setAllowInvalid(true).build());
  es.getRange(FR, PX.by, N, 1).setDataValidation(dv().requireValueInRange(ss.getRangeByName('PayerOpts'), true).setAllowInvalid(false).build());
  es.getRange(FR, PX.forr, N, 1).setDataValidation(dv().requireValueInRange(ss.getRangeByName('ForOpts'), true).setAllowInvalid(false).build());
  es.getRange(FR, PX.paid, N, 1).setDataValidation(dv().requireValueInList(PAID_OPTS, true).setAllowInvalid(false).build());

  const st = es.getRange(FR, PX.status, N, 1), user = es.getRange(FR, 1, N, PX_USER);
  const R = SpreadsheetApp.newConditionalFormatRule;
  es.setConditionalFormatRules([
    R().whenFormulaSatisfied('=$J3="👤 Personal"').setFontColor('#9ca3af').setBackground('#f8fafc').setRanges([user]).build(),
    R().whenTextStartsWith('✅').setBackground('#dcfce7').setFontColor('#166534').setRanges([st]).build(),
    R().whenTextStartsWith('⏳').setBackground('#fef3c7').setFontColor('#92400e').setRanges([st]).build(),
    R().whenTextStartsWith('⚠').setBackground('#fee2e2').setFontColor('#991b1b').setRanges([st]).build(),
    R().whenTextStartsWith('🔁').setBackground('#ffedd5').setFontColor('#9a3412').setRanges([st]).build(),
    R().whenTextStartsWith('👛').setBackground('#e0f2f1').setFontColor('#0B7F8C').setRanges([st]).build(),
    R().whenTextStartsWith('💸').setBackground('#dbeafe').setFontColor('#1e40af').setRanges([st]).build(),
    R().whenTextStartsWith('👤').setBackground('#e2e8f0').setFontColor('#475569').setRanges([st]).build(),
    R().whenTextContains('owes').setFontColor('#92400e').setRanges([es.getRange(FR, PX.entry, N, 1)]).build()]);

  es.getRange(2, PX.by).setNote('Who paid: a traveler, or “Pocket money” (the shared pot on the Pocket Money tab). Leave blank if you don’t know yet.');
  es.getRange(2, PX.forr).setNote('Shared = split by fair share (Trip Details).\nA name = only for that person:\n• they paid it themselves → 👤 Personal (not in group totals)\n• someone else paid → 🔁 Covered: they owe it back in full.');
  es.getRange(2, PX.paid).setNote('Paid · Not yet (shows up, but isn’t in who-owes-who until it’s paid) · Paid back (for a 🔁 covered item once it’s been paid back).');
  es.getRange(2, PX.cat).setNote('“Settle up” = paying someone back. It evens out who-owes-who and isn’t counted as spending.');
  es.getRange(1, PX.status, es.getMaxRows(), PX_LAST - PX.status + 1).protect().setDescription('Automatic columns').setWarningOnly(true);
  es.getRange(1, 1, 2, PX_USER).protect().setDescription('Headers').setWarningOnly(true);
}

function penpenExpensesLook_(ex) {
  if (!ex) return;
  ex.showColumns(1, PX.at);
  ex.hideColumns(PX.hf, PX_LAST - PX.hf + 1);
  const mr = ex.getMaxRows();
  ex.getRange(3, PX.what, mr - 2, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  ex.getRange(3, PX.notes, mr - 2, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  ex.getRange(3, PX.entry, mr - 2, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  ex.getRange(3, 1, mr - 2, PX.at).setVerticalAlignment('middle');
  ex.setRowHeightsForced(3, mr - 2, 30);
}

/* ---------- Dashboard basics ---------- */
function penpenDashboard_(ss) {
  const d = ss.getSheetByName(DASH);
  const B = d.getRange(1, 2, d.getMaxRows(), 1).getDisplayValues().map(r => String(r[0]).trim());
  const rowOf = (t, from) => { for (let i = from || 0; i < B.length; i++) if (B[i].indexOf(t) === 0) return i + 1; return -1; };
  const r3 = c => 'Expenses!' + c + '3:' + c;
  const M = r3(L(PX.home)), N = r3(L(PX.local)), J = r3(L(PX.status)), D = r3(L(PX.amt)), S = r3(L(PX.lf)), R = r3(L(PX.hf)), T = r3(L(PX.counts));
  const done = [];
  // KPI cards
  d.getRange('B5').setValue('  TOTAL SPENT');
  d.getRange('B6').setFormula('=HomeSym&TEXT(SUM(' + M + '),"#,##0.00")');
  d.getRange('B7').setFormula('=IF(HomeCur=LocalCur,"",LocalSym&TEXT(SUM(' + N + '),"#,##0.00"))');
  d.getRange('B8').setValue('  group spending · personal items not counted');
  d.getRange('D5').setValue('  NOT PAID YET');
  d.getRange('D6').setFormula('=COUNTIF(' + J + ',"⏳ Not paid yet")&IF(COUNTIF(' + J + ',"⏳ Not paid yet")=1," entry"," entries")');
  d.getRange('D7').setFormula('=LocalSym&TEXT(SUMPRODUCT(IFERROR((' + J + '="⏳ Not paid yet")*' + D + '*' + S + ',0)),"#,##0.00")');
  d.getRange('D8').setFormula('=IF(COUNTIF(' + J + ',"⚠️ Needs a look")>0,"  ⚠️ "&COUNTIF(' + J + ',"⚠️ Needs a look")&" need a look in Expenses","  nothing to fix ✓")');
  d.getRange('F8').setFormula('=(TripEnd-TripStart+1)&" days  ·  👛 "&LocalSym&TEXT(PocketLeft,"#,##0")&" pocket money left"');
  done.push('kpi');

  // people table (hidden; feeds the person cards and Settle up)
  const rWho = rowOf('Who paid what'), hdr = rWho > 0 ? rowOf('Person', rWho) : -1;
  if (hdr < 0) throw new Error('Dashboard: "Who paid what" table not found');
  const t0 = hdr + 1;
  for (let i = 0; i < MAXP; i++) {
    const r = t0 + i, k = i + 1, b = '$B' + r;
    const pc = L(PX.pd + i), sc = L(PX.share + i);
    const sp = (c, f) => 'SUMPRODUCT(IFERROR(' + r3(c) + '*' + f + '*' + T + ',0))';
    const pot = '(IFERROR(SUMIF(\'' + PM + '\'!$B$3:$B,' + b + ',\'' + PM + '\'!$F$3:$F),0)-IFERROR(INDEX(Weights,' + k + ')/SUM(Weights),0)*PocketLeft)';
    d.getRange(r, 2, 1, 8).setFormulas([[
      '=IF(INDEX(People,' + k + ')="","",INDEX(People,' + k + '))',
      '=IF(' + b + '="","",IFERROR(INDEX(Weights,' + k + ')/SUM(Weights),0))',
      '=IF(' + b + '="","",' + sp(pc, R) + '+' + pot + '/LiveRate)',
      '=IF(' + b + '="","",' + sp(sc, R) + ')',
      '=IF(' + b + '="","",D' + r + '-E' + r + ')',
      '=IF(' + b + '="","",' + sp(pc, S) + '+' + pot + ')',
      '=IF(' + b + '="","",' + sp(sc, S) + ')',
      '=IF(' + b + '="","",G' + r + '-H' + r + ')']]);
  }
  done.push('people rows ' + t0 + '-' + (t0 + MAXP - 1));

  // who owes who (named SettleText)
  const nR = 'B' + t0 + ':B' + (t0 + MAXP - 1), bR = 'I' + t0 + ':I' + (t0 + MAXP - 1);
  const settle = '=ARRAYFORMULA(LET(nm,' + nR + ',bal,IFERROR(' + bR + '*1,0),ok,--(nm<>""),' +
    'nc,SUMPRODUCT(ok*(bal>0.005)),nd,SUMPRODUCT(ok*(bal<-0.005)),' +
    'IF(SUM(ok)=0,"Add travelers on Trip Details",IF(nd=0,"✅ All square 🎉",' +
    'IF(nc=1,TEXTJOIN(CHAR(10),TRUE,FILTER(nm&" owes "&INDEX(FILTER(nm,ok*(bal>0.005)),1)&" "&LocalSym&TEXT(-bal,"#,##0.00"),ok*(bal<-0.005))),' +
    'IF(nd=1,TEXTJOIN(CHAR(10),TRUE,FILTER(INDEX(FILTER(nm,ok*(bal<-0.005)),1)&" owes "&nm&" "&LocalSym&TEXT(bal,"#,##0.00"),ok*(bal>0.005))),' +
    'TEXTJOIN(CHAR(10),TRUE,FILTER(nm&IF(bal>0," gets back "," owes ")&LocalSym&TEXT(ABS(bal),"#,##0.00"),ok*(ABS(bal)>0.005)))))))))';
  let stR = ss.getRangeByName('SettleText');
  if (!stR) { stR = d.getRange('J11'); ss.setNamedRange('SettleText', stR); }
  stR.setFormula(settle);
  done.push('settle text');

  // by category
  const rCat = rowOf('By category');
  if (rCat > 0) {
    let rTot = rowOf('Total', rCat);
    const cats = [];
    for (let r = rCat + 2; r < rTot; r++) cats.push(r);
    d.getRange(rTot, 3, 1, 2).setFormulas([['=SUM(' + M + ')', '=SUM(' + N + ')']]);
    cats.forEach(r => {
      if (B[r - 1] === 'Shopping & Other') d.getRange(r, 3, 1, 2).setFormulas([['=C' + rTot + '-SUM(C' + (rCat + 2) + ':C' + (r - 1) + ')', '=D' + rTot + '-SUM(D' + (rCat + 2) + ':D' + (r - 1) + ')']]);
      else d.getRange(r, 3, 1, 2).setFormulas([['=SUMIF(Expenses!$C$3:$C,$B' + r + ',' + M + ')', '=SUMIF(Expenses!$C$3:$C,$B' + r + ',' + N + ')']]);
      d.getRange(r, 5).setFormula('=IFERROR(C' + r + '/$C$' + rTot + ',0)');
    });
    done.push('categories ' + (rCat + 2) + '-' + rTot);
  }
  // daily spending
  const rDay = rowOf('Daily spending'), rOther = rDay > 0 ? rowOf('Other dates', rDay) : -1;
  if (rOther > 0) {
    const s = rOther + 1, e = Math.min(s + 64, d.getMaxRows());
    d.getRange(rOther, 3, 1, 2).setFormulas([['=SUM(' + M + ')-SUM(C' + s + ':C' + e + ')', '=SUM(' + N + ')-SUM(D' + s + ':D' + e + ')']]);
    d.getRange(s, 3).setFormula('=ARRAYFORMULA(IF(B' + s + ':B' + e + '="","",SUMIF(Expenses!$A$3:$A,B' + s + ':B' + e + ',' + M + ')))');
    d.getRange(s, 4).setFormula('=ARRAYFORMULA(IF(B' + s + ':B' + e + '="","",SUMIF(Expenses!$A$3:$A,B' + s + ':B' + e + ',' + N + ')))');
    done.push('daily ' + s + '-' + e);
  }
  // notes under the person cards
  for (let i = 0; i < B.length; i++) if (/^✅ split entries/.test(B[i]))
    d.getRange(i + 1, 2).setValue('Paid & split entries only · 👤 personal items not counted · pocket money shared by fair share');
  return 'dashboard: ' + done.join(', ');
}

/* ============================ writing rows (parser + forms) ============================ */
function nextRow(sh) {
  const n = sh.getMaxRows();
  const v = sh.getRange(FR, 1, n - FR + 1, PX_USER).getValues();
  let last = FR - 1;
  v.forEach((r, i) => { if (r.some(c => c !== '' && c !== null)) last = i + FR; });
  if (last + 1 > n) sh.insertRowsAfter(n, 50);
  return last + 1;
}

function writeRow(ss, sh, r) {
  const row = nextRow(sh);
  if (typeof PP_TRACK !== 'undefined' && PP_TRACK) PP_TRACK.push(row);
  sh.getRange(row, 1, 1, PX_USER).setValues([[r.date, r.what, r.cat, r.total, r.cur, r.by || '', r.forr || 'Shared', r.paid || 'Paid', r.notes || '']]);
  sh.getRange(row, PX.rate, 1, 3).setValues([[Number(named(ss, 'LiveRate')) || '', r.email || '', Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss')]]);
  if (typeof ppLog_ === 'function') ppLog_('Added', r.what, money(r.total, r.cur) + ' · ' + (r.by ? r.by + (r.paid === 'Not yet' ? ' will pay' : ' paid') : 'payer not set') + ' · ' + (r.forr === 'Shared' ? 'shared' : 'for ' + r.forr));
  return row;
}

function addExpense(ss, ctx, text, email, hint, pre) {
  const sh = ss.getSheetByName(EXP);
  const x = pre || parseExpense(text, ctx, getSpeaker(ctx, email) || hint || null);
  const a = ctx.names[0], cw = curWord(ctx.local);
  if (x.total === null) throw new Error('I didn\'t catch an amount. Try: "Taxi 250 ' + cw + ', ' + a + ' paid"');
  const src = String(text || '') + ' ' + String(x.raw || '');
  const fromPot = x.fromPot === true || /\b(pocket money|the pot|our pot|kitty|common fund|shared fund|pooled money)\b/i.test(src);
  const notYet = x.notYet === true || /\b(will pay|to pay|haven'?t paid|not paid yet|pay later|still (?:need|have) to pay)\b/i.test(src);
  const paidState = notYet ? 'Not yet' : 'Paid';
  const fix = fromPot ? '' : x.fix;
  const note = (fix ? '⚠️ ' + fix + ' · ' : '') + '🎤 ' + text;
  const forOf = s => (!s || s === 'Shared' || s === 'EACH') ? 'Shared' : String(s).replace(/\s+only$/i, '');
  const base = {date: x.date, what: x.what, cat: x.cat, cur: x.cur, notes: note, email: email, paid: paidState};
  const payers = fromPot ? [] : Object.keys(x.paid || {});
  const rows = [];
  if (fromPot) rows.push(Object.assign({}, base, {total: x.total, by: POCKET, forr: forOf(x.split)}));
  else if (x.split === 'EACH' && payers.length >= 2) payers.forEach(n => rows.push(Object.assign({}, base, {total: x.paid[n], by: n, forr: n})));
  else if (payers.length >= 2) {
    let sum = 0;
    payers.forEach(n => { sum += x.paid[n]; rows.push(Object.assign({}, base, {total: x.paid[n], by: n, forr: forOf(x.split)})); });
    if (x.total - sum > 0.005) rows.push(Object.assign({}, base, {total: Math.round((x.total - sum) * 100) / 100, by: '', forr: forOf(x.split)}));
  } else rows.push(Object.assign({}, base, {total: x.total, by: payers[0] || '', forr: forOf(x.split)}));
  rows.forEach(r => writeRow(ss, sh, r));
  const parts = rows.map(r => {
    let s = money(r.total, r.cur);
    if (r.by === POCKET) s += ' from pocket money';
    else if (r.by) s += ' · ' + r.by + (paidState === 'Not yet' ? ' will pay' : ' paid');
    if (r.by && r.forr === r.by) s += ' (just for ' + r.by + ')';
    else if (r.forr !== 'Shared') s += ' · for ' + r.forr + (r.by && r.by !== POCKET ? ' (' + r.forr + ' owes ' + r.by + ')' : '');
    else s += ' · shared';
    return s;
  });
  let icon = '✅', tail = '';
  if (!x.cur) { icon = '⚠️'; tail += ' · no currency! set it in Expenses, or Undo and say it again with ' + cw; }
  if (fix) { icon = '⚠️'; tail += ' · Who\'s I? say "that was ' + a + '"'; }
  else if (rows.some(r => !r.by)) { icon = '⚠️'; tail += ' · who paid? say "that was ' + a + '"'; }
  if (paidState === 'Not yet' && icon === '✅') icon = '⏳';
  return icon + ' ' + x.cat + ': ' + x.what + ' · ' + parts.join(' + ') + tail + (x.guessed ? ' · category guessed' : '');
}

function settleLast(ss, ctx, who, email) {
  if (who === 'I') {
    who = getSpeaker(ctx, email);
    if (!who) throw new Error('I can\'t tell who "I" is here — say the name, e.g. "that was ' + ctx.names[0] + '"');
  }
  const sh = ss.getSheetByName(EXP);
  const n = nextRow(sh) - FR;
  if (n < 1) return 'Nothing to fix.';
  const v = sh.getRange(FR, 1, n, PX_USER).getValues();
  for (let i = n - 1; i >= 0; i--) {
    const r = v[i];
    if (r[PX.amt - 1] !== '' && (r[PX.by - 1] === '' || /^⚠️ Who's I/.test(String(r[PX.notes - 1])))) {
      const row = i + FR;
      sh.getRange(row, PX.by).setValue(who);
      sh.getRange(row, PX.notes).setValue(String(r[PX.notes - 1]).replace(/⚠️ Who's I\?[^·]*·\s*/, ''));
      return '✅ Fixed: ' + r[PX.what - 1] + ' · ' + money(r[PX.amt - 1], r[PX.cur - 1]) + ' · ' + who + ' paid';
    }
  }
  return 'Every entry already has a payer 🎉';
}

function undoLast(ss) {
  const sh = ss.getSheetByName(EXP);
  const last = nextRow(sh) - 1;
  if (last < FR) return 'Nothing to undo.';
  const notes = String(sh.getRange(last, PX.notes).getValue());
  if (notes.indexOf('🎤') < 0) return 'The last row wasn\'t added by penpen — delete it in Expenses if needed.';
  const what = sh.getRange(last, PX.what).getValue();
  sh.deleteRow(last);
  return '↩️ Removed: ' + what;
}

function startOver(ss) {
  const file = DriveApp.getFileById(SSID);
  const tz = ss.getSpreadsheetTimeZone();
  const name = String(named(ss, 'FileTitle') || named(ss, 'TripName') || ss.getName());
  const parents = file.getParents();
  const folder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const copy = file.makeCopy(name + ' (archive ' + Utilities.formatDate(new Date(), tz, 'MMM d, yyyy') + ')', folder);
  const cs = SpreadsheetApp.openById(copy.getId());
  cs.getSheets().forEach(s => s.protect().setDescription('Archived trip – read only').setWarningOnly(true));
  const es = ss.getSheetByName(EXP), n = es.getMaxRows() - FR + 1;
  es.getRange(FR, 1, n, PX_USER).clearContent();
  es.getRange(FR, PX.rate, n, 3).clearContent();
  const pm = ss.getSheetByName(PM);
  if (pm && pm.getMaxRows() > 2) pm.getRange(3, 1, pm.getMaxRows() - 2, 5).clearContent();
  [BOOK, ITIN].forEach(nm => {
    const s = ss.getSheetByName(nm);
    if (s && s.getMaxRows() > 1) s.getRange(2, 1, s.getMaxRows() - 1, s.getMaxColumns()).clearContent();
  });
  const d = ss.getSheetByName(DET);
  ['FileTitle', 'TripName', 'TripStart', 'TripEnd'].forEach(nm => { const r = ss.getRangeByName(nm); if (r) r.clearContent(); });
  const loc = ss.getRangeByName('Locations');
  if (loc) loc.offset(0, 1, loc.getNumRows(), loc.getNumColumns() - 1).clearContent();
  d.getRange(D_FIRST, 2, MAXP, 4).clearContent();
  applyDetails(ss);
  return '📦 Saved “' + copy.getName() + '” in your Drive and cleared everything. Fill in the details above for the next trip.';
}

function applyDetails(ss) {
  const ctx = getCtx(ss);
  const d = ss.getSheetByName(DET), q = ss.getSheetByName(QA);
  d.getRange('D10:D11').setValues([[sym(ctx.home).trim() || ctx.home], [sym(ctx.local).trim() || ctx.local]]);
  const title = String(named(ss, 'FileTitle') || '').trim();
  if (title && ss.getName() !== title) ss.rename(title);
  if (q) penpenHelpTab_();
}

/* ============================ laptop pop-up + phone app ============================ */
function addExpenseForm(e) {
  var ss = ss_(), ex = sh_('Expenses');
  var lock = ppLock_(); lock.waitLock(15000);
  try {
    var amt = Math.round(Number(e.amount) * 100) / 100, email = '';
    try { email = ppSrvUser_().getEmail() || ''; } catch (x) {}
    var row = writeRow(ss, ex, {date: e.date || '', what: e.what, cat: e.cat, cur: e.cur, total: amt, by: e.payer || '',
      forr: e.split || 'Shared', paid: e.paid || 'Paid', notes: e.notes || '', email: email});
    SpreadsheetApp.flush();
    var st = ex.getRange(row, PX.status, 1, 2).getDisplayValues()[0];
    return e.what + ' · ' + e.cur + ' ' + amt.toFixed(2) + (st[0] ? '  —  ' + st[0] + (st[1] ? ' (' + st[1] + ')' : '') : '');
  } finally { lock.releaseLock(); }
}

function settleBody_(forDialog) {
  var ss = ss_(), db = sh_('Dashboard');
  var B = db.getRange('B1:B150').getDisplayValues().map(function (r) { return String(r[0]).trim(); });
  function rowOf(t) { for (var i = 0; i < B.length; i++) if (B[i].indexOf(t) == 0) return i + 1; return -1; }
  var top = db.getRange('B5:I8').getDisplayValues();
  var rWho = rowOf('Who paid what');
  var who = rWho > 0 ? db.getRange(rWho + 2, 2, 6, 8).getDisplayValues().filter(function (r) { return r[0]; }) : [];
  var ls = String(named(ss, 'LocalSym') || '₱');
  var ex = sh_('Expenses'), last = Math.max(ex.getLastRow(), 3);
  var v = ex.getRange(3, 1, last - 2, PX.entry).getDisplayValues();
  var look = v.filter(function (r) { return r[1] && /^(⚠|⏳|🔁)/.test(r[PX.status - 1]); });
  var pr = ss.getRangeByName('PocketLeft'), pocket = pr ? pr.getDisplayValue() : '';
  function sgn(b) { b = String(b); return b.indexOf('-') == 0 ? '−' + ls + b.slice(1) : (Number(b.replace(/,/g, '')) ? '+' + ls + b : ls + b); }
  var h = '';
  h += '<div class="card hero"><div class="lbl">WHO OWES WHO</div><div class="v">' + esc_(settleText_() || 'All square 🎉').replace(/\n/g, '<br>') + '</div></div>';
  h += '<div class="stats"><div class="card"><div class="muted">Total spent</div><div class="v">' + esc_(top[1][0]) + '</div><div class="muted">' + esc_(top[2][0]) + '</div></div>';
  h += '<div class="card"><div class="muted">Not paid yet</div><div class="v">' + esc_(top[1][2]) + '</div><div class="muted">' + esc_(top[2][2]) + '</div></div>';
  h += '<div class="card"><div class="muted">👛 Pocket money</div><div class="v">' + esc_(pocket) + '</div><div class="muted">left</div></div></div>';
  h += '<div class="card"><b>Who paid what</b><table><tr><th>Person</th><th>Paid</th><th>Fair share</th><th>Balance</th></tr>';
  who.forEach(function (r) {
    var cls = String(r[7]).indexOf('-') == 0 ? 'neg' : 'pos';
    h += '<tr><td><b>' + esc_(r[0]) + '</b></td><td>' + ls + esc_(r[5]) + '</td><td>' + ls + esc_(r[6]) + '</td><td class="' + cls + '">' + esc_(sgn(r[7])) + '</td></tr>';
  });
  h += '</table><div class="muted small">+ gets money back · − owes</div></div>';
  if (look.length) {
    h += '<div class="card"><b>Needs a look (' + look.length + ')</b><table>';
    look.forEach(function (r) {
      h += '<tr><td>' + esc_(r[PX.what - 1]) + '<div class="muted small">' + esc_(r[PX.status - 1] + ' · ' + r[PX.entry - 1]) + '</div></td><td>' + esc_(r[PX.amt - 1] + ' ' + r[PX.cur - 1]) + '</td></tr>';
    });
    h += '</table></div>';
  }
  if (forDialog) h += '<div class="btns"><button onclick="google.script.run.goTo(&#39;Expenses&#39;);google.script.host.close()">Open Expenses</button>' +
       '<button class="p" onclick="google.script.run.showAddExpense()">➕ Add expense</button></div>';
  return h;
}

function peopleColumns_() { /* helper columns stay hidden in the new layout; nothing to show/hide per person */ }

/* ============================ check ============================ */
function penpenCheck() {
  const ss = SpreadsheetApp.openById(SSID), es = ss.getSheetByName(EXP), d = ss.getSheetByName(DASH);
  const n = Math.max(nextRow(es) - FR, 1);
  const rows = es.getRange(FR, 1, n, PX.at).getDisplayValues().map((r, i) => (i + FR) + ': ' + [r[0], r[1], r[3] + ' ' + r[4], r[5], r[6], r[7], r[9], r[10], r[11], r[12], r[13]].join(' | '));
  const out = ['EXPENSES'].concat(rows, ['', 'DASHBOARD',
    'spent: ' + d.getRange('B6').getDisplayValue() + ' / ' + d.getRange('B7').getDisplayValue(),
    'not paid: ' + d.getRange('D6').getDisplayValue() + ' / ' + d.getRange('D7').getDisplayValue() + ' / ' + d.getRange('D8').getDisplayValue(),
    'trip: ' + d.getRange('F6').getDisplayValue() + ' / ' + d.getRange('F8').getDisplayValue(),
    'settle: ' + settleText_().replace(/\n/g, ' ; '),
    'pocket left: ' + (ss.getRangeByName('PocketLeft') ? ss.getRangeByName('PocketLeft').getDisplayValue() : '-')]);
  console.log(out.join('\n'));
  return out.join('\n');
}

/* ---------- Just me: what each person spent on themselves (quick version; polished in Step 3) ---------- */


/* ================= penpenAssistant (original penpen code) ================= */
/**
 * penpen · Step 2 — the assistant (phone app + brain)
 * Phone app: doGet() → penpenApp.html. The page calls penpenHello(), penpenAsk(text), penpenConfirm(id, yes),
 * penpenUndo(), settleWeb(), penpenFormData(), addExpenseForm(o).
 * Brain: Gemini (GEMINI_API_KEY) picks the action; if Gemini is unavailable the old rules still add / undo / "that was X".
 * Edits, deletes and emails always ask Yes / No first. "undo" reverts the last thing penpen did for you.
 */
var PP_TRACK = null;                       // rows written by writeRow() during one request
const PP_REM = 'Reminders';
/* ============================ the trip's place ============================
   Each trip has a country. It sets the trip currency (LocalCur), the sheet's time zone, map and place searches,
   and what penpen's chat assumes. Countries penpen knows: code → [name, currency, time zones (first = default)].
   Keep in step with the country list in place.js (the app). */
const PP_PLACES = {
  PH: ['Philippines', 'PHP', ['Asia/Manila']],
  US: ['United States', 'USD', ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu']],
  CA: ['Canada', 'CAD', ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax']],
  MX: ['Mexico', 'MXN', ['America/Mexico_City', 'America/Cancun', 'America/Tijuana']],
  JP: ['Japan', 'JPY', ['Asia/Tokyo']], KR: ['South Korea', 'KRW', ['Asia/Seoul']], TW: ['Taiwan', 'TWD', ['Asia/Taipei']],
  HK: ['Hong Kong', 'HKD', ['Asia/Hong_Kong']], MO: ['Macau', 'MOP', ['Asia/Macau']], CN: ['China', 'CNY', ['Asia/Shanghai']],
  SG: ['Singapore', 'SGD', ['Asia/Singapore']], MY: ['Malaysia', 'MYR', ['Asia/Kuala_Lumpur']], TH: ['Thailand', 'THB', ['Asia/Bangkok']],
  VN: ['Vietnam', 'VND', ['Asia/Ho_Chi_Minh']], ID: ['Indonesia', 'IDR', ['Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura']],
  KH: ['Cambodia', 'USD', ['Asia/Phnom_Penh']], IN: ['India', 'INR', ['Asia/Kolkata']],
  AU: ['Australia', 'AUD', ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Darwin', 'Australia/Perth']],
  NZ: ['New Zealand', 'NZD', ['Pacific/Auckland']], GB: ['United Kingdom', 'GBP', ['Europe/London']], IE: ['Ireland', 'EUR', ['Europe/Dublin']],
  FR: ['France', 'EUR', ['Europe/Paris']], DE: ['Germany', 'EUR', ['Europe/Berlin']], ES: ['Spain', 'EUR', ['Europe/Madrid']],
  IT: ['Italy', 'EUR', ['Europe/Rome']], PT: ['Portugal', 'EUR', ['Europe/Lisbon']], NL: ['Netherlands', 'EUR', ['Europe/Amsterdam']],
  GR: ['Greece', 'EUR', ['Europe/Athens']], CH: ['Switzerland', 'CHF', ['Europe/Zurich']], AT: ['Austria', 'EUR', ['Europe/Vienna']],
  TR: ['Turkey', 'TRY', ['Europe/Istanbul']], AE: ['United Arab Emirates', 'AED', ['Asia/Dubai']]
};
/* {cc, name, cur, sym, tz, set} for the open trip. set = the creator picked the country; otherwise it's worked out
   from the trip currency (PHP → Philippines), which is how trips made before countries existed still work. */
function ppPlace_(ss) {
  let cc = ''; try { cc = JSON.parse(ppProps_().getProperty(ppK_('pp_place')) || '{}').cc || ''; } catch (e) {}
  const cur = String(named(ss, 'LocalCur') || 'PHP').trim(), set = !!PP_PLACES[cc] || cc === 'XX';   // XX = somewhere penpen has no country for
  if (cc === 'XX') cc = ''; else if (!set) cc = ppCcForCur_(cur);
  return {cc: cc, name: cc ? PP_PLACES[cc][0] : '', cur: cur, sym: sym(cur).trim() || cur, tz: ppTz_(ss), set: set};
}
function ppCcForCur_(cur) {   // PHP → PH; USD → US; a currency many countries share (EUR) → ''
  const m = Object.keys(PP_PLACES).filter(k => PP_PLACES[k][1] === cur);
  return cur === 'USD' ? 'US' : m.length === 1 ? m[0] : '';
}
function ppPlaceName_(ss) { const n = ppPlace_(ss).name; return n ? ', ' + n : ''; }   // ", Japan" for map searches
/* Write the country onto a trip sheet: time zone, trip currency (and its sign), each location's currency + zone.
   Never called on the original (home) trip. */
function ppApplyPlace_(ss, cc, tz) {
  cc = String(cc || '').toUpperCase(); tz = String(tz || '');
  const P = PP_PLACES[cc]; if (!P && cc !== 'XX') throw new Error('badcountry');
  // somewhere else: any real time zone name; money is counted in the home currency
  if (P) tz = P[2].indexOf(tz) >= 0 ? tz : P[2][0];
  else if (!/^(Africa|America|Antarctica|Asia|Atlantic|Australia|Europe|Indian|Pacific)\/[A-Za-z0-9_+\-\/]{2,40}$/.test(tz)) throw new Error('badtimezone');
  const cur = P ? P[1] : String(named(ss, 'HomeCur') || 'USD').trim();
  const oldCur = String(named(ss, 'LocalCur') || '').trim(), oldTz = ss.getSpreadsheetTimeZone();
  ss.setSpreadsheetTimeZone(tz);
  const dv = SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(CUR), true).setAllowInvalid(false).build();
  ['HomeCur', 'LocalCur'].forEach(n => { const r = ss.getRangeByName(n); if (r) r.setDataValidation(dv); });   // copies carry an older currency list
  const lc = ss.getRangeByName('LocalCur'), ls = ss.getRangeByName('LocalSym');
  if (lc) lc.setValue(cur);
  if (ls) ls.setValue(sym(cur).trim() || cur);
  const loc = ss.getRangeByName('Locations');
  if (loc) {   // places that still follow the trip (blank, or the old trip currency/zone) move with it; a place set to its own country keeps it
    const v = loc.getValues(), cols = loc.offset(0, 4, v.length, 2), same = (x, old) => !String(x).trim() || String(x).trim() === old;
    cols.setValues(v.map(r => String(r[1]).trim() ? [same(r[4], oldCur) ? cur : r[4], same(r[5], oldTz) ? tz : r[5]] : [r[4], r[5]]));
  }
  ppProps_().setProperty(ppK_('pp_place'), JSON.stringify({cc: cc}));
  return tz;
}
/* Trip creator changes the country of the open trip (for trips made before countries existed). */
function ppSetPlace_(a) {
  if (!__PP_TRIP) throw new Error('notallowed');   // the original trip is the template for every new trip: leave it alone
  const ss = srvSS_(), lock = ppLock_(); lock.waitLock(20000);
  try { ppApplyPlace_(ss, a.country, a.tz); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  CacheService.getScriptCache().remove(ppK_('ppc_facts'));
  return ppPlace_(ss);
}

/* ============================ web app ============================ */
function legacyDoGet_() {
  return HtmlService.createTemplateFromFile('penpenApp').evaluate()
    .setTitle('penpen')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
}

function ppEmail_() { try { return String(ppSrvUser_().getEmail() || '').toLowerCase(); } catch (e) { return ''; } }
function ppTz_(ss) { return ss.getSpreadsheetTimeZone() || 'Asia/Manila'; }
function ppDay_(d, tz) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); }
function ppStrip_(s) { return String(s || '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim(); }

/* ============================ trip facts ============================ */
function ppTrip_(ss) {
  const tz = ppTz_(ss), now = new Date(), today = ppDay_(now, tz);
  const s = named(ss, 'TripStart'), e = named(ss, 'TripEnd');
  const start = s instanceof Date ? ppDay_(s, tz) : '', end = e instanceof Date ? ppDay_(e, tz) : '';
  const dayMs = 86400000, d0 = s instanceof Date ? Math.round((new Date(today) - new Date(start)) / dayMs) : null;
  const len = (s instanceof Date && e instanceof Date) ? Math.round((new Date(end) - new Date(start)) / dayMs) + 1 : null;
  let status = 'none', label = Utilities.formatDate(now, tz, 'EEE, MMM d');
  if (d0 !== null) {
    if (d0 < 0) { status = 'before'; label += ' · ' + (-d0) + (d0 === -1 ? ' day to go' : ' days to go'); }
    else if (d0 >= len) { status = 'after'; label += ' · trip done'; }
    else { status = 'during'; label += ' · Day ' + (d0 + 1) + ' of ' + len; }
  }
  return {tz: tz, now: now, today: today, start: start, end: end, status: status, label: label, daysTo: d0 !== null ? -d0 : null,
    hour: Number(Utilities.formatDate(now, tz, 'H')), name: String(named(ss, 'TripName') || '')};
}

function ppLocations_(ss) {
  const r = ss.getRangeByName('Locations'); if (!r) return [];
  const tz = ppTz_(ss);
  return r.getValues().filter(x => String(x[1]).trim()).map(x => ({place: String(x[1]).trim(),
    from: x[2] instanceof Date ? ppDay_(x[2], tz) : '', to: x[3] instanceof Date ? ppDay_(x[3], tz) : '',
    cur: String(x[4] || ''), tz: String(x[5] || ''), notes: String(x[6] || '')}));
}

function ppLocationFor_(ss, day) {
  const L = ppLocations_(ss); if (!L.length) return null;
  let hit = null;
  L.forEach(l => { if (l.from && l.from <= day && (!l.to || day <= l.to)) hit = l; });
  return hit;
}


function ppBookings_(ss, days) {
  const sh = ss.getSheetByName(BOOK); if (!sh || sh.getLastRow() < 2) return [];
  const tz = ppTz_(ss);
  return sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues().filter(r => r[3] !== '').map(r => ({
    day: r[0] instanceof Date ? ppDay_(r[0], tz) : String(r[0]), type: String(r[2] || ''), what: String(r[3] || ''), details: String(r[4] || ''), status: String(r[6] || '')}))
    .filter(b => !days || days.indexOf(b.day) >= 0);
}

/* ============================ weather (Open-Meteo, no key) ============================ */
function ppWeather_(ss, loc) {
  if (!loc) return null;
  const cc = (loc.cur && ppCcForCur_(loc.cur)) || ppPlace_(ss).cc, cache = CacheService.getScriptCache(), key = 'pp_wx_' + cc + '_' + loc.place;
  const hit = cache.get(key); if (hit) return JSON.parse(hit);
  try {
    const props = PropertiesService.getScriptProperties();
    let geo = props.getProperty('pp_geo_' + cc + '_' + loc.place);
    if (!geo) {
      const res = UrlFetchApp.fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&name=' + encodeURIComponent(loc.place), {muteHttpExceptions: true});
      const list = (JSON.parse(res.getContentText()).results || []);
      const g = list.find(x => cc && x.country_code === cc) || list[0];
      if (!g) return null;
      geo = JSON.stringify({lat: g.latitude, lon: g.longitude});
      props.setProperty('pp_geo_' + cc + '_' + loc.place, geo);
    }
    const p = JSON.parse(geo);
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon +
      '&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2';
    const w = JSON.parse(UrlFetchApp.fetch(url, {muteHttpExceptions: true}).getContentText());
    const code = w.current.weather_code, out = {place: loc.place, temp: Math.round(w.current.temperature_2m), code: code, label: ppWxLabel_(code),
      max: Math.round(w.daily.temperature_2m_max[0]), min: Math.round(w.daily.temperature_2m_min[0]), rain: w.daily.precipitation_probability_max[0],
      tomorrow: {code: w.daily.weather_code[1], label: ppWxLabel_(w.daily.weather_code[1]), max: Math.round(w.daily.temperature_2m_max[1]), rain: w.daily.precipitation_probability_max[1]}};
    cache.put(key, JSON.stringify(out), 1800);
    return out;
  } catch (e) { console.warn('weather: ' + e); return null; }
}
function ppWxLabel_(c) {
  if (c === 0) return 'sunny'; if (c === 1) return 'mostly sunny'; if (c === 2) return 'partly cloudy'; if (c === 3) return 'cloudy';
  if (c === 45 || c === 48) return 'foggy'; if (c >= 51 && c <= 57) return 'drizzle'; if (c >= 61 && c <= 67) return 'rainy';
  if (c >= 71 && c <= 77) return 'snowy'; if (c >= 80 && c <= 82) return 'showers'; if (c >= 85 && c <= 86) return 'snow showers'; if (c >= 95) return 'stormy';
  return '';
}
function ppIsRain_(c) { return (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95; }

function ppMood_(trip, wx, plan) {
  const h = trip.hour, p = String(plan || '').toLowerCase();
  if (h >= 22 || h < 5) return 'sleep';
  if (wx && ppIsRain_(wx.code)) return 'rain';
  if (wx && wx.temp < 20) return 'cold';
  if (trip.status === 'during' && /\b(boat|ferry|flight|fly|flies|airport|lands?|check out|travel)\b/.test(p)) return 'travel';
  if (trip.status === 'before' && trip.daysTo !== null && trip.daysTo <= 3) return 'excited';
  if (trip.status === 'during' && /\b(beach|island|snorkel|whale|swim|dive|canyoneering|falls|free day)\b/.test(p)) return 'beach';
  if (wx && (wx.code === 2 || wx.code === 3 || wx.code === 45 || wx.code === 48)) return 'cloudy';
  if (wx && wx.code <= 1) return 'sunny';
  return 'happy';
}

/* ============================ greeting ============================ */
function penpenHello() {
  const ss = ss_(), trip = ppTrip_(ss), ctx = getCtx(ss), me = getSpeaker(ctx, ppEmail_());
  const itin = ppItinerary_(ss);
  const tomorrow = ppDay_(new Date(trip.now.getTime() + 86400000), trip.tz);
  const todayPlan = itin.find(i => i.day === trip.today), nextPlan = itin.find(i => i.day === tomorrow);
  let loc = trip.status === 'during' ? ppLocationFor_(ss, trip.today) : null;
  if (!loc) { const L = ppLocations_(ss); loc = L[0] || null; }
  const wx = ppWeather_(ss, loc);
  const h = trip.hour;
  const hi = (h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ' + (me || 'friend') + '!';
  const act = p => { const m = String(p || '').match(/:\s*([^.;]+)/); return (m ? m[1] : String(p || '').split(/[.;]/)[0]).replace(/\s*\+\s*/g, ' and ').trim(); };
  let line = '';
  if (trip.status === 'before') line = trip.daysTo + (trip.daysTo === 1 ? ' day' : ' days') + ' until ' + (trip.name.split('·').pop().trim() || 'the trip') + '! Tell me any expense, or ask me anything.';
  else if (trip.status === 'after') line = 'Welcome home! Want to see who owes who?';
  else if (trip.status === 'during') {
    if (h >= 22 || h < 5) line = 'Time to rest.' + (nextPlan ? ' Tomorrow: ' + act(nextPlan.plan) + '.' : '');
    else if (h < 11) line = todayPlan ? 'Today: ' + act(todayPlan.plan) + '.' : 'Free day today — what are we doing?';
    else if (h < 17) line = todayPlan ? 'How was ' + act(todayPlan.plan).toLowerCase() + '? Tell me what you spent.' : 'How’s the day going? Tell me what you spent.';
    else line = 'What’s for dinner? Tell me and I’ll log it.';
  } else line = 'Tell me what you spent, or ask me anything.';
  if (wx) {
    if (ppIsRain_(wx.code) || wx.rain >= 60) line += ' Bring an umbrella!';
    else if (wx.max >= 31) line += ' It’s hot — sunscreen and water!';
  }
  return {name: me || '', hi: hi, line: line, label: trip.label, mood: ppMood_(trip, wx, todayPlan && todayPlan.plan),
    weather: wx ? {place: wx.place, temp: wx.temp, label: wx.label} : (loc ? {place: loc.place} : null),
    trip: trip.name, chips: ['Who owes who?', 'What’s the plan today?', 'Lunch 450 ' + curWord(ctx.local) + ', I paid', 'Undo']};
}

/* ============================ the brain ============================ */
function ppGemini_(prompt) {
  const props = PropertiesService.getScriptProperties();
  const key = String(props.getProperty('GEMINI_API_KEY') || '').trim().replace(/^["'\s]+|["'\s]+$/g, '');
  if (!key) return null;
  const models = [...new Set([props.getProperty('PENPEN_MODEL') || 'gemini-flash-lite-latest', 'gemini-flash-latest'])];
  for (const model of models) {
    try {
      const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: {'x-goog-api-key': key},
        payload: JSON.stringify({contents: [{parts: [{text: prompt}]}], generationConfig: {temperature: 0.2, responseMimeType: 'application/json'}})
      });
      if (res.getResponseCode() !== 200) { console.warn('Gemini ' + model + ' → ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300)); continue; }
      const body = JSON.parse(res.getContentText());
      return JSON.parse(body.candidates[0].content.parts.map(p => p.text || '').join(''));
    } catch (err) { console.warn('Gemini ' + model + ' failed: ' + err); }
  }
  return null;
}

function ppExpenseRows_(ss) {
  const sh = ss.getSheetByName(EXP), n = nextRow(sh) - FR;
  if (n < 1) return [];
  return sh.getRange(FR, 1, n, PX.entry).getDisplayValues().map((r, i) => ({row: i + FR, date: r[0], what: r[1], cat: r[2], amt: r[3], cur: r[4],
    by: r[5], forr: r[6], paid: r[7], notes: r[8], status: r[9], entry: r[10]})).filter(r => r.what || r.amt);
}

function ppJustMe_(ss) {
  const d = ss.getSheetByName(DASH), B = d.getRange(1, 2, d.getMaxRows(), 1).getDisplayValues().map(r => String(r[0]).trim());
  const r0 = B.findIndex(x => x.indexOf('Just me') === 0);
  if (r0 < 0) return '';
  const v = d.getRange(r0 + 2, 2, 14, 8).getDisplayValues();
  const names = v[0].slice(2).filter(String);
  return v.slice(1).filter(r => r[0]).map(r => r[0] + ': ' + names.map((n, i) => n + ' ' + r[2 + i]).join(', ')).join('\n');
}

function ppPrompt_(ss, text, ctx, me, trip) {
  const itin = ppItinerary_(ss), locs = ppLocations_(ss);
  const tomorrow = ppDay_(new Date(trip.now.getTime() + 86400000), trip.tz);
  const loc = ppLocationFor_(ss, trip.today) || locs[0] || null, wx = ppWeather_(ss, loc);
  const ex = ppExpenseRows_(ss).slice(-80);
  const pr = ss.getRangeByName('PocketLeft');
  return [
    'You are penpen, a cheerful penguin travel buddy inside a trip-expense app. Decide what the user wants and answer ONLY with JSON.',
    'Now: ' + Utilities.formatDate(trip.now, trip.tz, 'EEE yyyy-MM-dd HH:mm') + ' (' + trip.tz + '). Trip: ' + trip.name + ', ' + trip.start + ' to ' + trip.end + ' (' + trip.label + ').',
    'Travelers: ' + ctx.names.join(', ') + '. The speaker ("I", "me", "my") is: ' + (me || 'unknown') + '.',
    'Trip country: ' + (ppPlace_(ss).name || 'unknown') + '. Currencies: home ' + ctx.home + ', local ' + ctx.local + '. ' + ppCurSay_(ctx) + '. If no currency is said, use ' + ((loc && loc.cur) || ctx.local) + '.',
    '',
    'EXPENSES (row | date | what | category | amount | currency | paid by | for | paid? | status):',
    ex.map(r => 'r' + r.row + ' | ' + [r.date, r.what, r.cat, r.amt, r.cur, r.by || '-', r.forr, r.paid, r.status].join(' | ')).join('\n') || '(none yet)',
    'Who owes who: ' + String(settleText_() || '').replace(/\n/g, '; ') + '. Pocket money left: ' + (pr ? pr.getDisplayValue() : '?') + '.',
    'Spent on each person (personal + share of shared + covered):', ppJustMe_(ss),
    'The speaker’s own spending (only share it with the speaker): ' + (me ? JSON.stringify(ppMe_(ss, me), (k, v) => typeof v === 'number' ? Math.round(v) : v) : 'unknown') + '.',
    '',
    'LOCATIONS: ' + locs.map(l => l.place + ' ' + l.from + '→' + l.to + (l.notes ? ' (' + l.notes + ')' : '')).join('; '),
    'PLAN STOPS (id | date | time | what | place | notes):', ppStops_(ss).map(s => 'p' + s.row + ' | ' + [s.day, s.time || '-', s.what, s.place, s.notes].join(' | ')).join('\n'),
    'CONTACTS (type | name | for | person | phone | messenger | email | notes): ' + ppContacts_(ss).map(c => [c.type, c.name, c.forr, c.person, c.phone, c.msg, c.email, c.notes].join(' | ')).join('; '),
    'BOOKINGS today/tomorrow: ' + ppBookings_(ss, [trip.today, tomorrow]).map(b => b.day + ' ' + b.type + ' ' + b.what + ' ' + b.details + ' [' + b.status + ']').join('; '),
    'WEATHER: ' + (wx ? wx.place + ' now ' + wx.temp + '°C ' + wx.label + ', today ' + wx.min + '–' + wx.max + '°C, rain chance ' + wx.rain + '%; tomorrow ' + wx.tomorrow.label + ' ' + wx.tomorrow.max + '°C, rain ' + wx.tomorrow.rain + '%' : 'unknown'),
    '',
    'Return {"actions":[...], "reply":"..."} using these action types:',
    '- {"type":"add","expenses":[{"item":"","category":"","currency":"' + ctx.local + '","total":0,"payers":{"Name":0},"split":"Shared","date":"YYYY-MM-DD","quote":"","from_pocket":false,"not_paid_yet":false}]}',
    '   Only real purchases with an amount. One record per separate purchase; never merge items or invent amounts. Ignore the story around it.',
    '   payers: who paid and how much, using traveler names (speaker unknown → key "I"); {} if nobody said. split: "Shared" (default), "<Name> only" if it was only for one person (also when someone paid for another person), or "EACH" if each paid their own.',
    '   category: exactly one of: ' + expCats_().join(' | ') + '. item: short clean label like "Lunch at Jollibee" (fix speech-to-text misspellings).',
    '   from_pocket: true if paid from the pocket money / pot / kitty. not_paid_yet: true if it will be paid later.',
    '- {"type":"edit","row":N,"changes":{"what":"","amount":0,"currency":"","date":"YYYY-MM-DD","category":"","paid_by":"Name or Pocket money","for":"Shared or Name","paid":"Paid|Not yet|Paid back","notes":""}}',
    '   Change ONE existing row; include only fields that change. "that was Brad" / "Brad paid for that" = paid_by on the most recent row with no payer.',
    '   "Brad paid me back for the Grab" = paid "Paid back" on that covered row. "the tour balance is paid now" = paid "Paid".',
    '- {"type":"delete","row":N}',
    '- {"type":"plan_add","date":"YYYY-MM-DD","time":"7:00 PM or empty","what":"","place":"exact name + town, e.g. Larsian BBQ, Cebu City","notes":""}  add a stop to the trip plan (not an expense).',
    '- {"type":"plan_edit","id":"p12","changes":{"date":"YYYY-MM-DD","time":"","what":"","place":"","notes":""}}  change one plan stop; include only changed fields.',
    '- {"type":"plan_delete","id":"p12"}  remove a plan stop.',
    '- {"type":"contact","name":"Harolds Hotel","changes":{"type":"Hotel|Tour|Transport|Emergency|Other","for":"traveler (emergency contacts only)","person":"","phone":"","messenger":"","email":"","place":"","notes":""}}  save or update a contact (hotel, tour guide, emergency contact…); reuse the existing contact name when it matches; only changed fields.',
    '- {"type":"undo"}  (undo / cancel the last thing penpen did)',
    '- {"type":"settle","from":"Name","to":"Name","amount":0,"currency":"' + ctx.local + '"}  someone paid someone back money directly (not one specific covered item).',
    '- {"type":"pocket","who":"Name","amount":0,"currency":"' + ctx.local + '"}  money put INTO the shared pocket money pot.',
    '- {"type":"remind","to":"Name","message":"","when":"now"}  email reminder. "when" = "now" or "YYYY-MM-DD HH:mm" local time. "remind me" → to = the speaker.',
    '   Write "message" as a short friendly note to that person, e.g. "Hi Brad! Friendly reminder: you owe Kate ₱320 for the Grab. 🐧"',
    '- {"type":"answer"}  for questions and chat: answer in "reply" using the data above (balances, plans, weather, spending, ideas for food or things to do nearby).',
    'Use only rows listed above. If you are not sure which row or what they mean, use "answer" and ask a short question.',
    '"reply": 1–2 short warm sentences in simple English from penpen (no penguin noises like squawk). Never say a change is done — edits, deletes and emails wait for the user to tap Yes. For add/edit/delete/settle/pocket/remind keep it very short (the app shows the details) or empty.',
    '',
    'User says: ' + text
  ].join('\n');
}

/* ============================ ask / confirm / undo ============================ */
function penpenAsk(text) {
  text = String(text || '').trim();
  if (!text) throw new Error('Say or type something first.');
  const ss = ss_(), email = ppEmail_(), ctx = getCtx(ss), me = getSpeaker(ctx, email), trip = ppTrip_(ss);
  if (/^\s*(undo|undo (?:that|it|last)|cancel last|take (?:that|it) back)\s*[.!]?\s*$/i.test(text)) return penpenUndo();
  if (PP_DIARY_RE.test(text)) return ppDiaryAsk_(text);
  const plan = ppGemini_(ppPrompt_(ss, text, ctx, me, trip));
  if (!plan || !Array.isArray(plan.actions)) return ppFallback_(ss, text, email);
  const out = {replies: [], mood: 'happy'};
  let asked = false;
  plan.actions.forEach(a => {
    try {
      const r = ppDo_(ss, ctx, me, email, trip, a, text, asked);
      if (r.confirm) { asked = true; out.confirm = r.confirm; out.mood = 'concierge'; }
      if (r.text) out.replies.push(r.text);
      if (r.mood && !out.confirm) out.mood = r.mood;
      if (r.changed) out.changed = true;
    } catch (e) { out.replies.push('⚠️ ' + e.message); out.mood = 'cloudy'; }
  });
  const reply = String(plan.reply || '').trim();
  if (reply && !out.confirm && (!out.replies.length || plan.actions.every(a => a.type === 'answer'))) out.replies.unshift(reply);
  if (!out.replies.length && !out.confirm) out.replies.push('Hmm, I’m not sure what to do with that. Try “Lunch 450 ' + curWord(ctx.local) + ', I paid” or ask me a question.');
  return out;
}

function ppFallback_(ss, text, email) {
  const ctx = getCtx(ss), lock = ppLock_();
  const who = parseSettle(text, ctx);
  if (!who && !findAmounts(text, ctx).length) return {replies: ['My brain (Gemini) is taking a nap right now 😴 I can still add expenses and undo — try again in a minute for questions.'], mood: 'sleep'};
  lock.waitLock(25000);
  try {
    PP_TRACK = [];
    const msg = who ? settleLast(ss, ctx, who, email) : splitExpenses(text, ctx).map(c => addExpense(ss, ctx, c, email, inferSpeaker(text, ctx))).join(' | ');
    if (PP_TRACK.length) ppPushUndo_({t: 'add', rows: PP_TRACK.slice(), whats: PP_TRACK.map(r => String(ss.getSheetByName(EXP).getRange(r, PX.what).getValue()))});
    return {replies: msg.split(' | '), mood: 'happy', changed: true};
  } finally { PP_TRACK = null; SpreadsheetApp.flush(); lock.releaseLock(); }
}

function ppDo_(ss, ctx, me, email, trip, a, text, asked) {
  const type = String(a.type || '');
  if (type === 'answer') return {mood: 'happy'};
  if (type === 'undo') { const u = penpenUndo(); return {text: u.replies.join(' '), changed: true}; }
  if (type === 'add') return ppAdd_(ss, ctx, me, email, trip, a.expenses || [], text);
  if (type === 'pocket') return ppPocket_(ss, ctx, me, a);
  if (type === 'settle') return ppSettle_(ss, ctx, me, email, trip, a);
  if (type === 'plan_add') return ppPlanAdd_(ss, a);
  if (asked) return {text: '(One change at a time — ask me again after this one.)'};
  if (type === 'edit') return ppEditAsk_(ss, ctx, me, a);
  if (type === 'delete') return ppDeleteAsk_(ss, a);
  if (type === 'remind') return ppRemindAsk_(ss, ctx, me, a);
  if (type === 'plan_edit') return ppPlanEditAsk_(ss, a);
  if (type === 'plan_delete') return ppPlanDeleteAsk_(ss, a);
  if (type === 'contact') return ppContactAsk_(ss, a);
  return {};
}

function ppWho_(ctx, me, n) {
  n = String(n || '').trim();
  if (!n) return '';
  if (/^(i|me|my|myself)$/i.test(n)) return me || '';
  if (/^pocket/i.test(n)) return POCKET;
  return ctx.names.indexOf(n) >= 0 ? n : (ctx.alias[n.toLowerCase()] || '');
}
function ppCur_(ctx, c, trip, ss) {
  c = String(c || '').toUpperCase();
  if (c === ctx.home || c === ctx.local) return c;
  const loc = ppLocationFor_(ss, trip.today);
  return (loc && (loc.cur === ctx.home || loc.cur === ctx.local)) ? loc.cur : ctx.local;
}

function ppAdd_(ss, ctx, me, email, trip, list, text) {
  if (!list.length) return {text: 'I didn’t hear an amount — try “Taxi 250 ' + curWord(ctx.local) + ', I paid”.'};
  const lock = ppLock_(); lock.waitLock(25000);
  try {
    PP_TRACK = [];
    const msgs = list.map(e => {
      const x = aiToExpense(e, ctx, me);
      if (!x) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) x.date = e.date;
      if (!x.cur) { x.cur = ppCur_(ctx, e.currency, trip, ss); x.assumedCur = true; }
      x.fromPot = e.from_pocket === true; x.notYet = e.not_paid_yet === true;
      return addExpense(ss, ctx, x.raw || text, email, null, x) + (x.assumedCur ? ' (I assumed ' + x.cur + ')' : '');
    }).filter(String);
    if (PP_TRACK.length) {
      const sh = ss.getSheetByName(EXP);
      ppPushUndo_({t: 'add', rows: PP_TRACK.slice(), whats: PP_TRACK.map(r => String(sh.getRange(r, PX.what).getValue()))});
    }
    return {text: msgs.join('\n'), mood: msgs.some(m => /^⚠️/.test(m)) ? 'cloudy' : 'excited', changed: true};
  } finally { PP_TRACK = null; SpreadsheetApp.flush(); lock.releaseLock(); }
}

function ppPocket_(ss, ctx, me, a) {
  const who = ppWho_(ctx, me, a.who), amt = Number(a.amount) || 0;
  if (!who || who === POCKET) return {text: 'Who put the money in? Say “I put 2,000 ' + curWord(ctx.local) + ' in the pocket money”.'};
  if (!(amt > 0)) return {text: 'How much went into the pocket money?'};
  const cur = String(a.currency || '').toUpperCase() === ctx.home ? ctx.home : ctx.local;
  const p = ss.getSheetByName(PM), lock = ppLock_(); lock.waitLock(25000);
  try {
    const v = p.getRange(3, 1, p.getMaxRows() - 2, 3).getValues();
    let row = 3; v.forEach((r, i) => { if (r.some(c => c !== '')) row = i + 4; });
    p.getRange(row, 1, 1, 5).setValues([[ppDay_(new Date(), ppTz_(ss)), who, amt, cur, '🎤 added by penpen']]);
    SpreadsheetApp.flush();
    ppPushUndo_({t: 'pocket', row: row, who: who, amt: amt});
    ppLog_('Pocket money', who + ' put money in', money(amt, cur));
    return {text: '👛 ' + who + ' put ' + money(amt, cur) + ' in the pocket money. Left now: ' + ss.getRangeByName('PocketLeft').getDisplayValue() + '.', mood: 'excited', changed: true};
  } finally { lock.releaseLock(); }
}

function ppSettle_(ss, ctx, me, email, trip, a) {
  const from = ppWho_(ctx, me, a.from), to = ppWho_(ctx, me, a.to), amt = Number(a.amount) || 0;
  if (!from || !to || from === to || from === POCKET || to === POCKET) return {text: 'Who paid who back? Say “I paid ' + (ctx.names.find(n => n !== me) || 'them') + ' back 3,500 ' + curWord(ctx.local) + '”.'};
  if (!(amt > 0)) return {text: 'How much was paid back?'};
  const cur = ppCur_(ctx, a.currency, trip, ss), lock = ppLock_(); lock.waitLock(25000);
  try {
    PP_TRACK = [];
    writeRow(ss, ss.getSheetByName(EXP), {date: trip.today, what: from + ' paid ' + to + ' back', cat: 'Settle up', cur: cur, total: amt, by: from, forr: to, paid: 'Paid', notes: '🎤 settle up', email: email});
    ppPushUndo_({t: 'add', rows: PP_TRACK.slice(), whats: [from + ' paid ' + to + ' back']});
    SpreadsheetApp.flush();
    return {text: '💸 Got it: ' + from + ' paid ' + to + ' back ' + money(amt, cur) + '. Now: ' + String(settleText_()).replace(/\n/g, '; '), mood: 'excited', changed: true};
  } finally { PP_TRACK = null; lock.releaseLock(); }
}

/* ---- edit ---- */
const PP_FIELDS = {date: [PX.date, 'Date'], what: [PX.what, 'What'], category: [PX.cat, 'Category'], amount: [PX.amt, 'Amount'], currency: [PX.cur, 'Currency'],
  paid_by: [PX.by, 'Paid by'], for: [PX.forr, 'For'], paid: [PX.paid, 'Paid?'], notes: [PX.notes, 'Notes']};

function ppRowCheck_(ss, row) {
  const sh = ss.getSheetByName(EXP), last = nextRow(sh) - 1;
  row = Number(row);
  if (!(row >= FR && row <= last)) throw new Error('I couldn’t find that entry. Which one do you mean?');
  const r = sh.getRange(row, 1, 1, PX_USER).getDisplayValues()[0];
  if (!r[1] && !r[3]) throw new Error('That row is empty. Which entry do you mean?');
  return r;
}

function ppEditAsk_(ss, ctx, me, a) {
  const r = ppRowCheck_(ss, a.row), ch = a.changes || {}, set = [], lines = [];
  Object.keys(ch).forEach(k => {
    if (!PP_FIELDS[k]) return;
    let v = ch[k];
    if (k === 'amount') { v = Number(String(v).replace(/[^\d.]/g, '')); if (!(v > 0)) throw new Error('That amount doesn’t look right.'); }
    if (k === 'currency') { v = String(v).toUpperCase(); if (v !== ctx.home && v !== ctx.local) throw new Error('Currency must be ' + ctx.local + ' or ' + ctx.home + '.'); }
    if (k === 'category' && expCats_().indexOf(v) < 0) throw new Error('Category must be one of: ' + expCats_().join(', '));
    if (k === 'paid_by') { v = v === '' ? '' : ppWho_(ctx, me, v); if (v === '' && ch[k] !== '') throw new Error('Who paid? Use a traveler’s name or “Pocket money”.'); }
    if (k === 'for') { v = /^shared$/i.test(v) ? 'Shared' : ppWho_(ctx, me, v); if (!v || v === POCKET) throw new Error('“For” must be Shared or a traveler’s name.'); }
    if (k === 'paid') { v = PAID_OPTS.find(o => o.toLowerCase() === String(v).toLowerCase()); if (!v) throw new Error('Paid? must be Paid, Not yet or Paid back.'); }
    if (k === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Error('I need the date like 2026-12-05.');
    const col = PP_FIELDS[k][0], before = r[col - 1];
    const shown = k === 'amount' ? fmt(v) : k === 'date' ? Utilities.formatDate(new Date(v + 'T12:00:00'), 'UTC', 'EEE, MMM d') : String(v);
    if (String(before) === shown) return;
    set.push([col, v]);
    lines.push({label: PP_FIELDS[k][1], from: before || '—', to: shown || '—'});
  });
  if (!set.length) return {text: 'That entry already looks like that 🙂'};
  const id = ppPending_({t: 'edit', row: Number(a.row), what: r[1], amt: r[3], set: set});
  return {confirm: {id: id, kicker: 'CHANGE THIS?', title: r[1] + ' · ' + r[0], lines: lines, yes: 'Yes, change it', no: 'No'}};
}

function ppDeleteAsk_(ss, a) {
  const r = ppRowCheck_(ss, a.row);
  const id = ppPending_({t: 'delete', row: Number(a.row), what: r[1], amt: r[3]});
  return {confirm: {id: id, kicker: 'DELETE THIS?', title: r[1], lines: [{label: '', from: '', to: r[3] + ' ' + r[4] + ' · ' + r[0] + (r[5] ? ' · ' + r[5] + ' paid' : '')}], yes: 'Yes, delete it', no: 'No, keep it', danger: true}};
}

/* ---- remind ---- */
function ppRemindAsk_(ss, ctx, me, a) {
  const to = ppWho_(ctx, me, a.to);
  if (!to || to === POCKET) return {text: 'Who should I remind?'};
  const p = ctx.people.find(x => x.name === to), email = p && p.email;
  if (!email) return {text: 'I don’t have ' + to + '’s email yet — add it on the Trip Details tab, then ask me again.'};
  const msg = String(a.message || '').trim();
  if (!msg) return {text: 'What should the reminder say?'};
  const when = String(a.when || 'now');
  const later = /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}$/.test(when);
  const id = ppPending_({t: 'remind', to: to, email: email, msg: msg, when: later ? when : 'now', from: me || ''});
  return {confirm: {id: id, kicker: later ? 'SCHEDULE THIS EMAIL?' : 'SEND THIS EMAIL?', title: 'To ' + to + (later ? ' · ' + when : ' · now'),
    lines: [{label: '', from: '', to: msg}], yes: later ? 'Yes, schedule it' : 'Yes, send it', no: 'No'}};
}

function ppSendMail_(to, from, msg) {
  MailApp.sendEmail({to: to, subject: '🐧 penpen reminder' + (from ? ' from ' + from : ''), name: 'penpen',
    body: msg + '\n\n— penpen, your trip buddy' + (WEB_URL ? '\n' + WEB_URL : '')});
}

/* ---- pending + confirm ---- */
function ppPending_(obj) {
  const id = Utilities.getUuid().slice(0, 8);
  CacheService.getUserCache().put(ppK_('pp_p_') + id, JSON.stringify(obj), 900);
  return id;
}

function penpenConfirm(id, yes) {
  const cache = CacheService.getUserCache(), raw = cache.get(ppK_('pp_p_') + id);
  if (!raw) return {replies: ['That question timed out — say it again and I’ll ask once more.'], mood: 'cloudy'};
  cache.remove(ppK_('pp_p_') + id);
  const p = JSON.parse(raw);
  if (p.t === 'diary') { const d = penpenDiaryAdd({text: p.text, kind: yes ? 'group' : 'me'}); return {replies: [d.msg], mood: 'happy', diary: d.url}; }
  if (!yes) return {replies: [p.t === 'remind' ? 'Okay, no email sent.' : 'Okay, I left it as it was.'], mood: 'happy'};
  const ss = ss_();
  if (String(p.t).indexOf('plan_') === 0) return ppPlanConfirm_(p);
  if (p.t === 'contact') return ppContactConfirm_(p);
  if (p.t === 'remind') {
    if (p.when === 'now') { ppSendMail_(p.email, p.from, p.msg); return {replies: ['📧 Sent to ' + p.to + '!'], mood: 'excited'}; }
    const r = ss.getSheetByName(PP_REM);
    if (!r) throw new Error('Reminders aren’t set up yet.');
    r.appendRow([p.when, p.to, p.email, p.msg, p.from, 'pending', new Date()]);
    return {replies: ['⏰ Scheduled: I’ll email ' + p.to + ' at ' + p.when + '.'], mood: 'concierge'};
  }
  const sh = ss.getSheetByName(EXP), lock = ppLock_(); lock.waitLock(25000);
  try {
    const row = ppFindRow_(sh, p.row, p.what, p.amt);
    if (!row) return {replies: ['That entry changed in the meantime — tell me again what to fix.'], mood: 'cloudy'};
    const before = sh.getRange(row, 1, 1, PX_USER).getValues()[0];
    if (p.t === 'edit') {
      p.set.forEach(s => sh.getRange(row, s[0]).setValue(s[1]));
      ppLog_('Edited', p.what, p.set.map(s => ['', 'Date', 'What', 'Category', 'Amount', 'Currency', 'Paid by', 'For', 'Paid?', 'Notes'][s[0]] + ': ' + before[s[0] - 1] + ' → ' + s[1]).join(' · '));
      SpreadsheetApp.flush();
      ppPushUndo_({t: 'edit', row: row, before: before, what: String(sh.getRange(row, PX.what).getValue())});
      const st = sh.getRange(row, PX.status, 1, 2).getDisplayValues()[0];
      return {replies: ['Done! ' + sh.getRange(row, PX.what).getDisplayValue() + ' · ' + sh.getRange(row, PX.amt).getDisplayValue() + ' ' + sh.getRange(row, PX.cur).getDisplayValue() + ' — ' + st[0] + (st[1] ? ' (' + st[1] + ')' : '')], mood: 'excited', changed: true};
    }
    if (p.t === 'delete') {
      const tail = sh.getRange(row, PX.rate, 1, 3).getValues()[0];
      sh.deleteRow(row);
      ppLog_('Deleted', before[1], before[3] + ' ' + before[4] + (before[5] ? ' · ' + before[5] + ' paid' : ''));
      ppPushUndo_({t: 'delete', vals: before, tail: tail, what: String(before[1])});
      return {replies: ['🗑 Deleted ' + before[1] + '. Say “undo” if that was a mistake.'], mood: 'happy', changed: true};
    }
  } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
  return {replies: ['Done.']};
}

function ppFindRow_(sh, row, what, amt) {
  const last = nextRow(sh) - 1;
  const ok = r => r >= FR && r <= last && sh.getRange(r, PX.what).getDisplayValue() === what && (amt === undefined || sh.getRange(r, PX.amt).getDisplayValue() === amt);
  if (ok(row)) return row;
  const v = sh.getRange(FR, 1, Math.max(last - FR + 1, 1), PX.amt).getDisplayValues();
  for (let i = v.length - 1; i >= 0; i--) if (v[i][1] === what && (amt === undefined || v[i][3] === amt)) return i + FR;
  return 0;
}

/* ---- undo ---- */
function ppPushUndo_(u) {
  const c = CacheService.getUserCache(), s = JSON.parse(c.get(ppK_('pp_undo')) || '[]');
  s.push(u); while (s.length > 10) s.shift();
  c.put(ppK_('pp_undo'), JSON.stringify(s), 21600);
}

function penpenUndo() {
  const c = CacheService.getUserCache(), s = JSON.parse(c.get(ppK_('pp_undo')) || '[]');
  const u = s.pop();
  if (!u) {
    const ss = ss_(), lock = ppLock_(); lock.waitLock(25000);
    try { return {replies: [undoLast(ss)], mood: 'happy', changed: true}; } finally { lock.releaseLock(); }
  }
  c.put(ppK_('pp_undo'), JSON.stringify(s), 21600);
  ppLog_('Undo', u.what || (u.whats || []).join(', ') || u.name || u.t, 'took back the last change (' + u.t + ')');
  if (String(u.t).indexOf('plan_') === 0) return ppPlanUndo_(u);
  if (u.t === 'contact') return ppContactUndo_(u);
  const ss = ss_(), sh = ss.getSheetByName(EXP), lock = ppLock_(); lock.waitLock(25000);
  try {
    if (u.t === 'add') {
      const rows = u.rows.map((r, i) => ppFindRow_(sh, r, u.whats[i])).filter(Boolean).sort((a, b) => b - a);
      rows.forEach(r => sh.deleteRow(r));
      return {replies: [rows.length ? '↩️ Removed: ' + u.whats.join(', ') : 'I couldn’t find what to undo — check Expenses.'], mood: 'happy', changed: true};
    }
    if (u.t === 'edit') {
      const row = ppFindRow_(sh, u.row, u.what);
      if (!row) return {replies: ['I couldn’t find that entry to undo — check Expenses.'], mood: 'cloudy'};
      sh.getRange(row, 1, 1, PX_USER).setValues([u.before]);
      return {replies: ['↩️ Changed back: ' + u.before[1]], mood: 'happy', changed: true};
    }
    if (u.t === 'delete') {
      const row = nextRow(sh);
      sh.getRange(row, 1, 1, PX_USER).setValues([u.vals]);
      sh.getRange(row, PX.rate, 1, 3).setValues([u.tail]);
      return {replies: ['↩️ Brought back: ' + u.what], mood: 'happy', changed: true};
    }
    if (u.t === 'pocket') {
      const p = ss.getSheetByName(PM), r = p.getRange(u.row, 2, 1, 2).getValues()[0];
      if (r[0] === u.who && Number(r[1]) === u.amt) p.deleteRow(u.row);
      return {replies: ['↩️ Took back ' + u.who + '’s pocket money entry.'], mood: 'happy', changed: true};
    }
  } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
  return {replies: ['Nothing to undo.']};
}

/* ============================ Add form data ============================ */
function penpenFormData() {
  const ss = ss_(), ctx = getCtx(ss), trip = ppTrip_(ss), loc = ppLocationFor_(ss, trip.today);
  return {people: ctx.names, curs: [...new Set([ctx.local, ctx.home])], defCur: (loc && loc.cur) || ctx.local, cats: expCats_(), today: trip.today,
    me: getSpeaker(ctx, ppEmail_()) || ''};
}

/* ============================ scheduled reminders ============================ */
function penpenSendReminders() {
  const ss = SpreadsheetApp.openById(SSID), r = ss.getSheetByName(PP_REM);
  if (!r || r.getLastRow() < 2) return;
  const tz = ppTz_(ss), now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
  const v = r.getRange(2, 1, r.getLastRow() - 1, 6).getDisplayValues();
  v.forEach((x, i) => {
    if (x[5] !== 'pending') return;
    const when = x[0].length === 15 ? x[0].replace(' ', ' 0') : x[0];   // "2026-12-05 7:00" → "2026-12-05 07:00"
    if (when > now) return;
    try { ppSendMail_(x[2], x[4], x[3]); r.getRange(i + 2, 6).setValue('sent ' + now); }
    catch (e) { r.getRange(i + 2, 6).setValue('error: ' + e.message); }
  });
}

/* ============================ Step 2 setup ============================ */
function penpenSetupStep2() {
  const ss = SpreadsheetApp.openById(SSID), log = [];
  // 1) Reminders tab (hidden) + 15-minute trigger
  let r = ss.getSheetByName(PP_REM);
  if (!r) {
    r = ss.insertSheet(PP_REM);
    r.getRange(1, 1, 1, 7).setValues([['When (local)', 'To', 'Email', 'Message', 'From', 'Status', 'Created']]).setFontWeight('bold');
    r.getRange('A:A').setNumberFormat('@');
    r.hideSheet();
    log.push('reminders tab created');
  }
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'penpenSendReminders')) {
    ScriptApp.newTrigger('penpenSendReminders').timeBased().everyMinutes(15).create();
    log.push('reminder trigger created (every 15 min)');
  }
  // 2) Quick Add → penpen tab with instructions
  const old = ss.getSheetByName('Quick Add');
  if (old) { old.setName(QA); log.push('Quick Add tab renamed to ' + QA); }
  penpenHelpTab_();
  log.push('penpen tab instructions written');
  // 3) Dashboard button label
  const d = ss.getSheetByName(DASH);
  const B = d.getRange('G2').getFormula();
  if (B) d.getRange('G2').setFormula('=HYPERLINK("' + WEB_URL + '","🐧  Talk to penpen  →")');
  log.push('dashboard button relabeled');
  console.log(log.join('\n'));
  return log.join('\n');
}

function penpenHelpTab_() {
  const ss = ss_(), q = ss.getSheetByName(QA);
  if (!q) return;
  q.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => { try { p.remove(); } catch (e) {} });
  q.getImages().forEach(i => i.remove());
  const all = q.getRange(1, 1, q.getMaxRows(), q.getMaxColumns());
  all.breakApart(); all.clear(); all.clearDataValidations(); all.clearNote();
  if (q.getMaxRows() < 60) q.insertRowsAfter(q.getMaxRows(), 60 - q.getMaxRows());
  if (q.getMaxColumns() < 6) q.insertColumnsAfter(q.getMaxColumns(), 6 - q.getMaxColumns());
  q.setHiddenGridlines(true);
  [16, 360, 260, 16, 16, 16].forEach((w, i) => q.setColumnWidth(i + 1, w));
  q.getRange(1, 1, q.getMaxRows(), q.getMaxColumns()).setFontFamily('Nunito').setFontSize(11).setFontColor('#12324A').setVerticalAlignment('middle').setBackground('#FFF7E8');
  q.setRowHeights(1, 60, 24);
  q.getRange('B2').setValue('penpen').setFontFamily('Fredoka').setFontSize(28).setFontColor('#0B7F8C');
  q.setRowHeight(2, 46);
  q.getRange('B3:C3').merge().setValue('Your trip buddy. Talk or type on your phone — penpen adds, fixes and answers. Edits always ask “Yes / No” first.')
    .setFontColor('#4F6475').setWrap(true);
  q.setRowHeight(3, 36);
  q.getRange('B5:C5').merge().setFormula('=HYPERLINK("' + WEB_URL + '","📱  Open penpen on your phone  →")')
    .setBackground('#0B7F8C').setFontColor('#FFFFFF').setFontSize(14).setHorizontalAlignment('center').setFontLine('none');
  q.setRowHeight(5, 52);
  q.getRange('B6:C6').merge().setValue('Tip: open it on your phone, then Share → Add to Home Screen. Tap 🔊 to turn penpen’s voice on or off.').setFontSize(9).setFontColor('#4F6475');
  const hctx = getCtx(ss), cw = curWord(hctx.local), cs = sym(hctx.local).trim() || hctx.local;   // the trip's currency in the examples
  const groups = [
    ['ADD MONEY STUFF', [
      ['Lunch at Jollibee 800 ' + cw + ', Brad paid', 'shared 50/50'],
      ['Smoothies 250, just for me', 'personal — not in group totals'],
      ['I paid Brad’s Grab, 320 ' + cw, 'Brad owes you ' + cs + '320'],
      ['Dinner 1,200 from pocket money', 'paid from the pot'],
      ['I put 2,000 ' + cw + ' in the pocket money', 'adds to the pot'],
      ['Tour balance 11,396, Kate will pay later', 'not paid yet']]],
    ['FIX THINGS  (penpen asks Yes / No first)', [
      ['The Jollibee lunch was 1,000, not 800', 'changes the amount'],
      ['Delete the taxi from yesterday', 'removes it'],
      ['That was Brad', 'sets who paid the last one'],
      ['Undo', 'takes back the last thing penpen did']]],
    ['SETTLE & REMIND', [
      ['I paid Brad back 3,500', 'evens out who-owes-who'],
      ['Brad paid me back for the Grab', 'marks it paid back'],
      ['Remind Brad he owes me ₱320', 'sends Brad an email'],
      ['Remind me at 7 pm to buy sunscreen', 'emails you at 7 pm']]],
    ['ASK', [
      ['Who owes who?', ''], ['What’s the plan today?', ''], ['What’s for dinner around here?', ''], ['How much did I spend?', '']]]];
  let row = 8;
  groups.forEach(g => {
    q.getRange(row, 2, 1, 2).merge().setValue(g[0]).setFontSize(9).setFontWeight('bold').setFontColor('#0B7F8C');
    q.setRowHeight(row, 30); row++;
    g[1].forEach(ex => {
      q.getRange(row, 2).setValue('“' + ex[0] + '”').setFontColor('#12324A').setBackground('#FFFFFF').setWrap(true);
      q.getRange(row, 3).setValue(ex[1] ? '→ ' + ex[1] : '').setFontColor('#4F6475').setFontSize(10).setBackground('#FFFFFF').setWrap(true);
      q.getRange(row, 2, 1, 2).setBorder(null, null, true, null, null, null, '#F0E2C6', SpreadsheetApp.BorderStyle.SOLID);
      q.setRowHeight(row, 30); row++;
    });
    row++;
  });
  q.getRange(row, 2, 1, 2).merge().setValue('Not sure? Just say it the way you’d tell a friend — penpen will ask if anything is unclear.')
    .setFontSize(10).setFontStyle('italic').setFontColor('#4F6475');
  q.setTabColor('#0B7F8C');
  q.protect().setDescription('penpen instructions').setWarningOnly(true);
}

/* ---- leftovers from the old Quick Add ---- */
function quickNow_() { return settleText_(); }
function quickRun_(fn) {
  var ss = ss_(), email = '';
  try { email = ppSrvUser_().getEmail() || ''; } catch (x) {}
  var lock = ppLock_(); lock.waitLock(25000);
  try { var msg = fn(ss, email); SpreadsheetApp.flush(); return {msg: msg, now: quickNow_()}; } finally { lock.releaseLock(); }
}
function placeQuickButtons_() {
  var SW = 124, SH = 30, db = sh_('Dashboard');
  if (!db) return;
  db.getImages().forEach(function (i) { var f = i.getScript(); if (f == 'showQuickAdd' || f == 'showAddExpense') i.remove(); });
  var wGI = db.getColumnWidth(7) + db.getColumnWidth(8) + db.getColumnWidth(9);
  var x0 = Math.max(wGI - (SW * 2 + 10) - 2, 0);
  placeAt_(db, 7, x0, 3, 4, BTN_QUICK, 'Quick add', 'showQuickAdd', SW, SH);
  placeAt_(db, 7, x0 + SW + 10, 3, 4, BTN_ADD, 'Add expense', 'showAddExpense', SW, SH);
}

/* ============================ test (run from the editor) ============================ */
function penpenTest() {
  const h = penpenHello();
  console.log('HELLO ' + JSON.stringify(h));
  const ss = ss_(), ctx = getCtx(ss), trip = ppTrip_(ss);
  const plan = ppGemini_(ppPrompt_(ss, 'who owes who and what is the plan on Dec 7?', ctx, 'Kate', trip));
  console.log('ANSWER ' + JSON.stringify(plan));
  const plan2 = ppGemini_(ppPrompt_(ss, 'the canyoneering was 4500 not 4200', ctx, 'Kate', trip));
  console.log('EDIT PLAN ' + JSON.stringify(plan2));
}

function penpenTest2() {
  const t0 = Date.now(), lap = l => console.log(l + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
  let r = penpenAsk('Test taxi 250 pesos, Kate paid'); lap('ADD ' + JSON.stringify(r));
  r = penpenUndo(); lap('UNDO ' + JSON.stringify(r));
  r = penpenAsk('the whale shark watching was 1800 not 1500'); lap('EDIT ' + JSON.stringify(r));
  if (r.confirm) { r = penpenConfirm(r.confirm.id, false); lap('CONFIRM-NO ' + JSON.stringify(r)); }
  r = penpenAsk('what should we eat in Moalboal?'); lap('ASK ' + JSON.stringify(r));
}


/* ================= penpenToday (original penpen code) ================= */
/**
 * penpen · Step 3 — Today screen (phone) + Dashboard tidy-up (sheet)
 * penpenToday() feeds the Today screen: greeting + weather + mood, next activity (boarding-pass card, countdown, Directions),
 * today's timeline, entries that need a look (with one-tap fixes), who owes who, pocket money, budget pace (group + personal),
 * and "Just me" spending with a hide-from-others switch.
 * Trip Details: C13 = group trip budget (named GroupBudget); per person F = personal budget (MyBudgets), G = hide my spending (HideMe).
 */
const PP_TIME = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i;

/* ============================ events from Bookings + Itinerary ============================ */
function ppHM_(m) {
  let h = Number(m[1]) % 12; const min = Number(m[2] || 0);
  if (/^p/i.test(m[3])) h += 12;
  return ('0' + h).slice(-2) + ':' + ('0' + min).slice(-2);
}
function ppLabelTime_(hm) {
  if (!hm) return {t: '', ap: ''};
  let h = Number(hm.slice(0, 2)); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return {t: h + ':' + hm.slice(3), ap: ap};
}
function ppMapUrl_(place) {
  return place ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(place) : '';
}

function ppEvents_(ss) {
  const tz = ppTz_(ss), out = [], country = ppPlaceName_(ss);   // ", Japan" or ''
  ppBookings_(ss).forEach(b => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.day)) return;
    const m = (b.details || '').match(PP_TIME) || (b.what || '').match(PP_TIME);
    const dest = String(b.what).split('→').pop().trim();
    out.push({day: b.day, hm: m ? ppHM_(m) : '', title: (b.type ? b.type + ' · ' : '') + b.what, sub: b.details || '', status: b.status,
      place: dest, src: 'booking'});
  });
  ppStops_(ss).forEach(s => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.day)) return;
    out.push({day: s.day, hm: s.hm, title: s.what, sub: s.place + (s.notes ? ' · ' + s.notes : ''), place: s.place, src: 'plan'});
  });
  out.forEach(e => {
    e.at = e.hm ? Utilities.parseDate(e.day + ' ' + e.hm, tz, 'yyyy-MM-dd HH:mm').getTime() : Utilities.parseDate(e.day + ' 08:00', tz, 'yyyy-MM-dd HH:mm').getTime();
    e.dir = ppMapUrl_(e.place ? e.place + country : '');
  });
  const seen = {};
  return out.sort((a, b) => a.at - b.at || (a.src === 'booking' ? -1 : 1)).filter(e => { if (!e.hm) return true; const k = e.day + e.hm; if (seen[k]) return false; seen[k] = 1; return true; });
}

/* ============================ money helpers ============================ */
function ppMe_(ss, name) {
  const ctx = getCtx(ss), k = ctx.names.indexOf(name);
  const out = {name: name, total: 0, personal: 0, share: 0, covered: 0, cats: {}};
  if (k < 0) return out;
  const sh = ss.getSheetByName(EXP), n = nextRow(sh) - FR;
  if (n < 1) return out;
  const v = sh.getRange(FR, 1, n, PX_LAST).getValues();
  const spend = /^(✅ Split|👤 Personal|👛 Pocket money|🔁 Covered|✅ Paid back)/;
  v.forEach(r => {
    const st = String(r[PX.status - 1]), lf = Number(r[PX.lf - 1]), sh_ = Number(r[PX.share + k - 1]);
    if (!spend.test(st) || !(lf > 0) || !(sh_ > 0)) return;
    const amt = sh_ * lf;
    if (/^(👤|👛)/.test(st) && r[PX.forr - 1] === name) out.personal += amt;
    else if (/^(🔁|✅ Paid back)/.test(st)) out.covered += amt;
    else out.share += amt;
    out.total += amt;
    const c = String(r[PX.cat - 1] || 'Shopping & Other');
    out.cats[c] = (out.cats[c] || 0) + amt;
  });
  return out;
}

function ppPeopleRow_(ss, name) {
  const v = ss.getRangeByName('People').getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]).trim() === name) return D_FIRST + i;
  return 0;
}

function ppLook_(ss) {
  return ppExpenseRows_(ss).filter(r => /^(⚠|⏳|🔁)/.test(r.status)).map(r => ({row: r.row, what: r.what, date: r.date, status: r.status, entry: r.entry,
    amt: r.amt, cur: r.cur, by: r.by, forr: r.forr,
    kind: /^⏳/.test(r.status) ? 'notyet' : /^🔁/.test(r.status) ? 'covered' : (!r.by ? 'payer' : 'other')}));
}

/* ============================ Today ============================ */
function penpenToday() {
  const ss = ss_(), ctx = getCtx(ss), me = getSpeaker(ctx, ppEmail_()), trip = ppTrip_(ss), tz = trip.tz;
  const hello = penpenHello();
  const now = Date.now(), ev = ppEvents_(ss);
  const timed = ev.filter(e => e.hm && e.at >= now - 30 * 60000);
  const nx = timed[0] || ev.find(e => e.at >= now) || null;
  let next = null;
  if (nx) {
    const lt = ppLabelTime_(nx.hm);
    next = {title: nx.title, sub: nx.sub, day: Utilities.formatDate(new Date(nx.at), tz, 'EEE, MMM d'), time: lt.t, ap: lt.ap, at: nx.at, dir: nx.dir, place: nx.place};
  }
  const showDay = trip.status === 'during' ? trip.today : (nx ? Utilities.formatDate(new Date(nx.at), tz, 'yyyy-MM-dd') : trip.start);
  const timeline = ev.filter(e => e.day === showDay).map(e => { const lt = ppLabelTime_(e.hm); return {time: lt.t ? lt.t + ' ' + lt.ap : '', title: e.title, done: e.hm ? e.at < now : false, dir: e.dir}; });
  // money
  const people = ss.getRangeByName('People').getValues().map(r => String(r[0]).trim()).filter(String);
  const pr = n => ss.getRangeByName(n);
  const pocket = {left: Number(pr('PocketLeft').getValue()) || 0, put: Number(pr('PocketIn').getValue()) || 0, out: Number(pr('PocketOut').getValue()) || 0};
  const ls = String(named(ss, 'LocalSym') || '₱'), cur = ctx.local;
  const d = ss.getSheetByName(DASH), B = d.getRange(1, 2, 60, 1).getDisplayValues().map(r => String(r[0]).trim());
  const hdr = B.findIndex((x, i) => x === 'Person' && i > 0);
  const bal = hdr >= 0 ? d.getRange(hdr + 2, 2, MAXP, 8).getValues().filter(r => r[0]).map(r => ({name: r[0], bal: Number(r[7]) || 0})) : [];
  // budgets
  const sh = ss.getSheetByName(EXP), n = Math.max(nextRow(sh) - FR, 0);
  let spent = 0, todo = 0;
  if (n) sh.getRange(FR, 1, n, PX_LAST).getValues().forEach(r => {
    const st = String(r[PX.status - 1]), amt = Number(r[PX.amt - 1]) * Number(r[PX.lf - 1]);
    if (!(amt > 0)) return;
    if (/^(✅|👛|🔁)/.test(st)) spent += amt; else if (/^⏳/.test(st)) todo += amt;
  });
  const gb = Number(named(ss, 'GroupBudget')) || 0;
  const len = trip.start && trip.end ? Math.round((new Date(trip.end) - new Date(trip.start)) / 86400000) + 1 : 0;
  const dayN = trip.status === 'during' ? Math.round((new Date(trip.today) - new Date(trip.start)) / 86400000) + 1 : trip.status === 'after' ? len : 0;
  const pace = (b, s) => {
    if (!b) return '';
    const used = s / b;
    if (trip.status === 'before') return Math.round(used * 100) + '% already booked or spent before the trip';
    const should = dayN / len, diff = used - should;
    if (Math.abs(diff) < 0.05) return 'On track — day ' + dayN + ' of ' + len;
    return diff > 0 ? 'A bit ahead of plan — slow down a little 🐢' : 'Under plan — nice! 🎉';
  };
  const meData = me ? ppMe_(ss, me) : null;
  let myBudget = 0, hidden = false;
  if (me) {
    const row = ppPeopleRow_(ss, me), td = ss.getSheetByName(DET);
    if (row) { myBudget = Number(td.getRange(row, 6).getValue()) || 0; hidden = td.getRange(row, 7).getValue() === true; }
  }
  return {
    hello: hello, me: me || '', people: people, ls: ls, cur: cur, home: ctx.home, place: ppPlace_(ss), rate: Number(named(ss, 'LiveRate')) || 0,
    next: next, timelineDay: Utilities.formatDate(Utilities.parseDate(showDay || trip.today, tz, 'yyyy-MM-dd'), tz, 'EEE, MMM d'), timeline: timeline,
    look: ppLook_(ss), settle: settleText_(), balances: bal, pocket: pocket,
    budget: {group: {budget: gb, spent: spent, todo: todo, pct: gb ? spent / gb : 0, pace: pace(gb, spent), dayPct: len ? dayN / len : 0},
      mine: meData ? {budget: myBudget, spent: meData.total, pct: myBudget ? meData.total / myBudget : 0, pace: pace(myBudget, meData.total)} : null},
    mine: meData ? {total: meData.total, personal: meData.personal, share: meData.share, covered: meData.covered,
      cats: Object.keys(meData.cats).map(c => ({cat: c, amt: meData.cats[c]})).sort((a, b) => b.amt - a.amt), hidden: hidden} : null
  };
}

/* ---- one-tap fixes from the review list ---- */
function penpenQuickFix(row, what, action, value) {
  const ss = ss_(), sh = ss.getSheetByName(EXP), ctx = getCtx(ss);
  const lock = ppLock_(); lock.waitLock(25000);
  try {
    const r = ppFindRow_(sh, Number(row), String(what));
    if (!r) throw new Error('That entry changed — pull down to refresh.');
    const before = sh.getRange(r, 1, 1, PX_USER).getValues()[0];
    if (action === 'payer') {
      if (ctx.names.indexOf(value) < 0 && value !== POCKET) throw new Error('Pick a traveler or Pocket money.');
      sh.getRange(r, PX.by).setValue(value);
      sh.getRange(r, PX.notes).setValue(String(before[PX.notes - 1]).replace(/⚠️ Who's I\?[^·]*·\s*/, ''));
    } else if (action === 'paid') sh.getRange(r, PX.paid).setValue('Paid');
    else if (action === 'paidback') sh.getRange(r, PX.paid).setValue('Paid back');
    else throw new Error('Unknown fix.');
    SpreadsheetApp.flush();
    ppPushUndo_({t: 'edit', row: r, before: before, what: String(before[PX.what - 1])});
    ppLog_('Fixed', before[PX.what - 1], {payer: 'paid by → ' + value, paid: 'marked as paid', paidback: 'marked as paid back'}[action] || action);
  } finally { lock.releaseLock(); }
  return penpenToday();
}

function penpenSetBudget(kind, amount) {
  const ss = ss_(), amt = Number(String(amount).replace(/[^\d.]/g, ''));
  if (!(amt >= 0)) throw new Error('Enter a number, like 60000.');
  if (kind === 'group') ss.getRangeByName('GroupBudget').setValue(amt || '');
  else {
    const me = getSpeaker(getCtx(ss), ppEmail_());
    if (!me) throw new Error('I don’t know who you are — add your Google email on Trip Details.');
    ss.getSheetByName(DET).getRange(ppPeopleRow_(ss, me), 6).setValue(amt || '');
  }
  return penpenToday();
}

function penpenSetHide(on) {
  const ss = ss_(), me = getSpeaker(getCtx(ss), ppEmail_());
  if (!me) throw new Error('I don’t know who you are — add your Google email on Trip Details.');
  ss.getSheetByName(DET).getRange(ppPeopleRow_(ss, me), 7).setValue(on === true);
  return penpenToday();
}

/* ============================ Step 3 setup (sheet) ============================ */
function penpenSetupStep3() {
  const ss = SpreadsheetApp.openById(SSID), d = ss.getSheetByName(DET), log = [];
  // Trip Details: group budget (row 13) + personal budget / hide columns (F, G next to each traveler)
  if (!ss.getRangeByName('GroupBudget')) {
    d.getRange('B13').setValue('Trip budget (group, ' + String(named(ss, 'LocalCur') || 'PHP') + ')').setFontColor(UI.muted);
    d.getRange('C13').setNumberFormat('#,##0').setHorizontalAlignment('left').setBorder(true, true, true, true, null, null, UI.line, SpreadsheetApp.BorderStyle.SOLID);
    d.getRange('D13').setValue('shared spending for the whole trip — penpen shows the pace').setFontColor(UI.muted).setFontSize(9);
    ss.setNamedRange('GroupBudget', d.getRange('C13'));
    log.push('group budget field at C13');
  }
  if (!ss.getRangeByName('HideMe')) {
    d.getRange(D_FIRST - 1, 6, 1, 2).setValues([['Personal budget', 'Hide my spending']]);
    tableHead(d.getRange(D_FIRST - 1, 6, 1, 2));
    d.getRange(D_FIRST - 1, 6, 1, 2).setWrap(true);
    d.getRange(D_FIRST, 6, MAXP, 1).setNumberFormat('#,##0').setBorder(true, true, true, true, true, true, UI.line, SpreadsheetApp.BorderStyle.SOLID);
    d.getRange(D_FIRST, 7, MAXP, 1).insertCheckboxes().setHorizontalAlignment('center');
    ss.setNamedRange('MyBudgets', d.getRange(D_FIRST, 6, MAXP, 1));
    ss.setNamedRange('HideMe', d.getRange(D_FIRST, 7, MAXP, 1));
    log.push('personal budget + hide columns (F, G)');
  }
  log.push(penpenJustMe_(ss));
  log.push(penpenDashLook_(ss));
  try { kpiCards_(); log.push('kpi cards recolored'); } catch (e) { log.push('kpi: ' + e); }
  console.log(log.join('\n'));
  return log.join('\n');
}

/* Dashboard: Budget + Needs a look, above "Just me" */
function penpenDashLook_(ss) {
  const d = ss.getSheetByName(DASH);
  const lab = () => d.getRange(1, 2, d.getMaxRows(), 1).getDisplayValues().map(r => String(r[0]).trim());
  const rowOf = (B, t) => { for (let i = 0; i < B.length; i++) if (B[i].indexOf(t) === 0) return i + 1; return -1; };
  const H = 18;
  let B = lab(), r = rowOf(B, 'Budget & needs a look');
  if (r < 0) {
    const rJ = rowOf(B, 'Just me');
    if (rJ < 0) throw new Error('Dashboard: "Just me" not found');
    d.insertRowsBefore(rJ, H);
    const blk = d.getRange(rJ, 1, H, d.getMaxColumns()); blk.breakApart(); blk.clear(); blk.clearDataValidations();
    r = rJ;
  }
  const X = c => 'Expenses!' + L(c) + '3:' + L(c);
  d.getRange(r, 2, H - 1, 8).breakApart().clearContent().setFontWeight('normal').setFontSize(10).setFontColor(UI.ink).setBackground(null);
  d.getRange(r, 2).setValue('Budget & needs a look').setFontSize(14).setFontWeight('bold').setFontColor('#0B7F8C')
    .setBorder(null, true, null, null, null, null, '#0B7F8C', SpreadsheetApp.BorderStyle.SOLID_THICK);
  d.setRowHeight(r, 34);
  const spent = 'SUM(' + X(PX.local) + ')';
  const rows = [
    ['Group budget', '=IF(GroupBudget="","not set — add it on Trip Details (C13)",LocalSym&TEXT(GroupBudget,"#,##0"))'],
    ['Spent so far', '=LocalSym&TEXT(' + spent + ',"#,##0")&"  ·  still to pay "&LocalSym&TEXT(SUMPRODUCT(IFERROR((' + X(PX.status) + '="⏳ Not paid yet")*' + X(PX.amt) + '*' + X(PX.lf) + ',0)),"#,##0")'],
    ['Used', '=IF(N(GroupBudget)=0,"—",TEXT(' + spent + '/GroupBudget,"0%")&IF(TODAY()<TripStart,"  (before the trip)","  ·  "&TEXT(MIN(1,(TODAY()-TripStart+1)/(TripEnd-TripStart+1)),"0%")&" of the trip days gone"))']];
  rows.forEach((x, i) => {
    d.getRange(r + 1 + i, 2, 1, 2).merge().setValue(x[0]).setFontColor(UI.muted);
    d.getRange(r + 1 + i, 4, 1, 6).merge().setFormula(x[1]).setFontWeight('bold');
  });
  const lr = r + 5;
  d.getRange(lr, 2, 1, 8).setValues([['Needs a look', '', 'What', '', '', 'Status', 'This entry', '']]);
  d.getRange(lr, 2).setFormula('="Needs a look ("&COUNTIF(' + X(PX.status) + ',"⚠*")+COUNTIF(' + X(PX.status) + ',"⏳*")+COUNTIF(' + X(PX.status) + ',"🔁*")&")"');
  d.getRange(lr, 2, 1, 8).setBackground('#FFE9CC').setFontColor('#A44A00').setFontWeight('bold');
  d.getRange(lr + 1, 2).setFormula('=IFERROR(QUERY({' + X(PX.date) + ',' + X(PX.what) + ',' + X(PX.status) + ',' + X(PX.entry) + '},"select Col1,Col2,Col3,Col4 where Col3 starts with \'⚠\' or Col3 starts with \'⏳\' or Col3 starts with \'🔁\' limit 10",0),"🎉 Nothing to fix")');
  d.getRange(lr + 1, 2, 10, 1).setNumberFormat('ddd, mmm d');
  // spread the 4 query columns over B, C, D.. — keep simple: B date, C what, D status, E entry
  d.getRange(lr + 1, 2, 10, 8).setFontSize(10).setWrap(false);
  d.getRange(lr, 3, 1, 7).clearContent();
  d.getRange(lr, 3).setValue('What'); d.getRange(lr, 4).setValue('Status'); d.getRange(lr, 5).setValue('Note');
  for (let i = r + 1; i < r + H - 1; i++) d.setRowHeight(i, 24);
  d.getRange(lr + 11, 2).setValue('Fix these in Expenses, or tap them on the Today screen in penpen.').setFontSize(9).setFontStyle('italic').setFontColor('#94a3b8');
  return 'dashboard: budget + needs a look at rows ' + r + '-' + (lr + 11);
}

/* ---- Just me (re-written: respects "Hide my spending") ---- */
function penpenJustMe_(ss) {
  const d = ss.getSheetByName(DASH);
  const lab = () => d.getRange(1, 2, d.getMaxRows(), 1).getDisplayValues().map(r => String(r[0]).trim());
  const rowOf = (B, t) => { for (let i = 0; i < B.length; i++) if (B[i].indexOf(t) === 0) return i + 1; return -1; };
  const H = 16;
  let B = lab(), r = rowOf(B, 'Just me');
  if (r < 0) {
    const rDay = rowOf(B, 'Daily spending');
    if (rDay < 0) throw new Error('Dashboard: "Daily spending" not found');
    d.insertRowsBefore(rDay, H);
    const blk = d.getRange(rDay, 1, H, d.getMaxColumns());
    blk.breakApart(); blk.clear(); blk.clearDataValidations();
    r = rDay + 2;
  }
  const X = c => 'Expenses!' + c + '3:' + c;
  const J = X(L(PX.status)), G = X(L(PX.forr)), Cc = X(L(PX.cat)), S = X(L(PX.lf));
  const is = s => '(' + J + '="' + s + '")';
  const spendMe = '(' + [is('✅ Split'), is('👤 Personal'), is('👛 Pocket money'), is('🔁 Covered'), is('✅ Paid back')].join('+') + ')';
  const hid = k => 'IFERROR(INDEX(HideMe,' + k + ')=TRUE,FALSE)';
  const rows = [
    ['👤 Personal (paid by you or from the pot)', sh => '(' + G + '=' + 'NAME' + ')*(' + is('👤 Personal') + '+' + is('👛 Pocket money') + ')*' + sh],
    ['Your share of shared costs', sh => '(' + G + '="Shared")*(' + is('✅ Split') + '+' + is('👛 Pocket money') + ')*' + sh],
    ['🔁 Covered for you by someone else', sh => '(' + is('🔁 Covered') + '+' + is('✅ Paid back') + ')*' + sh]];
  d.getRange(r, 2, H - 2, 8).breakApart().clearContent().setFontWeight('normal').setFontSize(10).setFontColor(UI.ink).setBackground(null);
  d.getRange(r, 2).setValue('Just me — what each person spent').setFontSize(14).setFontWeight('bold').setFontColor('#0B7F8C')
    .setBorder(null, true, null, null, null, null, '#0B7F8C', SpreadsheetApp.BorderStyle.SOLID_THICK);
  d.setRowHeight(r, 34);
  d.getRange(r + 1, 2, 1, 2).merge().setFormula('="In "&LocalCur');
  for (let k = 1; k <= MAXP; k++) d.getRange(r + 1, 3 + k).setFormula('=IF(INDEX(People,' + k + ')="","",INDEX(People,' + k + '))');
  d.getRange(r + 1, 2, 1, 8).setBackground('#e0f2f1').setFontColor('#0B7F8C').setFontWeight('bold');
  const cell = (row, k, body) => {
    const col = 3 + k, name = L(col) + '$' + (r + 1), sh = X(L(PX.share + k - 1)) + '*' + S;
    d.getRange(row, col).setFormula('=IF(' + name + '="","",IF(' + hid(k) + ',"🔒 hidden",SUMPRODUCT(IFERROR(' + body(sh).split('NAME').join(name) + ',0))))');
  };
  rows.forEach((x, i) => {
    d.getRange(r + 2 + i, 2, 1, 2).merge().setValue(x[0]);
    for (let k = 1; k <= MAXP; k++) cell(r + 2 + i, k, x[1]);
  });
  const tr = r + 5;
  d.getRange(tr, 2, 1, 2).merge().setValue('Total spent on you');
  for (let k = 1; k <= MAXP; k++) { const c = L(3 + k); d.getRange(tr, 3 + k).setFormula('=IF(' + c + '$' + (r + 1) + '="","",IF(' + hid(k) + ',"🔒 hidden",SUM(' + c + (r + 2) + ':' + c + (r + 4) + ')))'); }
  d.getRange(tr, 2, 1, 8).setFontWeight('bold').setBorder(true, null, null, null, null, null, '#0B7F8C', SpreadsheetApp.BorderStyle.SOLID);
  d.getRange(tr + 1, 2, 1, 2).merge().setFormula('="≈ in "&HomeCur');
  for (let k = 1; k <= MAXP; k++) { const c = L(3 + k); d.getRange(tr + 1, 3 + k).setFormula('=IF(' + c + '$' + (r + 1) + '="","",IFERROR(' + c + tr + '/LiveRate,""))'); }
  d.getRange(tr + 1, 2, 1, 8).setFontColor(UI.muted).setFontSize(9);
  const cr = tr + 2;
  d.getRange(cr, 2, 1, 2).merge().setValue('BY CATEGORY').setFontSize(9).setFontWeight('bold').setFontColor(UI.muted);
  CAT_LABELS.forEach((cat, i) => {
    const row = cr + 1 + i;
    d.getRange(row, 2, 1, 2).merge().setValue(cat);
    for (let k = 1; k <= MAXP; k++) cell(row, k, sh => '(' + Cc + '="' + cat + '")*' + spendMe + '*' + sh);
  });
  const nr = cr + 1 + CAT_LABELS.length;
  d.getRange(nr, 2, 1, 8).merge().setValue('Counts what was spent on each person: their personal items, their share of shared costs, and things others covered for them. Not-yet-paid items and settle-ups aren’t counted. 🔒 = that person chose to hide it (Trip Details → Hide my spending).')
    .setFontSize(9).setFontColor('#94a3b8').setFontStyle('italic').setWrap(true);
  d.setRowHeight(nr, 30);
  d.getRange(r + 2, 4, nr - r - 2, 6).setNumberFormat('#,##0.00').setHorizontalAlignment('right');
  d.getRange(r + 1, 4, 1, 6).setHorizontalAlignment('right');
  for (let i = r + 1; i < nr; i++) d.setRowHeight(i, 24);
  return 'just me: rows ' + r + '-' + nr;
}

/* ============================ test ============================ */
function penpenTest3() {
  const t = penpenToday();
  delete t.hello;
  console.log(JSON.stringify(t, null, 1).slice(0, 6000));
}


/* ================= penpenPlan (original penpen code) ================= */
/**
 * penpen · Step 4 — Plan
 * Itinerary tab = one row per stop: Date · Time · What · Place (exact name + town) · Notes · Lat · Lng (Lat/Lng are filled in automatically).
 * penpenPlan() feeds the Plan screen (day chips, OpenStreetMap with numbered stops, "Open whole route in Google Maps").
 * penpen can add / change / delete stops by voice or text (changes and deletes ask Yes / No first).
 */
const PL = {date: 1, time: 2, what: 3, place: 4, notes: 5, lat: 6, lng: 7};
const PL_LAST = 7;

/* ============================ read ============================ */
function ppStops_(ss) {
  const sh = ss.getSheetByName(ITIN); if (!sh || sh.getLastRow() < 2) return [];
  const tz = ppTz_(ss);
  return sh.getRange(2, 1, sh.getLastRow() - 1, PL_LAST).getValues().map((r, i) => {
    const day = r[0] instanceof Date ? ppDay_(r[0], tz) : String(r[0] || '').trim();
    const time = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, 'h:mm a') : String(r[1] || '').trim();
    const m = time.match(PP_TIME);
    return {row: i + 2, day: day, time: time, hm: m ? ppHM_(m) : '', what: String(r[2] || '').trim(), place: String(r[3] || '').trim(),
      notes: String(r[4] || '').trim(), lat: Number(r[5]) || null, lng: Number(r[6]) || null, tried: r[5] === '?'};
  }).filter(s => s.what || s.place);
}

/* Older code expects one entry per day: {day, where, plan, sleep} */
function ppItinerary_(ss) {
  const by = {};
  ppStops_(ss).forEach(s => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.day)) return;
    const d = by[s.day] || (by[s.day] = {day: s.day, where: [], plan: [], sleep: ''});
    const town = s.place.split(',').pop().trim();
    if (town && d.where.indexOf(town) < 0) d.where.push(town);
    d.plan.push((s.time ? s.time + ' ' : '') + s.what);
    if (/check.?in|sleep|overnight|hotel|inn|pension/i.test(s.what)) d.sleep = s.place;
  });
  return Object.keys(by).sort().map(k => ({day: k, where: by[k].where.join(' → '), plan: by[k].plan.join('; '), sleep: by[k].sleep}));
}

/* ============================ geocoding (OpenStreetMap Nominatim, then Open-Meteo) ============================ */
function ppGeo_(ss, place) {
  if (!place) return null;
  const cc = ppPlace_(ss).cc.toLowerCase();
  const props = PropertiesService.getScriptProperties(), key = 'pp_pl_' + (cc ? cc + '_' : '') + place.toLowerCase().slice(0, 200);
  const hit = props.getProperty(key); if (hit) return JSON.parse(hit);
  const tries = [place, place.split(',').slice(1).join(',').trim(), place.split(',').pop().trim()].filter((x, i, a) => x && a.indexOf(x) === i);
  let out = null;
  for (const q of tries) {
    try {
      const res = UrlFetchApp.fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1' + (cc ? '&countrycodes=' + cc : '') + '&q=' + encodeURIComponent(q),
        {muteHttpExceptions: true, headers: {'User-Agent': 'penpen-trip-buddy/1.0 (Google Apps Script)', 'Accept-Language': 'en'}});
      Utilities.sleep(1100);                                   // Nominatim asks for max 1 request per second
      if (res.getResponseCode() === 200) {
        const j = JSON.parse(res.getContentText());
        if (j.length) { out = {lat: Number(j[0].lat), lng: Number(j[0].lon), exact: q === place}; break; }
      }
    } catch (e) { console.warn('geo ' + q + ': ' + e); }
  }
  if (!out) {
    try {
      const town = place.split(',').pop().trim();
      const j = JSON.parse(UrlFetchApp.fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&name=' + encodeURIComponent(town), {muteHttpExceptions: true}).getContentText());
      const g = (j.results || []).find(x => !cc || x.country_code.toLowerCase() === cc);
      if (g) out = {lat: g.latitude, lng: g.longitude, exact: false};
    } catch (e) {}
  }
  if (out) props.setProperty(key, JSON.stringify(out));
  return out;
}

function ppGeoFill_(ss, max) {
  const sh = ss.getSheetByName(ITIN); let n = 0;
  ppStops_(ss).forEach(s => {
    if (n >= max || s.lat || s.tried || !s.place) return;
    const g = ppGeo_(ss, s.place); n++;
    if (g) sh.getRange(s.row, PL.lat, 1, 2).setValues([[g.lat, g.lng]]);
    else sh.getRange(s.row, PL.lat, 1, 2).setValues([['?', '?']]);
  });
  return n;
}

/* ============================ Plan screen ============================ */
function penpenPlan() {
  const ss = ss_(), tz = ppTz_(ss);
  try { ppGeoFill_(ss, 6); } catch (e) { console.warn(e); }
  const stops = ppStops_(ss), by = {};
  stops.forEach(s => { (by[s.day] = by[s.day] || []).push(s); });
  const trip = ppTrip_(ss);
  const days = Object.keys(by).sort().map(k => ({day: k, label: /^\d{4}-\d{2}-\d{2}$/.test(k) ? Utilities.formatDate(Utilities.parseDate(k, tz, 'yyyy-MM-dd'), tz, 'EEE, MMM d') : k,
    short: /^\d{4}-\d{2}-\d{2}$/.test(k) ? Utilities.formatDate(Utilities.parseDate(k, tz, 'yyyy-MM-dd'), tz, 'MMM d') : k,
    stops: by[k].sort((a, b) => a.row - b.row)
      .map(s => ({row: s.row, time: s.time, what: s.what, place: s.place, notes: s.notes, lat: s.lat, lng: s.lng}))}));
  const start = days.find(d => d.day >= trip.today);
  return {days: days, today: trip.today, open: trip.status === 'during' ? trip.today : (start ? start.day : (days[0] && days[0].day)), country: ppPlace_(ss).name, place: ppPlace_(ss)};
}

/* ============================ write ============================ */
function ppPlanRows_(sh) {
  const n = Math.max(sh.getLastRow() - 1, 0);
  return n ? sh.getRange(2, 1, n, PL_LAST).getValues().filter(r => r.slice(0, 5).some(c => c !== '')) : [];
}
function ppPlanKey_(r, tz) {
  const d = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]);
  const t = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, 'HH:mm') : (String(r[1]).match(PP_TIME) ? ppHM_(String(r[1]).match(PP_TIME)) : '99:99');
  return d + ' ' + t;
}
function ppPlanWrite_(ss, rows) {
  const sh = ss.getSheetByName(ITIN), tz = ppTz_(ss);
  const last = {};   // a stop without a time keeps its place: it borrows the time of the stop before it on the same day
  rows = rows.map((r, i) => { let k = ppPlanKey_(r, tz); const d = k.slice(0, 10); if (k.slice(11) === '99:99') k = d + ' ' + (last[d] || '00:00'); else last[d] = k.slice(11); return {r: r, k: k, i: i}; })
    .sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : a.i - b.i).map(x => x.r);
  const n = Math.max(sh.getLastRow() - 1, 1);
  sh.getRange(2, 1, n, PL_LAST).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, PL_LAST).setValues(rows.map(r => {
    const x = r.slice(0, PL_LAST); while (x.length < PL_LAST) x.push(''); return x;
  }));
  SpreadsheetApp.flush();
}
function ppPlanFind_(rows, tz, day, what) {
  return rows.findIndex(r => (r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0])) === day && String(r[2]) === what);
}
function ppStopById_(ss, id) {
  const row = Number(String(id || '').replace(/\D/g, ''));
  const s = ppStops_(ss).find(x => x.row === row);
  if (!s) throw new Error('I couldn’t find that plan stop. Which one do you mean?');
  return s;
}
function ppNiceDay_(day) { return /^\d{4}-\d{2}-\d{2}$/.test(day) ? Utilities.formatDate(new Date(day + 'T12:00:00Z'), 'UTC', 'EEE, MMM d') : day; }
function ppNiceTime_(t) { const m = String(t || '').match(PP_TIME); if (!m) return ''; const l = ppLabelTime_(ppHM_(m)); return l.t + ' ' + l.ap; }

function ppPlanAdd_(ss, a) {
  const day = String(a.date || '').trim(), what = String(a.what || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return {text: 'Which day? Say something like “Add dinner at Larsian on Dec 5 at 7 pm”.'};
  if (!what) return {text: 'What should I add to the plan?'};
  const time = ppNiceTime_(a.time), place = String(a.place || '').trim(), notes = String(a.notes || '').trim();
  const sh = ss.getSheetByName(ITIN), lock = ppLock_(); lock.waitLock(25000);
  try {
    const rows = ppPlanRows_(sh);
    const g = place ? ppGeo_(ss, place) : null;
    rows.push([day, time, what, place, notes, g ? g.lat : '', g ? g.lng : '']);
    ppPlanWrite_(ss, rows);
    ppPushUndo_({t: 'plan_add', day: day, what: what});
    return {text: '🗺️ Added to ' + ppNiceDay_(day) + ': ' + (time ? time + ' · ' : '') + what + (place ? ' · ' + place : '') + (place && !g ? ' (I couldn’t find it on the map — add the town to the place)' : ''), mood: 'excited', changed: true};
  } finally { lock.releaseLock(); }
}

function ppPlanEditAsk_(ss, a) {
  const s = ppStopById_(ss, a.id || a.row), ch = a.changes || {}, set = {}, lines = [];
  const label = {date: 'Day', time: 'Time', what: 'What', place: 'Place', notes: 'Notes'};
  Object.keys(label).forEach(k => {
    if (ch[k] === undefined || ch[k] === null) return;
    let v = String(ch[k]).trim(), before = k === 'date' ? ppNiceDay_(s.day) : k === 'time' ? s.time : s[k];
    if (k === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('I need the day like 2026-12-05.');
    if (k === 'time') v = v ? ppNiceTime_(v) : '';
    const shown = k === 'date' ? ppNiceDay_(v) : v;
    if (shown === before) return;
    set[k] = v; lines.push({label: label[k], from: before || '—', to: shown || '—'});
  });
  if (!lines.length) return {text: 'That stop already looks like that 🙂'};
  const id = ppPending_({t: 'plan_edit', day: s.day, what: s.what, set: set});
  return {confirm: {id: id, kicker: 'CHANGE THE PLAN?', title: s.what + ' · ' + ppNiceDay_(s.day), lines: lines, yes: 'Yes, change it', no: 'No'}};
}

function ppPlanDeleteAsk_(ss, a) {
  const s = ppStopById_(ss, a.id || a.row);
  const id = ppPending_({t: 'plan_delete', day: s.day, what: s.what});
  return {confirm: {id: id, kicker: 'REMOVE FROM THE PLAN?', title: s.what, lines: [{label: '', from: '', to: ppNiceDay_(s.day) + (s.time ? ' · ' + s.time : '') + (s.place ? ' · ' + s.place : '')}], yes: 'Yes, remove it', no: 'No, keep it', danger: true}};
}

function ppPlanConfirm_(p) {
  const ss = ss_(), sh = ss.getSheetByName(ITIN), tz = ppTz_(ss), lock = ppLock_(); lock.waitLock(25000);
  try {
    const rows = ppPlanRows_(sh), i = ppPlanFind_(rows, tz, p.day, p.what);
    if (i < 0) return {replies: ['That stop changed in the meantime — tell me again.'], mood: 'cloudy'};
    const before = rows[i].slice();
    if (p.t === 'plan_delete') {
      rows.splice(i, 1); ppPlanWrite_(ss, rows);
      ppPushUndo_({t: 'plan_delete', before: before.map(v => v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v)});
      return {replies: ['🗑 Removed “' + p.what + '” from the plan. Say “undo” to bring it back.'], mood: 'happy', changed: true};
    }
    const r = rows[i], col = {date: 0, time: 1, what: 2, place: 3, notes: 4};
    Object.keys(p.set).forEach(k => { r[col[k]] = p.set[k]; });
    if (p.set.place !== undefined) { const g = p.set.place ? ppGeo_(ss, p.set.place) : null; r[5] = g ? g.lat : ''; r[6] = g ? g.lng : ''; }
    ppPlanWrite_(ss, rows);
    const nd = r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]);
    ppPushUndo_({t: 'plan_edit', day: nd, what: String(r[2]), before: before.map(v => v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v)});
    return {replies: ['🗺️ Plan updated: ' + r[2] + ' · ' + ppNiceDay_(nd) + (r[1] ? ' · ' + r[1] : '') + (r[3] ? ' · ' + r[3] : '')], mood: 'excited', changed: true};
  } finally { lock.releaseLock(); }
}

function ppPlanUndo_(u) {
  const ss = ss_(), sh = ss.getSheetByName(ITIN), tz = ppTz_(ss), lock = ppLock_(); lock.waitLock(25000);
  try {
    const rows = ppPlanRows_(sh);
    if (u.t === 'plan_add') {
      const i = ppPlanFind_(rows, tz, u.day, u.what);
      if (i < 0) return {replies: ['I couldn’t find that stop to undo.'], mood: 'cloudy'};
      rows.splice(i, 1); ppPlanWrite_(ss, rows);
      return {replies: ['↩️ Took “' + u.what + '” off the plan.'], mood: 'happy', changed: true};
    }
    if (u.t === 'plan_delete') { rows.push(u.before); ppPlanWrite_(ss, rows); return {replies: ['↩️ Brought back “' + u.before[2] + '”.'], mood: 'happy', changed: true}; }
    if (u.t === 'plan_edit') {
      const i = ppPlanFind_(rows, tz, u.day, u.what);
      if (i < 0) return {replies: ['I couldn’t find that stop to undo.'], mood: 'cloudy'};
      rows[i] = u.before; ppPlanWrite_(ss, rows);
      return {replies: ['↩️ Changed “' + u.before[2] + '” back.'], mood: 'happy', changed: true};
    }
  } finally { lock.releaseLock(); }
  return {replies: ['Nothing to undo.']};
}

/* ============================ Step 4 setup: Itinerary → one row per stop ============================ */
function penpenSetupStep4(force) {
  const ss = SpreadsheetApp.openById(SSID), sh = ss.getSheetByName(ITIN), log = [];
  const hdr = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getDisplayValues()[0];
  if (hdr[1] !== 'Time' || force === true) {
    if (force !== true) {
      const bak = sh.copyTo(ss).setName('Backup – Itinerary (old ' + Utilities.formatDate(new Date(), ppTz_(ss), 'MMM d') + ')');
      bak.hideSheet(); log.push('old itinerary kept hidden as "' + bak.getName() + '"');
    }
    const C = '(check the exact spot)';
    const stops = [
      ['2026-12-04', '5:40 AM', 'Land in Manila (PR 103)', 'Ninoy Aquino International Airport Terminal 1, Pasay', ''],
      ['2026-12-04', '8:55 AM', 'Flight Manila → Dipolog (PR 2555)', 'Ninoy Aquino International Airport Terminal 2, Pasay', 'Seat 36C'],
      ['2026-12-04', '10:30 AM', 'Land in Dipolog', 'Dipolog Airport, Dipolog City', ''],
      ['2026-12-04', '', 'Rest at a day-use place', 'Dipolog City', 'Day-use place to book'],
      ['2026-12-04', '5:00 PM', 'Overnight boat to Cebu', 'Pulauan Port, Dapitan City', 'Ferry port ' + C],
      ['2026-12-05', '', 'Arrive in Cebu by boat', 'Cebu City Pier, Cebu City', 'Morning arrival ' + C],
      ['2026-12-05', '', 'Check in to RF Suites', 'RF Suites Hotel, Cebu City', ''],
      ['2026-12-06', '', 'Tour Day 1 pick-up at RF Suites', 'RF Suites Hotel, Cebu City', 'QueenCity Wanderlust tour'],
      ['2026-12-06', '', 'Moalboal', 'Panagsama Beach, Moalboal', ''],
      ['2026-12-06', '', 'Canyoneering', 'Kawasan Falls, Badian', 'Canyoneering start point ' + C],
      ['2026-12-06', '', 'Sleep at Gravino Tourist Inn', 'Gravino Tourist Inn, Cebu', C],
      ['2026-12-07', '', 'Tour Day 2: Oslob + whale shark watching', 'Oslob Whale Shark Watching, Oslob', 'Check out of RF Suites first (as planned)'],
      ['2026-12-07', '2:00 PM', 'Drop-off + check in at Harolds Hotel', 'Harolds Hotel, Cebu City', ''],
      ['2026-12-08', '', 'Tour Day 3: Cebu City tour', 'Harolds Hotel, Cebu City', 'Pick-up & drop-off at Harolds'],
      ['2026-12-09', '', 'Free day in Cebu City', 'Cebu City', 'Harolds extra night — to book'],
      ['2026-12-10', '12:00 PM', 'Check out of Harolds Hotel', 'Harolds Hotel, Cebu City', ''],
      ['2026-12-10', '', 'Evening boat to Dipolog (overnight)', 'Cebu City Pier, Cebu City', 'To book ' + C],
      ['2026-12-11', '', 'Arrive in Dipolog', 'Pulauan Port, Dapitan City', C],
      ['2026-12-11', '2:00 PM', 'Check in to Antonio’s Pension House', 'Antonio\'s Pension House, Dipolog City', ''],
      ['2026-12-12', '', 'Dipolog day (plan TBD)', 'Dipolog City', 'e.g. Boulevard sunset'],
      ['2026-12-12', '5:30 PM', 'Sunset at Dipolog Boulevard', 'Dipolog Boulevard, Dipolog City', 'Idea'],
      ['2026-12-13', '8:10 AM', 'Brad flies Dipolog → Manila (PR 2558)', 'Dipolog Airport, Dipolog City', ''],
      ['2026-12-13', '3:15 PM', 'Brad flies Manila → Los Angeles (PR 122)', 'Ninoy Aquino International Airport Terminal 1, Pasay', 'Lands LA 12:10 PM same day']];
    sh.clear(); sh.clearConditionalFormatRules();
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
    if (sh.getMaxColumns() < PL_LAST) sh.insertColumnsAfter(sh.getMaxColumns(), PL_LAST - sh.getMaxColumns());
    if (sh.getMaxRows() < 200) sh.insertRowsAfter(sh.getMaxRows(), 200 - sh.getMaxRows());
    sh.getRange(1, 1, 1, PL_LAST).setValues([['Date', 'Time', 'What', 'Place (exact name + town)', 'Notes', 'Lat', 'Lng']]);
    headerStyle(sh.getRange(1, 1, 1, 5), false); headerStyle(sh.getRange(1, 6, 1, 2), true);
    sh.setFrozenRows(1);
    [110, 90, 280, 300, 260, 80, 80].forEach((w, i) => sh.setColumnWidth(i + 1, w));
    const n = sh.getMaxRows() - 1;
    sh.getRange(2, 1, n, 1).setNumberFormat('ddd, mmm d').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build());
    sh.getRange(2, 2, n, 1).setNumberFormat('@');
    sh.getRange(2, 6, n, 2).setFontColor(UI.muted).setBackground(UI.autoCell).setNumberFormat('0.0000');
    sh.getRange(2, 1, n, 5).setVerticalAlignment('middle');
    sh.getRange(1, 4).setNote('Write the place the way you’d search it in Google Maps, with the town: “Larsian BBQ, Cebu City”. penpen uses it for the map and directions.');
    sh.getRange(1, 6).setNote('Filled in automatically from the Place. Clear both cells to look the place up again.');
    ppPlanWrite_(ss, stops.map(s => s.concat(['', ''])));
    sh.getRange(1, 6, sh.getMaxRows(), 2).protect().setDescription('Map position (automatic)').setWarningOnly(true);
    log.push('itinerary converted to ' + stops.length + ' stops');
  } else log.push('itinerary already one row per stop');
  log.push('geocoded ' + ppGeoFill_(ss, 40) + ' places');
  console.log(log.join('\n'));
  return log.join('\n');
}

function penpenTest4() {
  const p = penpenPlan();
  console.log(p.days.map(d => d.label + ': ' + d.stops.map(s => (s.time ? s.time + ' ' : '') + s.what + ' @ ' + s.place + ' [' + (s.lat ? s.lat.toFixed(3) + ',' + s.lng.toFixed(3) : 'no map') + ']').join(' | ')).join('\n'));
  const ss = ss_(), ctx = getCtx(ss), trip = ppTrip_(ss);
  console.log('PLAN ' + JSON.stringify(ppGemini_(ppPrompt_(ss, 'add dinner at Larsian on Dec 5 at 7 pm', ctx, 'Kate', trip))));
}

function penpenRebuildPlan() { return penpenSetupStep4(true); }


/* ================= penpenSafety (original penpen code) ================= */
/**
 * penpen · Step 5 — Safety & contacts
 * Contacts tab: Type · Name · For (traveler) · Contact person · Phone · Messenger / Facebook · Email · Place · Notes
 * Trip Details column H next to each traveler: "Live location link" (a Google Maps location-sharing link, pasted once).
 * penpenSafety() feeds the Safety screen; penpen can add or update contacts by voice ("Harolds Hotel's number is 032 …").
 */
const CT = 'Contacts';
const PC = {type: 1, name: 2, forr: 3, person: 4, phone: 5, msg: 6, email: 7, place: 8, notes: 9};
const PC_LAST = 9;
const CT_TYPES = ['Emergency', 'Hotel', 'Tour', 'Transport', 'Other'];

function ppContacts_(ss) {
  const sh = ss.getSheetByName(CT); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, PC_LAST).getDisplayValues().map((r, i) => ({row: i + 2, type: r[0], name: r[1], forr: r[2], person: r[3],
    phone: r[4], msg: r[5], email: r[6], place: r[7], notes: r[8]})).filter(c => c.name || c.phone);
}

function ppLiveLinks_(ss) {
  const r = ss.getRangeByName('LiveLinks'); if (!r) return [];
  const names = ss.getRangeByName('People').getValues();
  return r.getValues().map((v, i) => ({name: String(names[i][0]).trim(), link: String(v[0] || '').trim()})).filter(x => x.name);
}

function penpenSafety() {
  const ss = ss_(), ctx = getCtx(ss), me = getSpeaker(ctx, ppEmail_()), trip = ppTrip_(ss);
  const loc = (trip.status === 'during' ? ppLocationFor_(ss, trip.today) : null);
  return {me: me || '', here: loc ? loc.place : '', during: trip.status === 'during',
    contacts: ppContacts_(ss), live: ppLiveLinks_(ss).map(x => ({name: x.name, link: x.link, me: x.name === me}))};
}

function penpenSetLiveLink(url) {
  url = String(url || '').trim();
  if (url && !/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps)\//i.test(url)) throw new Error('That doesn’t look like a Google Maps sharing link. It should start with https://maps.app.goo.gl/…');
  const ss = ss_(), me = getSpeaker(getCtx(ss), ppEmail_());
  if (!me) throw new Error('I don’t know who you are — add your Google email on Trip Details.');
  ss.getSheetByName(DET).getRange(ppPeopleRow_(ss, me), 8).setValue(url);
  return penpenSafety();
}

/* ---- penpen: add / update a contact (asks Yes / No) ---- */
function ppContactAsk_(ss, a) {
  const name = String(a.name || '').trim();
  if (!name) return {text: 'Which contact? e.g. “Harolds Hotel’s number is 032 123 4567”.'};
  const ch = a.changes || {}, F = {type: 'Type', for: 'For', person: 'Contact person', phone: 'Phone', messenger: 'Messenger / Facebook', email: 'Email', place: 'Place', notes: 'Notes'};
  const ex = ppContacts_(ss).find(c => c.name.toLowerCase() === name.toLowerCase()) ||
             ppContacts_(ss).find(c => c.name.toLowerCase().indexOf(name.toLowerCase()) >= 0 || name.toLowerCase().indexOf(c.name.toLowerCase()) >= 0);
  const key = {type: 'type', for: 'forr', person: 'person', phone: 'phone', messenger: 'msg', email: 'email', place: 'place', notes: 'notes'};
  const set = {}, lines = [];
  Object.keys(F).forEach(k => {
    if (ch[k] === undefined || ch[k] === null || String(ch[k]).trim() === '') return;
    let v = String(ch[k]).trim();
    if (k === 'type') { v = CT_TYPES.find(t => t.toLowerCase() === v.toLowerCase()) || 'Other'; }
    const before = ex ? ex[key[k]] : '';
    if (before === v) return;
    set[k] = v; lines.push({label: F[k], from: before || '—', to: v});
  });
  if (!lines.length) return {text: ex ? 'That contact already has those details 🙂' : 'What should I save for ' + name + '? A phone number, Messenger link or contact person?'};
  const id = ppPending_({t: 'contact', name: ex ? ex.name : name, isNew: !ex, set: set});
  return {confirm: {id: id, kicker: ex ? 'UPDATE THIS CONTACT?' : 'ADD THIS CONTACT?', title: ex ? ex.name : name, lines: lines, yes: ex ? 'Yes, update it' : 'Yes, add it', no: 'No'}};
}

function ppContactConfirm_(p) {
  const ss = ss_(), sh = ss.getSheetByName(CT), col = {type: PC.type, for: PC.forr, person: PC.person, phone: PC.phone, messenger: PC.msg, email: PC.email, place: PC.place, notes: PC.notes};
  const lock = ppLock_(); lock.waitLock(25000);
  try {
    let c = ppContacts_(ss).find(x => x.name === p.name), row;
    if (c) row = c.row;
    else { row = Math.max(sh.getLastRow(), 1) + 1; sh.getRange(row, PC.name).setValue(p.name); if (!p.set.type) sh.getRange(row, PC.type).setValue('Other'); }
    const before = sh.getRange(row, 1, 1, PC_LAST).getValues()[0];
    Object.keys(p.set).forEach(k => sh.getRange(row, col[k]).setValue(p.set[k]));
    ppPushUndo_({t: 'contact', name: p.name, isNew: !c, before: before});
    return {replies: ['📇 Saved: ' + p.name + Object.keys(p.set).map(k => ' · ' + p.set[k]).join('')], mood: 'concierge', changed: true};
  } finally { lock.releaseLock(); }
}

function ppContactUndo_(u) {
  const ss = ss_(), sh = ss.getSheetByName(CT), c = ppContacts_(ss).find(x => x.name === u.name);
  if (!c) return {replies: ['I couldn’t find that contact to undo.'], mood: 'cloudy'};
  if (u.isNew) sh.deleteRow(c.row); else sh.getRange(c.row, 1, 1, PC_LAST).setValues([u.before]);
  return {replies: ['↩️ ' + (u.isNew ? 'Removed' : 'Changed back') + ': ' + u.name], mood: 'happy', changed: true};
}

/* ============================ Step 5 setup ============================ */
function penpenSetupStep5() {
  const ss = SpreadsheetApp.openById(SSID), log = [];
  let sh = ss.getSheetByName(CT);
  if (!sh) {
    sh = baseSheet(ss.insertSheet(CT), PC_LAST, 100);
    sh.getRange(1, 1, 1, PC_LAST).setValues([['Type', 'Name', 'For', 'Contact person', 'Phone', 'Messenger / Facebook', 'Email', 'Place (for directions)', 'Notes']]);
    headerStyle(sh.getRange(1, 1, 1, PC_LAST), false);
    sh.setFrozenRows(1);
    [100, 220, 80, 150, 140, 220, 190, 240, 240].forEach((w, i) => sh.setColumnWidth(i + 1, w));
    const people = ss.getRangeByName('People').getValues().map(r => String(r[0]).trim()).filter(String);
    const rows = people.map(p => ['Emergency', p + '’s emergency contact', p, '', '', '', '', '', 'Who to call at home if something happens to ' + p]);
    rows.push(
      ['Hotel', 'RF Suites Hotel', '', '', '', '', '', 'RF Suites Hotel, Cebu City', 'Dec 5–7'],
      ['Hotel', 'Gravino Tourist Inn', '', '', '', '', '', 'Gravino Tourist Inn, Cebu', 'Dec 6'],
      ['Hotel', 'Harolds Hotel', '', '', '', '', '', 'Harolds Hotel, Cebu City', 'Dec 7–10 · booked via Delta'],
      ['Hotel', 'Antonio’s Pension House', '', '', '', '', '', 'Antonio\'s Pension House, Dipolog City', 'Dec 11–13 · booked via Delta'],
      ['Tour', 'QueenCity Wanderlust', '', '', '', '', '', '', 'Tour Dec 6–8 · balance ₱11,396 to pay'],
      ['Transport', 'Philippine Airlines', '', '', '', '', '', '', 'Conf BMGDL2'],
      ['Transport', 'Ferry company (Dipolog ↔ Cebu)', '', '', '', '', '', '', 'Dec 4 and Dec 10 boats']);
    sh.getRange(2, 1, rows.length, PC_LAST).setValues(rows);
    const n = sh.getMaxRows() - 1;
    sh.getRange(2, 1, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CT_TYPES, true).setAllowInvalid(true).build());
    sh.getRange(2, 3, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ss.getRangeByName('People'), true).setAllowInvalid(true).build());
    sh.getRange(2, 5, n, 1).setNumberFormat('@');
    sh.getRange(2, 2, n, 1).setFontWeight('bold');
    lines(sh.getRange(2, 1, 40, PC_LAST));
    const R = SpreadsheetApp.newConditionalFormatRule;
    sh.setConditionalFormatRules([
      R().whenTextEqualTo('Emergency').setBackground('#fee2e2').setFontColor('#991b1b').setRanges([sh.getRange(2, 1, n, 1)]).build(),
      R().whenTextEqualTo('Hotel').setBackground('#ede9fe').setRanges([sh.getRange(2, 1, n, 1)]).build(),
      R().whenTextEqualTo('Tour').setBackground('#dcfce7').setRanges([sh.getRange(2, 1, n, 1)]).build(),
      R().whenTextEqualTo('Transport').setBackground('#e0f2fe').setRanges([sh.getRange(2, 1, n, 1)]).build(),
      R().whenFormulaSatisfied('=AND($B2<>"",$E2="",$F2="")').setBackground('#fffbeb').setRanges([sh.getRange(2, 5, n, 2)]).build()]);
    sh.getRange(1, 6).setNote('A Messenger link (m.me/username) or a Facebook page link. penpen shows it as a “Message” button.');
    sh.getRange(1, 5).setNote('Include the country code if it’s a foreign number, e.g. +1 310 555 0100. Local: 0917 123 4567.');
    sh.setTabColor('#C93A3F');
    log.push('Contacts tab created with ' + rows.length + ' rows to fill in');
  }
  if (!ss.getRangeByName('LiveLinks')) {
    const d = ss.getSheetByName(DET);
    d.getRange(D_FIRST - 1, 8).setValue('Live location link');
    tableHead(d.getRange(D_FIRST - 1, 8));
    d.getRange(D_FIRST, 8, MAXP, 1).setBorder(true, true, true, true, true, true, UI.line, SpreadsheetApp.BorderStyle.SOLID).setFontSize(9);
    d.getRange(D_FIRST - 1, 8).setNote('Google Maps → your picture → Location sharing → New share → Until you turn this off → Copy link. Paste it here (or in penpen → Safety).');
    ss.setNamedRange('LiveLinks', d.getRange(D_FIRST, 8, MAXP, 1));
    log.push('live location links column (Trip Details H)');
  }
  const order = [DASH, QA, EXP, PM, ITIN, CT, BOOK, DET];
  order.forEach((nm, i) => { const s = ss.getSheetByName(nm); if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); } });
  ss.setActiveSheet(ss.getSheetByName(DASH));
  console.log(log.join('\n'));
  return log.join('\n');
}

function penpenTest5() {
  console.log(JSON.stringify(penpenSafety()).slice(0, 3000));
  const ss = ss_(), ctx = getCtx(ss), trip = ppTrip_(ss);
  console.log('CONTACT ' + JSON.stringify(ppGemini_(ppPrompt_(ss, 'the tour guide at QueenCity is Joy, her number is 0917 555 1234', ctx, 'Kate', trip))));
}


/* ================= penpenDiary (original penpen code) ================= */
/**
 * penpen · Step 6 — Diary
 * Two kinds of Google Doc:
 *  • GROUP diary — one shared doc (made by the owner in setup, shared with every traveler's Google email)
 *  • PERSONAL diary — one per person, made in that person's own Drive the first time they use it (only they can see it)
 * Template: title + trip line, then a heading per day "Sat, Dec 5 · Cebu City · 31° sunny"; each entry is stamped "Kate · 7:40 PM",
 * photos are embedded with their caption under them.
 * Entries come from the Diary screen (text / voice / photo) or from chat when the message starts with "Dear diary" / "Diary:".
 */
const PP_DIARY_RE = /^\s*(?:dear\s+diary|diary)\s*[:,\-–—]?\s*/i;

function ppDiaryTitle_(ss, kind, who) {
  const trip = String(named(ss, 'TripName') || ss.getName());
  return kind === 'group' ? trip + ' — Group diary' : trip + ' — ' + who + '’s diary';
}

function ppDiaryNew_(ss, kind, who) {
  const doc = DocumentApp.create(ppDiaryTitle_(ss, kind, who)), b = doc.getBody(), tz = ppTz_(ss);
  b.clear();
  const s = named(ss, 'TripStart'), e = named(ss, 'TripEnd');
  const dates = (s instanceof Date && e instanceof Date) ? Utilities.formatDate(s, tz, 'MMM d') + ' – ' + Utilities.formatDate(e, tz, 'MMM d, yyyy') : '';
  const people = ss.getRangeByName('People').getValues().map(r => String(r[0]).trim()).filter(String).join(' & ');
  const p0 = b.getChild(0).asParagraph();
  p0.setText('📔 ' + (kind === 'group' ? 'Our trip diary' : who + '’s trip diary'));
  p0.setHeading(DocumentApp.ParagraphHeading.TITLE);
  b.appendParagraph(String(named(ss, 'TripName') || '') + (dates ? ' · ' + dates : '') + (kind === 'group' ? ' · ' + people : ' · private — only you can see this'))
    .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  const p2 = b.appendParagraph('Written with penpen 🐧'); p2.editAsText().setItalic(true).setForegroundColor('#4F6475');
  b.appendHorizontalRule();
  doc.saveAndClose();
  return doc.getId();
}

function ppDiaryShare_(id, emails, edit) {
  var me = '';
  try { me = Session.getEffectiveUser().getEmail().toLowerCase(); } catch (e) {}
  var f; try { f = DriveApp.getFileById(id); } catch (e) { return; }
  (emails || []).forEach(function (em) {
    em = String(em || '').toLowerCase().trim();
    if (!em || em === me || !/@/.test(em) || /@example\.(com|org)$/.test(em)) return;
    try { if (edit) f.addEditor(em); else f.addViewer(em); } catch (e) {}
  });
}
// one key per person: "Just me" is that person's own doc (the server runs as the trip owner, so the key must include the email)
function ppDiaryMeKey_() { return ppK_('PP_DIARY_ME') + ':' + String(ppEmail_() || '').toLowerCase(); }
function ppDiaryId_(ss, kind, create) {
  var sp = PropertiesService.getScriptProperties();
  if (kind === 'group') {
    var gid = sp.getProperty(ppK_('PP_DIARY_GROUP'));
    if (gid) { try { DriveApp.getFileById(gid).getName(); } catch (e) { gid = ''; } }
    if (!gid && create) {
      gid = ppDiaryNew_(ss, 'group', '');
      sp.setProperty(ppK_('PP_DIARY_GROUP'), gid);
      try { ppDiaryShare_(gid, srvMembers_().map(function (x) { return x.email; }), true); } catch (e) {}
    }
    if (!gid && !create) return '';
    return gid;
  }
  var id = sp.getProperty(ppDiaryMeKey_());
  if (id) { try { DriveApp.getFileById(id).getName(); } catch (e) { id = ''; } }
  if (!id && create) {
    var who = getSpeaker(getCtx(ss), ppEmail_()) || 'My';
    id = ppDiaryNew_(ss, 'me', who);
    sp.setProperty(ppDiaryMeKey_(), id);
    ppDiaryShare_(id, [ppEmail_()], true);
  }
  return id || '';
}

function penpenDiaryInfo() {
  const ss = ss_(), gid = PropertiesService.getScriptProperties().getProperty(ppK_('PP_DIARY_GROUP'));
  const mid = PropertiesService.getScriptProperties().getProperty(ppDiaryMeKey_());
  return {group: gid ? 'https://docs.google.com/document/d/' + gid + '/edit' : '', me: mid ? 'https://docs.google.com/document/d/' + mid + '/edit' : '',
    who: getSpeaker(getCtx(ss), ppEmail_()) || ''};
}

/* entry = {text, kind: 'group'|'me', photo: {data (base64), type, name}, caption, day: 'yyyy-MM-dd' (optional)} */
function penpenDiaryAdd(entry) {
  entry = entry || {};
  const text = String(entry.text || '').trim(), caption = String(entry.caption || '').trim(), kind = entry.kind === 'me' ? 'me' : 'group';
  if (!text && !(entry.photo && entry.photo.data) && !(entry.video && entry.video.data)) throw new Error('Write something or add a photo first.');
  const ss = ss_(), tz = ppTz_(ss), now = new Date(), day = /^\d{4}-\d{2}-\d{2}$/.test(entry.day || '') ? entry.day : ppDay_(now, tz);
  const who = getSpeaker(getCtx(ss), ppEmail_()) || (ppEmail_().split('@')[0] || 'Someone');
  const id = ppDiaryId_(ss, kind, true), doc = DocumentApp.openById(id), b = doc.getBody();
  // day heading: "Sat, Dec 5 · Cebu City · 31° sunny"
  const dLabel = Utilities.formatDate(Utilities.parseDate(day, tz, 'yyyy-MM-dd'), tz, 'EEE, MMM d');
  const loc = ppLocationFor_(ss, day);
  let head = dLabel + (loc ? ' · ' + loc.place : '');
  if (day === ppDay_(now, tz) && loc) { const wx = ppWeather_(ss, loc); if (wx) head += ' · ' + wx.temp + '° ' + wx.label; }
  const n = b.getNumChildren(), heads = [];
  for (let i = 0; i < n; i++) {
    const c = b.getChild(i);
    if (c.getType() === DocumentApp.ElementType.PARAGRAPH && c.asParagraph().getHeading() === DocumentApp.ParagraphHeading.HEADING2) heads.push({i: i, t: c.asParagraph().getText()});
  }
  const year = day.slice(0, 4), keyOf = t => { try { return ppDay_(Utilities.parseDate(t.split(' · ')[0] + ' ' + year, tz, 'EEE, MMM d yyyy'), tz); } catch (e) { return ''; } };
  let at = -1;
  const mine = heads.findIndex(h => h.t.indexOf(dLabel) === 0);
  if (mine >= 0) at = mine + 1 < heads.length ? heads[mine + 1].i : b.getNumChildren();
  else {
    const later = heads.find(h => keyOf(h.t) > day);
    at = later ? later.i : b.getNumChildren();
    const hp = b.insertParagraph(at, head); hp.setHeading(DocumentApp.ParagraphHeading.HEADING2); hp.editAsText().setForegroundColor('#0B7F8C');
    at++;
  }
  // entry
  const stamp = b.insertParagraph(at++, who + ' · ' + Utilities.formatDate(now, tz, 'h:mm a'));
  stamp.setHeading(DocumentApp.ParagraphHeading.NORMAL); stamp.editAsText().setBold(true).setFontSize(10).setForegroundColor('#4F6475');
  if (text) { const tp = b.insertParagraph(at++, text); tp.setHeading(DocumentApp.ParagraphHeading.NORMAL); tp.editAsText().setBold(false).setFontSize(11).setForegroundColor('#12324A'); }
  if (entry.photo && entry.photo.data) {
    const blob = Utilities.newBlob(Utilities.base64Decode(String(entry.photo.data).replace(/^data:[^,]+,/, '')), entry.photo.type || 'image/jpeg', entry.photo.name || 'photo.jpg');
    const p = b.insertParagraph(at++, '');
    const img = p.appendInlineImage(blob), w = img.getWidth(), h = img.getHeight(), W = 420;
    if (w > W) { img.setWidth(W); img.setHeight(Math.round(h * W / w)); }
    if (caption) b.insertParagraph(at++, caption).editAsText().setItalic(true).setBold(false).setFontSize(10).setForegroundColor('#4F6475');
  }
  if (entry.video && entry.video.data) {
    const vf = ppDiaryVideo_(entry.video, kind, id), vurl = vf.getUrl();
    if (entry.video.thumb) {
      const tb = Utilities.newBlob(Utilities.base64Decode(String(entry.video.thumb).replace(/^data:[^,]+,/, '')), 'image/jpeg', 'video-thumb.jpg');
      const tp = b.insertParagraph(at++, '');
      const im = tp.appendInlineImage(tb), w = im.getWidth(), h = im.getHeight(), W = 420;
      if (w > W) { im.setWidth(W); im.setHeight(Math.round(h * W / w)); }
      im.setLinkUrl(vurl);
    }
    const label = '\u25B6 Play video' + (entry.video.secs ? ' \u00b7 ' + ppClock_(entry.video.secs) : '') + (caption && !(entry.photo && entry.photo.data) ? ' \u2014 ' + caption : '');
    const lp = b.insertParagraph(at++, label);
    lp.editAsText().setItalic(false).setBold(true).setFontSize(10).setForegroundColor('#237566').setLinkUrl(vurl);
  }
  b.insertParagraph(at++, '').editAsText().setBold(false).setItalic(false);
  doc.saveAndClose();
  return {ok: true, kind: kind, url: 'https://docs.google.com/document/d/' + id + '/edit',
    msg: '📔 Saved to ' + (kind === 'group' ? 'the group diary' : 'your private diary') + (entry.video && entry.video.data ? ' with your video' : (entry.photo && entry.photo.data ? ' with your photo' : '')) + '.'};
}

/* chat: "Dear diary, …" → ask group or just me */
function ppDiaryAsk_(text) {
  const t = String(text || '').replace(PP_DIARY_RE, '').trim();
  if (!t) return {replies: ['What should I write in the diary?'], mood: 'happy'};
  const id = ppPending_({t: 'diary', text: t});
  return {replies: [], mood: 'concierge', confirm: {id: id, kicker: 'SAVE TO THE DIARY?', title: 'Group diary, or just for you?',
    lines: [{label: '', from: '', to: t.length > 220 ? t.slice(0, 220) + '…' : t}], yes: 'Group diary', no: 'Just me', choice: true}};
}

/* ============================ Step 6 setup: the shared group diary ============================ */
function penpenSetupStep6() {
  const ss = SpreadsheetApp.openById(SSID), props = PropertiesService.getScriptProperties(), log = [];
  let id = props.getProperty(ppK_('PP_DIARY_GROUP'));
  if (!id) {
    id = ppDiaryNew_(ss, 'group', '');
    props.setProperty(ppK_('PP_DIARY_GROUP'), id);
    const f = DriveApp.getFileById(id), parents = DriveApp.getFileById(SSID).getParents();
    if (parents.hasNext()) f.moveTo(parents.next());
    // clean up a half-made diary from an earlier failed run (same name, empty, made in the last hour)
    const old = DriveApp.getFilesByName(f.getName());
    while (old.hasNext()) { const o = old.next(); if (o.getId() !== id && o.getOwner() && o.getOwner().getEmail() === Session.getEffectiveUser().getEmail() && Date.now() - o.getDateCreated().getTime() < 3600000) { o.setTrashed(true); log.push('trashed a half-made copy'); } }
    log.push('group diary created: ' + f.getName());
  }
  const f = DriveApp.getFileById(id), me = Session.getEffectiveUser().getEmail().toLowerCase();
  getCtx(ss).people.forEach(p => { if (p.email && p.email !== me) { try { f.addEditor(p.email); log.push('shared with ' + p.email); } catch (e) { log.push('could not share with ' + p.email + ': ' + e.message); } } });
  try { penpenSetupAudit_(ss); log.push('change log tab ready'); } catch (e) { log.push('change log: ' + e.message); }
  console.log(log.join('\n') + '\nhttps://docs.google.com/document/d/' + id + '/edit');
  return log.join('\n');
}


/* ---- Diary videos: saved to a "penpen trip videos" Drive folder, shared like the diary, shown in the doc as a tappable thumbnail ---- */
function ppClock_(s) { s = Math.round(Number(s) || 0); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
function ppDiaryVideo_(v, kind, docId) {
  const name = String(v.name || 'video').replace(/[^\w.\- ]/g, '').slice(0, 60) || 'video';
  const blob = Utilities.newBlob(Utilities.base64Decode(String(v.data).replace(/^data:[^,]+,/, '')), v.type || 'video/mp4', name);
  const props = PropertiesService.getUserProperties();
  let folder = null; const fid = props.getProperty(ppK_('PP_VIDEO_FOLDER'));
  if (fid) { try { folder = DriveApp.getFolderById(fid); } catch (e) { folder = null; } }
  if (!folder) { folder = DriveApp.createFolder('penpen trip videos'); props.setProperty(ppK_('PP_VIDEO_FOLDER'), folder.getId()); }
  const file = folder.createFile(blob);
  file.setDescription('Diary video saved by penpen');
  if (kind === 'group') {
    try {
      const doc = DriveApp.getFileById(docId), me = String(ppSrvUser_().getEmail() || '').toLowerCase();
      const emails = doc.getEditors().concat(doc.getViewers()).map(function (u) { return u.getEmail(); });
      try { emails.push(doc.getOwner().getEmail()); } catch (e) {}
      emails.filter(function (e, i) { return e && e.toLowerCase() !== me && emails.indexOf(e) === i; }).forEach(function (e) { try { file.addViewer(e); } catch (x) {} });
    } catch (e) {}
  }
  return file;
}

/* ---- Remove a diary video (only the person who uploaded it). Removes it from the doc and moves the file to Drive trash. ---- */
function ppDocVideoParas_(b) {
  const out = [];
  for (let i = 0; i < b.getNumChildren(); i++) {
    const c = b.getChild(i); if (c.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    const para = c.asParagraph(); let url = '';
    for (let j = 0; j < para.getNumChildren() && !url; j++) {
      const ch = para.getChild(j), t = ch.getType();
      if (t === DocumentApp.ElementType.INLINE_IMAGE) url = ch.asInlineImage().getLinkUrl() || '';
      else if (t === DocumentApp.ElementType.TEXT) { const tx = ch.asText(); if (tx.getText().length) url = tx.getLinkUrl(0) || ''; }
    }
    const m = url.indexOf('drive.google.com') >= 0 ? (url.match(/\/d\/([A-Za-z0-9_-]{20,})/) || url.match(/[?&]id=([A-Za-z0-9_-]{20,})/)) : null;
    if (m) out.push({i: i, id: m[1], text: para.getText()});
  }
  return out;
}
function penpenDiaryVideos(kind) {
  kind = kind === 'me' ? 'me' : 'group';
  const ss = ss_(), id = ppDiaryId_(ss, kind, false); if (!id) return [];
  const b = DocumentApp.openById(id).getBody(), me = String(ppSrvUser_().getEmail() || '').toLowerCase(), tz = ppTz_(ss);
  const seen = {}, list = [];
  ppDocVideoParas_(b).forEach(function (x) {
    if (seen[x.id]) { if (x.text) seen[x.id].label = x.text; return; }
    let f = null; try { f = DriveApp.getFileById(x.id); } catch (e) { return; }
    if (f.isTrashed()) return;
    let owner = ''; try { owner = f.getOwner().getEmail().toLowerCase(); } catch (e) {}
    const item = {id: x.id, label: x.text || f.getName(), mine: owner === me, date: Utilities.formatDate(f.getDateCreated(), tz, 'EEE, MMM d \u00b7 h:mm a')};
    seen[x.id] = item; list.push(item);
  });
  return list.reverse().slice(0, 12);
}
function penpenDiaryRemoveVideo(fileId, kind) {
  kind = kind === 'me' ? 'me' : 'group';
  const ss = ss_(), id = ppDiaryId_(ss, kind, false); if (!id) throw new Error('No diary found.');
  const f = DriveApp.getFileById(fileId), me = String(ppSrvUser_().getEmail() || '').toLowerCase();
  let owner = ''; try { owner = f.getOwner().getEmail().toLowerCase(); } catch (e) {}
  if (owner !== me) throw new Error('Only the person who uploaded this video can remove it.');
  const doc = DocumentApp.openById(id), b = doc.getBody();
  ppDocVideoParas_(b).filter(function (x) { return x.id === fileId; }).map(function (x) { return x.i; }).sort(function (a, c) { return c - a; })
    .forEach(function (i) { const para = b.getChild(i).asParagraph(); if (i === b.getNumChildren() - 1) para.clear(); else para.removeFromParent(); });
  doc.saveAndClose();
  f.setTrashed(true);
  return {ok: true, msg: 'Removed from the diary. The video is in your Google Drive trash for 30 days if you change your mind.'};
}


/* ================= penpenAudit (original penpen code) ================= */
/**
 * penpen · Auditor + group expense receipt
 * penpenAudit()  — re-checks every number on its own (not trusting the sheet formulas), lists problem entries,
 *                  makes the shortest settle-up plan and shows the change log.
 * penpenReceipt() — receipt-style page of all group expenses (printable in the app).
 * penpenReceiptPdf(email) — same receipt as a PDF in your Drive; optionally emailed to every traveler.
 * Change log tab: every add / edit / delete / undo / fix, made in penpen or typed into the Expenses tab.
 */
const PP_LOG = 'Change log';

/* ============================ change log ============================ */
function penpenSetupAudit_(ss) {
  let s = ss.getSheetByName(PP_LOG);
  if (!s) {
    s = baseSheet(ss.insertSheet(PP_LOG), 5, 500);
    s.getRange(1, 1, 1, 5).setValues([['When', 'Who', 'What happened', 'Entry', 'Details']]);
    headerStyle(s.getRange(1, 1, 1, 5), true);
    s.setFrozenRows(1);
    [140, 90, 120, 260, 420].forEach((w, i) => s.setColumnWidth(i + 1, w));
    s.getRange(2, 1, s.getMaxRows() - 1, 1).setNumberFormat('mmm d, h:mm am/pm');
    s.setTabColor('#64748b');
    s.protect().setDescription('Change log — written by penpen').setWarningOnly(true);
  }
  return s;
}

function ppLog_(action, entry, details, who) {
  try {
    const ss = ss_(), s = ss.getSheetByName(PP_LOG); if (!s) return;
    if (!who) { const em = ppEmail_(); who = getSpeaker(getCtx(ss), em) || em || 'someone'; }
    s.insertRowAfter(1);
    s.getRange(2, 1, 1, 5).setValues([[new Date(), who, action, String(entry || ''), String(details || '')]]);
  } catch (e) { console.warn('log: ' + e); }
}

/* manual edits in the Expenses tab (called from the installable on-edit trigger) */
function ppSheetEditLog_(e, sh) {
  const r = e.range;
  if (r.getRow() < FR || r.getColumn() > PX_USER) return;
  const heads = ['Date', 'What', 'Category', 'Amount', 'Currency', 'Paid by', 'For', 'Paid?', 'Notes'];
  let who = '';
  try { const em = String((e.user && e.user.getEmail && e.user.getEmail()) || '').toLowerCase(); who = getSpeaker(getCtx(sh.getParent()), em) || em; } catch (x) {}
  if (r.getNumRows() === 1 && r.getNumColumns() === 1) {
    const what = sh.getRange(r.getRow(), PX.what).getDisplayValue();
    ppLog_('Edited in sheet', what || 'row ' + r.getRow(), heads[r.getColumn() - 1] + ': ' + (e.oldValue === undefined ? '—' : e.oldValue) + ' → ' + (e.value === undefined ? '(cleared)' : e.value), who || 'sheet');
  } else ppLog_('Edited in sheet', 'rows ' + r.getRow() + '–' + r.getLastRow(), r.getNumRows() + ' rows × ' + r.getNumColumns() + ' columns changed (paste or clear)', who || 'sheet');
}

/* ============================ the numbers, recomputed ============================ */
function ppBook_(ss) {
  const ctx = getCtx(ss), names = ctx.names, sh = ss.getSheetByName(EXP), n = Math.max(nextRow(sh) - FR, 0);
  const rows = n ? sh.getRange(FR, 1, n, PX_LAST).getValues() : [], disp = n ? sh.getRange(FR, 1, n, PX.entry).getDisplayValues() : [];
  const weights = ss.getRangeByName('Weights').getValues().slice(0, names.length).map(r => Number(r[0]) || 0);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1, live = Number(named(ss, 'LiveRate')) || 1;
  const home = ctx.home, local = ctx.local;
  const toLocal = (amt, cur, rate) => cur === local ? amt : cur === home ? amt * (Number(rate) || live) : NaN;
  const P = {};
  names.forEach(nm => P[nm] = {name: nm, paid: 0, share: 0, put: 0});
  const items = [];
  rows.forEach((r, i) => {
    const st = String(r[PX.status - 1]), amt = Number(r[PX.amt - 1]), cur = String(r[PX.cur - 1]);
    if (!st || !(amt > 0)) return;
    const L = toLocal(amt, cur, r[PX.rate - 1]);
    const it = {row: i + FR, key: r[0] instanceof Date ? ppDay_(r[0], ppTz_(ss)) : String(r[0]), date: disp[i][0], what: String(r[PX.what - 1]), cat: String(r[PX.cat - 1]), amt: amt, cur: cur, local: L,
      by: String(r[PX.by - 1]), forr: String(r[PX.forr - 1]), paid: String(r[PX.paid - 1]), status: st, entry: disp[i][10], rate: r[PX.rate - 1],
      counts: /^(✅ Split|👛|🔁|💸)/.test(st), spend: /^(✅|👛|🔁)/.test(st), sheetShare: names.map((nm, k) => Number(r[PX.share + k - 1]) || 0)};
    // own split
    it.myShare = names.map((nm, k) => it.forr === 'Shared' ? amt * weights[k] / wsum : (it.forr === nm ? amt : 0));
    if (it.counts && isFinite(L)) {
      const f = L / amt;
      names.forEach((nm, k) => { P[nm].share += it.myShare[k] * f; if (it.by === nm) P[nm].paid += L; });
    }
    items.push(it);
  });
  // pocket money
  const pm = ss.getSheetByName(PM);
  let pin = 0;
  if (pm && pm.getLastRow() > 2) pm.getRange(3, 1, pm.getLastRow() - 2, 4).getValues().forEach(r => {
    const a = Number(r[2]); if (!(a > 0)) return;
    const L = toLocal(a, String(r[3]), live); pin += L; if (P[String(r[1])]) P[String(r[1])].put += L;
  });
  const pout = items.filter(i => /^👛/.test(i.status) && isFinite(i.local)).reduce((a, i) => a + i.local, 0);
  const left = pin - pout;
  names.forEach((nm, k) => { const p = P[nm]; p.w = weights[k] / wsum; p.paidAll = p.paid + p.put - p.w * left; p.balance = p.paidAll - p.share; });
  return {ctx: ctx, names: names, people: names.map(nm => P[nm]), items: items, pocket: {in: pin, out: pout, left: left}, live: live, home: home, local: local,
    sym: String(named(ss, 'LocalSym') || '₱'), hsym: String(named(ss, 'HomeSym') || '$')};
}

function ppSettlePlan_(people) {
  const d = people.map(p => ({name: p.name, v: Math.round(p.balance * 100) / 100}));
  const pay = d.filter(x => x.v < -0.5).sort((a, b) => a.v - b.v), get = d.filter(x => x.v > 0.5).sort((a, b) => b.v - a.v), out = [];
  let i = 0, j = 0;
  while (i < pay.length && j < get.length) {
    const amt = Math.min(-pay[i].v, get[j].v);
    out.push({from: pay[i].name, to: get[j].name, amt: Math.round(amt * 100) / 100});
    pay[i].v += amt; get[j].v -= amt;
    if (pay[i].v > -0.5) i++;
    if (get[j].v < 0.5) j++;
  }
  return out;
}

function ppFmt_(sym, n) { return sym + Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

/* ============================ audit ============================ */
function penpenAudit() {
  const ss = ss_(), bk = ppBook_(ss), S = bk.sym, checks = [], issues = [];
  const add = (ok, name, detail) => checks.push({ok: ok, name: name, detail: detail});
  // 1 every shared cost splits exactly (penpen's own split vs the sheet's split)
  const bad = bk.items.filter(i => i.counts && (Math.abs(i.myShare.reduce((a, b) => a + b, 0) - i.amt) > 0.01 || i.myShare.some((v, k) => Math.abs(v - i.sheetShare[k]) > 0.01)));
  add(!bad.length, 'Every cost is split exactly', bad.length ? bad.length + ' entr' + (bad.length === 1 ? 'y doesn’t' : 'ies don’t') + ' split right: ' + bad.map(b => b.what).join(', ') : bk.items.filter(i => i.counts).length + ' entries, each split to the centavo');
  // 2 balances net to zero
  const net = bk.people.reduce((a, p) => a + p.balance, 0);
  add(Math.abs(net) < 1, 'Who-owes-who adds up to zero', 'What some get back equals what others owe (difference ' + ppFmt_(S, Math.abs(net)) + ')');
  // 3 dashboard matches penpen's own recount
  const d = ss.getSheetByName(DASH), B = d.getRange(1, 2, 60, 1).getDisplayValues().map(r => String(r[0]).trim());
  const h = B.findIndex((x, i) => x === 'Person' && i > 0);
  const dash = h >= 0 ? d.getRange(h + 2, 2, MAXP, 8).getValues().filter(r => r[0]) : [];
  const miss = bk.people.filter(p => { const r = dash.find(x => x[0] === p.name); return !r || Math.abs(Number(r[7]) - p.balance) > 1; });
  add(!miss.length, 'Dashboard matches penpen’s own recount', miss.length ? 'Different for ' + miss.map(p => p.name).join(', ') + ' — open the Dashboard to refresh, then audit again' : 'Recounted every balance from scratch: same numbers');
  // 4 pocket money
  add(bk.pocket.left > -0.01, 'Pocket money adds up', 'Put in ' + ppFmt_(S, bk.pocket.in) + ' − spent ' + ppFmt_(S, bk.pocket.out) + ' = ' + ppFmt_(S, bk.pocket.left) + ' left' + (bk.pocket.left < -0.01 ? ' — more was spent than was put in!' : ''));
  // 5 currencies
  const conv = bk.items.filter(i => i.cur === bk.home), noRate = conv.filter(i => !Number(i.rate)), unk = bk.items.filter(i => !isFinite(i.local));
  add(!unk.length, 'Currencies converted', conv.length + ' ' + bk.home + ' entr' + (conv.length === 1 ? 'y' : 'ies') + ' converted' + (noRate.length ? ' (' + noRate.length + ' use today’s live rate ' + bk.live.toFixed(2) + ' because no rate was locked)' : ' at the rate locked when added') + (unk.length ? '; ' + unk.length + ' with an unknown currency' : ''));
  // problem entries
  bk.items.filter(i => /^⚠/.test(i.status)).forEach(i => issues.push({kind: 'fix', row: i.row, what: i.what, date: i.date, detail: i.entry || 'needs a look'}));
  const seen = {};
  bk.items.filter(i => i.spend || /^⏳/.test(i.status)).forEach(i => {
    const k = i.date + '|' + i.amt + '|' + i.cur;
    if (seen[k]) issues.push({kind: 'dup', row: i.row, what: i.what, date: i.date, detail: 'Same day and amount as “' + seen[k].what + '” — a double entry?'});
    else seen[k] = i;
  });
  const sp = bk.items.filter(i => i.spend && isFinite(i.local)).map(i => i.local).sort((a, b) => a - b);
  const med = sp.length ? sp[Math.floor(sp.length / 2)] : 0;
  bk.items.filter(i => i.spend && isFinite(i.local) && sp.length >= 5 && i.local > Math.max(5 * med, 5000)).forEach(i => issues.push({kind: 'big', row: i.row, what: i.what, date: i.date, detail: 'Much bigger than usual (' + ppFmt_(S, i.local) + ') — just double-check the amount'}));
  bk.items.filter(i => /^⏳/.test(i.status)).forEach(i => issues.push({kind: 'notyet', row: i.row, what: i.what, date: i.date, detail: 'Not paid yet · ' + ppFmt_(S, i.local) + (i.by ? ' · ' + i.by + ' will pay' : '')}));
  bk.items.filter(i => /^🔁/.test(i.status)).forEach(i => issues.push({kind: 'covered', row: i.row, what: i.what, date: i.date, detail: i.forr + ' still owes ' + i.by + ' ' + ppFmt_(S, i.local)}));
  // change log
  const lg = ss.getSheetByName(PP_LOG), log = [];
  if (lg && lg.getLastRow() > 1) lg.getRange(2, 1, Math.min(lg.getLastRow() - 1, 15), 5).getDisplayValues().forEach(r => log.push({when: r[0], who: r[1], action: r[2], entry: r[3], details: r[4]}));
  const okAll = checks.every(c => c.ok);
  const tz = ppTz_(ss);
  return {ok: okAll, stamp: Utilities.formatDate(new Date(), tz, 'MMM d, yyyy h:mm a'), checks: checks, issues: issues,
    settle: ppSettlePlan_(bk.people).map(x => ({from: x.from, to: x.to, amt: ppFmt_(S, x.amt)})),
    people: bk.people.map(p => ({name: p.name, paid: ppFmt_(S, p.paidAll), share: ppFmt_(S, p.share), balance: ppFmt_(S, p.balance), bal: p.balance})),
    total: ppFmt_(S, bk.items.filter(i => i.spend && isFinite(i.local)).reduce((a, i) => a + i.local, 0)), log: log,
    summary: okAll ? 'All ' + checks.length + ' checks passed — the math is right.' : checks.filter(c => !c.ok).length + ' check(s) need attention.'};
}

/* ============================ receipt ============================ */
function ppReceiptHtml_(ss, forPdf) {
  const bk = ppBook_(ss), a = penpenAudit(), S = bk.sym, tz = ppTz_(ss), e = esc_;
  const trip = String(named(ss, 'TripName') || ss.getName()), st = named(ss, 'TripStart'), en = named(ss, 'TripEnd');
  const dates = (st instanceof Date && en instanceof Date) ? Utilities.formatDate(st, tz, 'MMM d') + ' – ' + Utilities.formatDate(en, tz, 'MMM d, yyyy') : '';
  const group = bk.items.filter(i => i.spend).sort((x, y) => x.key < y.key ? -1 : x.key > y.key ? 1 : x.row - y.row);
  const settles = bk.items.filter(i => /^💸/.test(i.status)), todo = bk.items.filter(i => /^⏳/.test(i.status));
  const money = (i) => (i.cur === bk.local ? '' : '<span class="o">' + e((i.cur === bk.home ? bk.hsym : i.cur + ' ') + i.amt.toFixed(2)) + '</span>') + e(ppFmt_(S, i.local));
  const forTxt = i => i.forr === 'Shared' ? 'shared' : 'for ' + i.forr;
  let total = 0;
  const rows = group.map(i => { total += isFinite(i.local) ? i.local : 0;
    return '<tr><td>' + e(i.date) + '</td><td>' + e(i.what) + '<div class="s">' + e(i.cat) + ' · ' + e(i.by === POCKET ? 'pocket money' : i.by + ' paid') + ' · ' + e(forTxt(i)) + (/^✅ Paid back/.test(i.status) ? ' · paid back' : '') + '</div></td><td class="r">' + money(i) + '</td></tr>'; }).join('');
  const css = '.rcpt{max-width:720px;margin:0 auto;background:#fff;color:#12324A;font-family:Nunito,Arial,sans-serif;font-size:13px;padding:24px 22px;border-radius:16px}' +
    '.rcpt h1{font-family:Fredoka,Nunito,sans-serif;font-weight:500;font-size:24px;margin:0;color:#0B7F8C}.rcpt h2{font-size:12px;letter-spacing:.08em;color:#4F6475;margin:18px 0 6px;font-weight:700}' +
    '.rcpt .m{color:#4F6475}.rcpt table{width:100%;border-collapse:collapse}.rcpt td,.rcpt th{padding:6px 4px;border-bottom:1px dashed #d8cdb6;vertical-align:top;text-align:left}' +
    '.rcpt th{font-size:11px;color:#4F6475}.rcpt .r{text-align:right;white-space:nowrap}.rcpt .s{font-size:11px;color:#4F6475}.rcpt .o{font-size:11px;color:#4F6475;margin-right:6px}' +
    '.rcpt .tot td{border-bottom:2px solid #12324A;font-weight:700;font-size:15px}.rcpt .stamp{border:2px solid ' + (a.ok ? '#2E8B57' : '#A44A00') + ';color:' + (a.ok ? '#2E8B57' : '#A44A00') + ';border-radius:10px;padding:8px 12px;margin-top:16px;font-weight:700}' +
    '.rcpt .hd{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:2px solid #12324A;padding-bottom:10px}.rcpt .pos{color:#2E8B57;font-weight:700}.rcpt .neg{color:#B3261E;font-weight:700}' +
    '.rcpt .ft{margin-top:18px;font-size:11px;color:#4F6475;text-align:center}';
  const h = '<div class="rcpt"><div class="hd"><div><h1>🐧 penpen · Group expense receipt</h1><div><b>' + e(trip) + '</b>' + (dates ? ' · ' + e(dates) : '') + '</div>' +
    '<div class="m">Travelers: ' + e(bk.names.join(', ')) + '</div></div><div class="m r">Printed<br>' + e(Utilities.formatDate(new Date(), tz, 'MMM d, yyyy h:mm a')) + '</div></div>' +
    '<h2>GROUP EXPENSES (' + group.length + ')</h2><table><tr><th>Date</th><th>What</th><th class="r">Amount (' + e(bk.local) + ')</th></tr>' + rows +
    '<tr class="tot"><td></td><td>Total group spending</td><td class="r">' + e(ppFmt_(S, total)) + '<div class="s">≈ ' + e(bk.hsym + (total / bk.live).toFixed(2)) + ' ' + e(bk.home) + '</div></td></tr></table>' +
    (todo.length ? '<h2>STILL TO PAY (not counted yet)</h2><table>' + todo.map(i => '<tr><td>' + e(i.date) + '</td><td>' + e(i.what) + '<div class="s">' + e(i.by ? i.by + ' will pay' : 'payer not set') + '</div></td><td class="r">' + money(i) + '</td></tr>').join('') + '</table>' : '') +
    (settles.length ? '<h2>PAID BACK ALREADY</h2><table>' + settles.map(i => '<tr><td>' + e(i.date) + '</td><td>' + e(i.by + ' paid ' + i.forr + ' back') + '</td><td class="r">' + money(i) + '</td></tr>').join('') + '</table>' : '') +
    '<h2>POCKET MONEY</h2><table><tr><td>Put in</td><td class="r">' + e(ppFmt_(S, bk.pocket.in)) + '</td></tr><tr><td>Spent from it</td><td class="r">' + e(ppFmt_(S, bk.pocket.out)) + '</td></tr><tr><td><b>Left</b></td><td class="r"><b>' + e(ppFmt_(S, bk.pocket.left)) + '</b></td></tr></table>' +
    '<h2>EACH PERSON</h2><table><tr><th>Person</th><th class="r">Paid</th><th class="r">Fair share</th><th class="r">Balance</th></tr>' +
    a.people.map(p => '<tr><td><b>' + e(p.name) + '</b></td><td class="r">' + e(p.paid) + '</td><td class="r">' + e(p.share) + '</td><td class="r ' + (p.bal >= 0 ? 'pos' : 'neg') + '">' + e((p.bal >= 0 ? '+' : '−') + p.balance.replace('-', '')) + '</td></tr>').join('') + '</table>' +
    '<div class="s">+ gets money back · − owes. Personal items aren’t on this receipt.</div>' +
    '<h2>TO SETTLE UP</h2>' + (a.settle.length ? '<table>' + a.settle.map(x => '<tr><td><b>' + e(x.from) + '</b> pays <b>' + e(x.to) + '</b></td><td class="r"><b>' + e(x.amt) + '</b></td></tr>').join('') + '</table>' : '<div>✅ Everyone is square.</div>') +
    '<div class="stamp">' + (a.ok ? '✓ Audited by penpen: ' : '⚠ penpen audit: ') + e(a.summary) + ' (' + e(a.stamp) + ')</div>' +
    '<div class="ft">Made with penpen 🐧 · amounts in ' + e(bk.local) + '; ' + e(bk.home) + ' items converted at the rate locked when they were added.</div></div>';
  if (!forPdf) return {css: css, html: h};
  return '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fff}' + css + '.rcpt{border-radius:0}</style></head><body>' + h + '</body></html>';
}

function penpenReceipt() { return ppReceiptHtml_(ss_(), false); }

function penpenReceiptPdf(sendEmail) {
  const ss = ss_(), tz = ppTz_(ss);
  const name = 'penpen receipt · ' + String(named(ss, 'TripName') || 'trip') + ' · ' + Utilities.formatDate(new Date(), tz, 'MMM d h.mm a') + '.pdf';
  const pdf = HtmlService.createHtmlOutput(ppReceiptHtml_(ss, true)).getAs('application/pdf').setName(name);
  const it = DriveApp.getFoldersByName('penpen receipts'), folder = it.hasNext() ? it.next() : DriveApp.createFolder('penpen receipts');
  const f = folder.createFile(pdf);
  let sent = '';
  if (sendEmail === true) {
    const to = getCtx(ss).people.map(p => p.email).filter(Boolean);
    if (!to.length) throw new Error('No traveler emails on Trip Details yet.');
    const me = getSpeaker(getCtx(ss), ppEmail_()) || '';
    MailApp.sendEmail({to: to.join(','), subject: '🐧 penpen · group expense receipt — ' + String(named(ss, 'TripName') || ''), name: 'penpen',
      body: 'Hi! Here is the group expense receipt' + (me ? ', sent by ' + me : '') + '. It’s checked by penpen’s auditor — open the PDF to see every expense, who paid what and how to settle up.\n\n— penpen 🐧',
      attachments: [pdf]});
    sent = to.join(', ');
    ppLog_('Receipt emailed', 'Group expense receipt', 'to ' + sent);
  }
  return {url: f.getUrl(), name: name, sent: sent};
}

function penpenTest6() {
  const a = penpenAudit();
  console.log(JSON.stringify({ok: a.ok, summary: a.summary, checks: a.checks, issues: a.issues, settle: a.settle, people: a.people, total: a.total}, null, 1));
  console.log('RECEIPT html ' + ppReceiptHtml_(ss_(), true).length + ' chars');
}


/* ================= penpenDrive (original penpen code) ================= */
/**
 * penpen · Stage 1 — hotels at the start and end of each day + drive times between stops.
 * Hotels come from the Bookings tab (Section = Accommodation, Date = check-in, Details start "Check-out <day>").
 * Drive times come from Google Maps (built-in Maps service), cached for 6 hours.
 */
function ppStays_(ss) {
  const sh = ss.getSheetByName('Bookings'); if (!sh || sh.getLastRow() < 2) return [];
  const tz = ppTz_(ss);
  return sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().map(function (r) {
    if (!(r[0] instanceof Date) || String(r[1]).toLowerCase().indexOf('accommodation') < 0) return null;
    const det = String(r[4] || ''), parts = det.split('\u00b7').map(function (x) { return x.trim(); });
    const m = det.match(/check-?out\s+(?:[a-z]{3},?\s+)?([a-z]{3,9})\.?\s+(\d{1,2})/i);
    let to = '';
    if (m) {
      const d = new Date(m[1] + ' ' + m[2] + ', ' + r[0].getFullYear() + ' 12:00');
      if (!isNaN(d.getTime())) { if (d < r[0]) d.setFullYear(d.getFullYear() + 1); to = ppDay_(d, tz); }
    }
    const inT = (det.match(/\bin\s+(\d{1,2}(?::\d\d)?\s*[ap]m)/i) || [])[1] || '';
    const outT = (det.match(/\bout\s+(\d{1,2}(?::\d\d)?\s*[ap]m)/i) || [])[1] || '';
    const place = parts.slice(1).filter(function (p) { return p && !/^(in|out)\s/i.test(p) && !/^check-?out/i.test(p) && p.indexOf('\u2192') < 0; })
      .join(', ').replace(/\s*\([^)]*\)/g, '').trim();
    const name = String(r[3] || '').trim();
    return {name: name, base: name.replace(/\s*\([^)]*\)\s*$/, ''), from: ppDay_(r[0], tz), to: to, place: place,
      inTime: inT, outTime: outT, moving: /boat|ferry|rest stop|tbd/i.test(name)};
  }).filter(function (x) { return x && x.name; });
}

function ppDur_(secs) {
  const m = Math.max(1, Math.round(secs / 60)); if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + r + ' min' : '');
}

function ppDrive_(a, b) {
  if (!a || !b || a === b) return null;
  const c = CacheService.getScriptCache();
  const key = 'ppdrv_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, a + '|' + b, Utilities.Charset.UTF_8));
  const hit = c.get(key); if (hit) return JSON.parse(hit);
  let res = null;
  try {
    const d = Maps.newDirectionFinder().setOrigin(a).setDestination(b).setMode(Maps.DirectionFinder.Mode.DRIVING).setRegion('ph').getDirections();
    const leg = d && d.routes && d.routes.length ? d.routes[0].legs[0] : null;
    if (leg) res = {text: ppDur_(leg.duration.value), secs: leg.duration.value, km: Math.round(leg.distance.value / 100) / 10};
  } catch (e) { res = null; }
  c.put(key, JSON.stringify(res), 21600);
  return res;
}

function ppPoint_(p) {
  if (!p || p.moving) return '';
  if (p.lat && p.lng) return p.lat + ',' + p.lng;
  const q = [p.name, p.place].filter(function (x) { return x; }).join(', ');
  return q ? q + ppPlaceName_(ss_()) : '';
}

/** Plan screen: day = 'yyyy-MM-dd', stops = [{name, place, lat, lng}] in order. */
function penpenDayExtras(day, stops) {
  const ss = ss_();
  const stays = ppStays_(ss);
  const start = stays.filter(function (s) { return s.from < day && s.to && day <= s.to; })[0] || null;
  const end = stays.filter(function (s) { return s.from <= day && (!s.to || day < s.to); })[0] || null;
  const card = function (s, isStart) {
    if (!s) return null;
    return {name: s.name, place: s.place, moving: s.moving, back: !isStart && start && s.base === start.base,
      time: isStart ? (s.outTime ? 'Check out by ' + s.outTime : 'Check out') : (s.inTime ? 'Check in from ' + s.inTime : 'Check in')};
  };
  const key = function (s) { const w = s.base.toLowerCase().split(/\s+/); return (w[0].length >= 4 ? w[0] : w.slice(0, 2).join(' ')).replace(/[\u2019']s$/, ''); };
  const has = function (stop, s) { return !!(stop && s && ((stop.name || '') + ' ' + (stop.place || '')).toLowerCase().indexOf(key(s)) >= 0); };
  const list = stops || [];
  const st = has(list[0], start) ? null : start, en = has(list[list.length - 1], end) ? null : end;
  const pts = [];
  if (st) pts.push(st);
  list.forEach(function (s) { pts.push(s); });
  if (en) pts.push(en);
  const legs = [];
  // no drive time after a flight or a boat: that leg is the flight/boat itself
  const riding = function (p) { return /\bflight\b|\bfly\b|✈|ferry|\bboat\b|\bship\b|cruise/i.test(((p && p.name) || '') + ' ' + ((p && p.what) || '')); };
  for (let i = 0; i < pts.length - 1 && i < 14; i++) legs.push(riding(pts[i]) ? null : ppDrive_(ppPoint_(pts[i]), ppPoint_(pts[i + 1])));
  return {start: card(st, true), end: card(en, false), legs: legs};
}

function penpenTestDrive() {
  Logger.log(JSON.stringify(ppStays_(ss_())));
  Logger.log(JSON.stringify(penpenDayExtras('2026-12-07', [{name: 'Oslob whale shark watching', place: 'Oslob, Cebu'}])));
}


/** Money screen: group spending (shared + paid) per category and currency. The app converts to the trip currency with the live rate. */
function penpenMoneyCats() {
  const out = {};
  (ppExpenseRows_(ss_()) || []).forEach(function (x) {
    if (String(x.paid) !== 'Paid' || String(x.forr) !== 'Shared') return;
    const v = parseFloat(String(x.amt).replace(/,/g, '')) || 0; if (!v) return;
    const k = String(x.cat || 'Other'), c = String(x.cur || 'PHP');
    out[k] = out[k] || {}; out[k][c] = (out[k][c] || 0) + v;
  });
  return {cats: out, rate: Number(named(ss_(), 'LiveRate')) || 0};
}


/* ================= penpenProfiles (original penpen code) ================= */
/**
 * penpen · Stage 2 — profiles.
 * Profiles tab: Name · Family role · Crew job · Penguin (settings) · Flight · Phone · Updated
 * Everyone can see everyone's penguin, role, job, flight and phone. Each person can only change their own row.
 * Private things (own diary, hidden "just me" spending) are not stored here.
 */
const PROF = 'Profiles';
const PROF_HEAD = ['Name', 'Family role', 'Crew job', 'Penguin (settings)', 'Flight', 'Phone', 'Updated'];

function ppProfSheet_(ss) {
  let sh = ss.getSheetByName(PROF);
  if (!sh) {
    sh = ss.insertSheet(PROF);
    sh.getRange(1, 1, 1, PROF_HEAD.length).setValues([PROF_HEAD]).setFontWeight('bold').setBackground('#DCEDE7');
    sh.setFrozenRows(1); sh.setColumnWidth(4, 320); sh.setColumnWidth(5, 240);
    sh.getRange('F:F').setNumberFormat('@');
  }
  return sh;
}

function ppPeopleNames_(ss) {
  const r = ss.getRangeByName('People');
  return r ? r.getValues().map(function (x) { return String(x[0] || '').trim(); }).filter(function (x) { return x; }) : [];
}

function penpenProfiles() {
  const ss = ss_(), ctx = getCtx(ss), me = getSpeaker(ctx, ppEmail_()) || '';
  const sh = ppProfSheet_(ss);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, PROF_HEAD.length).getValues() : [];
  const byName = {};
  rows.forEach(function (r) {
    const n = String(r[0] || '').trim(); if (!n) return;
    let av = null; try { av = JSON.parse(r[3] || 'null'); } catch (e) { av = null; }
    byName[n.toLowerCase()] = {name: n, role: String(r[1] || ''), job: String(r[2] || ''), avatar: av, flight: String(r[4] || ''), phone: String(r[5] || ''), saved: true};
  });
  const names = ppPeopleNames_(ss);
  const low = names.map(function (n) { return n.toLowerCase(); });
  Object.keys(byName).forEach(function (k) { if (low.indexOf(k) < 0) { names.push(byName[k].name); low.push(k); } });
  const people = names.map(function (n) {
    const p = byName[n.toLowerCase()] || {name: n, role: '', job: '', avatar: null, flight: '', phone: '', saved: false};
    p.isMe = !!me && n.toLowerCase() === me.toLowerCase();
    return p;
  });
  let url = ''; try { url = ScriptApp.getService().getUrl(); } catch (e) {}
  return {me: me, tripType: PropertiesService.getScriptProperties().getProperty(ppK_('pp_trip_type')) || '', people: people, url: url, trip: ppTripCard_(ss)};
}

/** Saves the signed-in traveler's own profile only. p = {tripType, role, job, avatar, flight, phone} (any subset). */
function penpenSaveProfile(p) {
  const ss = ss_(), ctx = getCtx(ss), me = getSpeaker(ctx, ppEmail_());
  if (!me) throw new Error('I don\u2019t know who you are yet \u2014 add your Google email on Trip Details.');
  p = p || {};
  if (p.tripType) PropertiesService.getScriptProperties().setProperty(ppK_('pp_trip_type'), String(p.tripType).slice(0, 30));
  const sh = ppProfSheet_(ss), last = sh.getLastRow();
  const names = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0] || '').trim().toLowerCase(); }) : [];
  let row = names.indexOf(me.toLowerCase()); row = row >= 0 ? row + 2 : last + 1;
  const old = row <= last ? sh.getRange(row, 1, 1, PROF_HEAD.length).getValues()[0] : ['', '', '', '', '', '', ''];
  const val = function (k, i) { return p[k] !== undefined && p[k] !== null ? String(p[k]).slice(0, 300) : old[i]; };
  const av = p.avatar !== undefined && p.avatar !== null ? JSON.stringify(p.avatar).slice(0, 2000) : old[3];
  sh.getRange(row, 6).setNumberFormat('@');
  sh.getRange(row, 1, 1, PROF_HEAD.length).setValues([[me, val('role', 1), val('job', 2), av, val('flight', 4), val('phone', 5), new Date()]]);
  return penpenProfiles();
}

function penpenTestProfiles() { Logger.log(JSON.stringify(penpenProfiles())); }

function ppTripCard_(ss) {
  const tz = ppTz_(ss), s = named(ss, 'TripStart'), e = named(ss, 'TripEnd');
  return {name: String(named(ss, 'TripName') || ss.getName()),
    dates: (s instanceof Date && e instanceof Date) ? Utilities.formatDate(s, tz, 'MMM d') + ' \u2013 ' + Utilities.formatDate(e, tz, 'MMM d, yyyy') : ''};
}

/** Start from a selfie: Gemini picks style features only. The photo is not stored anywhere. */
function penpenSelfie(dataUrl) {
  const key = String(PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '').trim();
  if (!key) throw new Error('The AI isn\u2019t set up yet, so pick your look by hand below.');
  const b64 = String(dataUrl || '').replace(/^data:[^,]+,/, ''); if (!b64) throw new Error('No photo came through.');
  const prompt = 'Look at this selfie and return only JSON with these style features, nothing else: ' +
    '{"glasses":true|false,"beard":true|false,"mustache":true|false,"hair":"none|curly|long|bob|bun|pony|spiky|wavy|tuft",' +
    '"hairColor":"black|brown|blonde|ginger|grey|pink|blue","topColor":"red|orange|green|pink|blue|tan|other"}. ' +
    'Pick the closest option for each. If there is no person in the photo return {"none":true}. Do not describe the face, skin, age, body or anything else.';
  const body = {contents: [{parts: [{text: prompt}, {inline_data: {mime_type: 'image/jpeg', data: b64}}]}], generationConfig: {responseMimeType: 'application/json', temperature: 0.1}};
  const models = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  for (let i = 0; i < models.length; i++) {
    try {
      const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent',
        {method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: {'x-goog-api-key': key}, payload: JSON.stringify(body)});
      if (res.getResponseCode() !== 200) continue;
      const j = JSON.parse(res.getContentText());
      const t = j.candidates[0].content.parts.map(function (x) { return x.text || ''; }).join('');
      return JSON.parse(t.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
    } catch (e) {}
  }
  throw new Error('penpen couldn\u2019t read that photo. Try again in better light, or pick by hand below.');
}

/* ================= penpen chat brain + voice (new) ================= */
// penpen as a real conversational AI: remembers the chat, knows the trip, answers anything,
// and hands "do something" messages (log expense, settle, undo, diary, who owes…) to penpenAsk.
var PPC_T = [];
var PPC_PERSONAS = {
  bubbly:   { voice: 'Puck',     say: 'in a cute, cheerful, upbeat little voice', talk: '' },
  sweet:    { voice: 'Leda',     say: 'in a sweet, gentle, young voice', talk: 'Be extra gentle, soft and kind.' },
  hyper:    { voice: 'Fenrir',   say: 'super excited and bouncy, a bit fast', talk: 'Be very excited and full of energy — lots of exclamation marks!' },
  buddy:    { voice: 'Achird',   say: 'in a friendly, relaxed, warm voice', talk: 'Be relaxed and easygoing, like a good buddy.' },
  sunny:    { voice: 'Zephyr',   say: 'in a bright, clear, sunny voice', talk: '' },
  coolcat:  { voice: 'Charon',   say: 'in a deep, smooth, slow, supremely confident voice, like the coolest one in the room', talk: 'Talk like the coolest, most confident smooth operator alive: short punchy lines, unbothered swagger, call people "my friend". Keep it clean, never swear.' },
  goofydad: { voice: 'Umbriel',  say: 'like a loud, goofy, cheerful dad who chuckles at his own jokes', talk: 'You are a goofy dad: sneak in a cheesy dad joke or pun, act proud and a little clueless, chuckle at your own jokes ("heh heh").' },
  trailer:  { voice: 'Algenib',  say: 'like an epic, gravelly movie-trailer narrator, with dramatic pauses', talk: 'Talk like an epic movie-trailer narrator: dramatic and suspenseful, often opening with "In a world..." — even about lunch.' },
  surfer:   { voice: 'Puck',     say: 'like a super chill, laid-back surfer dude with a slow drawl', talk: 'Talk like a totally chill surfer dude: "dude", "stoked", "gnarly", super laid-back vibes.' },
  grandma:  { voice: 'Sulafat',  say: 'like a sweet, warm, caring grandmother, gentle and unhurried', talk: 'Talk like a sweet, caring grandma: call them "dear", gently remind them to eat, rest and bring a jacket, and be proud of them.' },
};
var PPC_OLDVOICE = { lola: 'grandma', Puck: 'bubbly', Leda: 'sweet', Fenrir: 'hyper', Achird: 'buddy', Zephyr: 'sunny' };
function ppcPersona_(k) { k = PPC_OLDVOICE[k] || k; return PPC_PERSONAS[k] ? k : 'bubbly'; }
var PPC_MOODS = ['happy', 'excited', 'cloudy', 'sleep', 'concierge'];

function penpenChat(text, history, persona) {
  var P = PPC_PERSONAS[ppcPersona_(persona)];
  var T0 = Date.now(); PPC_T = [];
  text = String(text || '').slice(0, 1000);
  history = (history || []).slice(-12);
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) return penpenAsk(text);
  var me = '';
  me = __PP_NAME || '';
  var PL = ppPlace_(ss_());
  var sys =
    'You are penpen, a cute, cheerful baby penguin and the AI travel buddy of this group trip. ' +
    'You are talking with ' + (me || 'a traveller on the trip') + '. ' +
    'Personality: warm, playful, curious, a little silly (an occasional penguin pun or "waddle", never every message), genuinely helpful and smart. ' + (P.talk ? 'Character for this person (stay in it, but stay accurate and kind): ' + P.talk + ' ' : '') +
    'Talk like a friend in a chat: usually 1–3 short sentences, longer only when asked for details, lists or plans. Plain text, no markdown. One emoji at most. ' +
    'Be honest about what you can do. You CAN: answer questions, suggest places with Google Maps links, plan a route, log, edit and split expenses, say who owes who, read the itinerary and bookings, give phrases, and start a phone call. You CANNOT book, reserve or pay for anything yourself (hotels, flights, tours, tables, rides), send messages or emails, or check live prices or availability, because you are not connected to booking sites or payments yet. If asked for something you cannot do, say so warmly in your FIRST reply, in one short sentence, then do the closest helpful thing right away (for a booking: name the best 3 options with Maps links and their phone number so they can call, and suggest booking on the hotel site, Agoda or Booking.com). Never ask for dates, names or details for a task you cannot finish. ' +
    'You know a lot: travel tips, the food and culture of ' + (PL.name || 'wherever the trip goes') + ', local phrases (give the phrase + simple pronunciation), packing, safety, weather sense, currency, ideas for things to do. ' +
    'Now and then (not every message) add a quick fun fact about the destination or ask one light question, never more than one. Adapt tips, food and phrases to wherever the trip is. ' +
    'Language: always speak English. Only switch if the person clearly asks you to speak another language. If what you hear sounds like another language (for example Spanish), treat it as English that was misheard and answer in English. Never answer in Spanish unless asked. Single words or noises like ok, sige, salamat, mhm, background chatter never count. ' +
    'Translator: when asked how to say something or to translate, give the phrase in that language, then an easy pronunciation, then carry on in English. ' +
    'New bookings: if they say they booked or changed a flight, hotel, ferry or tour, be helpful and specific: ask only for what is missing (airline or company, flight or booking number, date, departure and arrival times, from and to), suggest they can just read the confirmation out or type the flight number, then confirm it back in one line before saving. ' +
    'You are also the group\'s concierge: like a great hotel concierge you ALWAYS give a real, specific answer — never say you have no maps, no internet or no information. ' +
    'For "where can we…" / "what\'s near…" / food, beaches, parks, malls, pharmacies, ATMs, churches, nightlife, frisbee or sports spots, day trips: recommend 1–3 real, well-known places from your own knowledge near where the group is that day (use the itinerary and hotels in the facts), with one short reason each and rough travel time if you can. ' +
    'When you recommend places, end your reply by offering the links, e.g. "Want me to send you the Google Maps links?", and leave "places" empty. ' +
    'When the person says yes (or asks for a link, map, location or directions), fill "places" with the places being discussed and keep the reply short. Put each one in "places" as {"name": exact place name, "area": city or barangay} so the app can show a Google Maps button — do not write links yourself. ' +
    'If unsure a place is still open or exact hours, still recommend it and add "check hours on Maps". ' +
    'For "plan my day" / "top 5 places today" / "best route": pick the most practical stops that save time — close to today\'s itinerary and hotel, along the way, not backtracking — list them in visiting order in the reply, and put them in that order in "route" (same shape as places). The app turns "route" into one Google Maps route with every stop. ' +
    'When asked to call or text someone (a travel buddy, the hotel, the tour operator, the driver), find their phone number in the TRIP FACTS and put {"name": who, "phone": the number exactly as written} in "call" with a short reply like "Calling Brad — tap the button 📞". If there is no number in the facts, say so and suggest adding it in Crew. Never make up a phone number. ' +
    'Use the TRIP FACTS for anything about this trip. Never invent this group\'s bookings, times, prices paid, amounts or who paid — if it is not in the facts, say you are not sure. ' +
    'Set "action": true (and leave reply empty) when the person wants penpen to RECORD or CHANGE something or to CALCULATE money: ' +
    'logging an expense or payment, settling up, undo, budgets, writing in the diary, or questions like who owes who / totals / balances / how much did we spend. ' +
    'Otherwise "action": false and write the reply. Pick a mood from: ' + PPC_MOODS.join(', ') + '. ' +
    'Answer ONLY with JSON: {"action":boolean,"reply":string,"mood":string,"places":[{"name":string,"area":string}],"route":[{"name":string,"area":string}],"call":{"name":string,"phone":string}}.\n\nTRIP FACTS (today is ' +
    ppcNow_(PL) + '):\n' + ppcFacts_();
  PPC_T.push('facts ' + (Date.now() - T0));
  var contents = [];
  history.forEach(function (h) {
    if (h && h.t) contents.push({ role: h.who === 'me' ? 'user' : 'model', parts: [{ text: String(h.t).slice(0, 600) }] });
  });
  contents.push({ role: 'user', parts: [{ text: text }] });
  var out = ppcGemini_(key, { systemInstruction: { parts: [{ text: sys }] }, contents: contents,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.8, responseSchema: { type: 'OBJECT', properties: { action: { type: 'BOOLEAN' }, reply: { type: 'STRING' }, mood: { type: 'STRING' }, places: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, area: { type: 'STRING' } }, required: ['name'] } }, route: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, area: { type: 'STRING' } }, required: ['name'] } }, call: { type: 'OBJECT', properties: { name: { type: 'STRING' }, phone: { type: 'STRING' } } } }, required: ['action', 'reply', 'mood'] } } });
  if (!out) return penpenAsk(text);
  var j;
  try { j = JSON.parse(out); } catch (e) { return { replies: [String(out).slice(0, 800)], mood: 'happy' }; }
  if (j.action) { var ra = penpenAsk(text); if (ra) ra._t = PPC_T.concat(['ask ' + (Date.now() - T0)]); return ra; }
  var replies = [String(j.reply || '').trim() || 'Hmm, say that again? 🐧'];
  (j.places || []).slice(0, 3).forEach(function (p) {
    if (!p || !p.name) return;
    var q = String(p.name) + (p.area ? ', ' + p.area : '') + (PL.name ? ', ' + PL.name : '');
    replies.push('📍 ' + p.name + (p.area ? ' · ' + p.area : '') + '\nhttps://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q));
  });
  var rt = (j.route || []).filter(function (p) { return p && p.name; }).slice(0, 9);
  if (rt.length > 1) {
    var q = function (p) { return encodeURIComponent(String(p.name) + (p.area ? ', ' + p.area : '') + (PL.name ? ', ' + PL.name : '')); };
    var last = rt[rt.length - 1], mid = rt.slice(0, -1);
    replies.push('🗺️ ' + rt.map(function (p) { return p.name; }).join(' → ') + '\nhttps://www.google.com/maps/dir/?api=1&destination=' + q(last) + '&waypoints=' + mid.map(q).join('%7C') + '&travelmode=driving');
  }
  if (j.call && j.call.phone) {
    var ph = String(j.call.phone).replace(/[^\d+]/g, '');
    if (PL.cc === 'PH' && /^09\d{9}$/.test(ph)) ph = '+63' + ph.slice(1);   // Philippine mobile written locally (0917…)
    else if (/^63\d{10}$/.test(ph)) ph = '+' + ph;
    else if (/^\d{10}$/.test(ph)) ph = '+1' + ph;
    if (ph.replace(/\D/g, '').length >= 7) replies.push('📞 ' + (j.call.name || 'Call') + ' · ' + j.call.phone + '\ntel:' + ph);
  }
  return { _t: PPC_T, replies: replies, mood: PPC_MOODS.indexOf(j.mood) >= 0 ? j.mood : 'concierge' };
}

function ppcGemini_(key, body) {
  var models = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
  for (var i = 0; i < models.length; i++) {
    try {
      var T1 = Date.now();
      var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent', {
        method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key },
        payload: JSON.stringify(body), muteHttpExceptions: true });
      PPC_T.push(models[i] + ' ' + r.getResponseCode() + ' ' + (Date.now() - T1));
      if (r.getResponseCode() !== 200) continue;
      var c = JSON.parse(r.getContentText()).candidates;
      var t = c && c[0] && c[0].content && c[0].content.parts && c[0].content.parts.map(function (p) { return p.text || ''; }).join('');
      if (t) return t;
    } catch (e) {}
  }
  return '';
}

// Compact facts about the trip for penpen, cached for 10 minutes.
// "today is Wed 25 Nov 2026, 3:00 PM where the trip is (Asia/Tokyo, Japan)"
function ppcNow_(PL) { return 'today is ' + Utilities.formatDate(new Date(), PL.tz, 'EEE d MMM yyyy, h:mm a') + ' where the trip is (' + PL.tz + (PL.name ? ', ' + PL.name : '') + ')'; }
function ppcFacts_() {
  var cache = CacheService.getScriptCache(), hit = cache.get(ppK_('ppc_facts'));
  if (hit) return hit;
  var ss = ss_(), lines = [];
  function tabText(name, maxRows) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var v = sh.getDataRange().getDisplayValues().filter(function (r) { return r.join('').trim() !== ''; }).slice(0, maxRows);
    lines.push('## ' + name);
    v.forEach(function (r) { lines.push(r.filter(function (c) { return String(c).trim() !== ''; }).join(' | ')); });
  }
  tabText('Trip Details', 40);
  tabText('Itinerary', 80);
  tabText('Bookings', 40);
  tabText('Contacts', 40);
  try {
    var p = ss.getSheetByName('Profiles');
    if (p) {
      lines.push('## Travel buddies');
      p.getDataRange().getDisplayValues().slice(1).forEach(function (r) { if (r[0]) lines.push(r[0] + (r[1] ? ' — ' + r[1] : '') + (r[2] ? ' (' + r[2] + ')' : '')); });
    }
  } catch (e) {}
  var txt = lines.join('\n').slice(0, 9000);
  cache.put(ppK_('ppc_facts'), txt, 600);
  return txt;
}

// penpen's AI voice (Gemini text-to-speech). Returns 16-bit PCM audio as base64.
function penpenVoice(text, voice) {
  var P = PPC_PERSONAS[ppcPersona_(voice)];
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('novoice');
  text = String(text || '').slice(0, 400);
  voice = P.voice;
  var models = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts', 'gemini-flash-tts-latest'];
  var body = JSON.stringify({
    contents: [{ parts: [{ text: 'Say this ' + P.say + ': ' + text }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }
  });
  for (var i = 0; i < models.length; i++) {
    var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent', {
      method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, payload: body, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) continue;
    var c = JSON.parse(r.getContentText()).candidates;
    var part = c && c[0] && c[0].content && c[0].content.parts && c[0].content.parts.filter(function (p) { return p.inlineData; })[0];
    if (part) return { audio: part.inlineData.data, mime: part.inlineData.mimeType || 'audio/L16;rate=24000' };
  }
  throw new Error('novoice');
}

/* ================= penpen Talk space (Gemini Live, real-time voice) ================= */
// Lists models that support live (bidirectional) audio, for the creator to check.
function penpenLiveModels() {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, muteHttpExceptions: true });
  var ms = (JSON.parse(r.getContentText()).models || []);
  return ms.filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('bidiGenerateContent') >= 0; }).map(function (m) { return m.name; });
}

// Gives the app a short-lived, single-use key for one Talk session, plus penpen's instructions.
// The real API key never leaves the server.
function penpenLiveStart(persona, mode, lang) {
  if (mode === 'translate') return ppcInterpreter_(persona, lang);
  return ppcLiveTalk_(persona);
}

// Interpreter: English <-> another language, out loud, nothing else.
function ppcInterpreter_(persona, lang) {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('novoice');
  lang = String(lang || 'Cebuano (Bisaya)').replace(/[^\w ()\-À-ɏ]/g, '').slice(0, 40) || 'Cebuano (Bisaya)';
  var P = PPC_PERSONAS[ppcPersona_(persona)];
  var now = Date.now();
  var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
    method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, muteHttpExceptions: true,
    payload: JSON.stringify({ uses: 1, expireTime: new Date(now + 30 * 60000).toISOString(), newSessionExpireTime: new Date(now + 2 * 60000).toISOString() })
  });
  if (r.getResponseCode() !== 200) throw new Error('live ' + r.getResponseCode());
  var sys = 'You are a live voice interpreter between English and ' + lang + '. ' +
    'When you hear English, say the same thing in natural, polite, everyday ' + lang + '. When you hear ' + lang + ' (or a local mix of it with English), say it in English. ' +
    'Translate only: do not answer questions yourself, do not add comments, greetings or explanations, do not say "they said". Keep names, places, numbers and prices exact. ' +
    'Only ever speak English or ' + lang + (lang === 'Spanish' ? '' : '; never Spanish or any third language') + (/bisaya|cebuano/i.test(lang) ? ' (Bisaya means Cebuano as spoken in Cebu and Mindanao)' : '') + '. ' +
    'If you could not hear clearly, ask briefly to repeat, in the language of the person who just spoke. ' +
    'The English speaker is a traveller; the other person is likely a local driver, vendor or hotel staff where they are travelling.';
  return { token: JSON.parse(r.getContentText()).name, voice: P.voice, system: sys, mode: 'translate' };
}

function ppcLiveTalk_(persona) {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('novoice');
  var P = PPC_PERSONAS[ppcPersona_(persona)];
  var now = Date.now();
  var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
    method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, muteHttpExceptions: true,
    payload: JSON.stringify({ uses: 1, expireTime: new Date(now + 30 * 60000).toISOString(), newSessionExpireTime: new Date(now + 2 * 60000).toISOString() })
  });
  if (r.getResponseCode() !== 200) throw new Error('live ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 200));
  var tok = JSON.parse(r.getContentText()).name;
  var who = __PP_NAME || 'a traveller';
  var sys =
    'You are penpen, a cute baby penguin and the AI travel buddy for this trip, talking out loud with ' + who + ' in a live voice chat. ' +
    'Speak naturally and briefly, like a friend on a call: usually one or two short sentences. Be warm, quick and genuinely helpful. ' +
    (P.talk ? 'Your character: ' + P.talk + ' Speak ' + P.say + '. ' : 'Speak ' + P.say + '. ') +
    'Now and then (not every turn) share a quick fun fact about where they are or are going, or ask one light question — never more than one at a time. ' +
    'Adapt to the trip\'s destination: local food, customs, phrases in the local language with easy pronunciation, safety, weather sense. ' +
    'Language: always speak English. Only switch if the person clearly asks you to speak another language. If what you hear sounds like another language (for example Spanish), treat it as English that was misheard and answer in English. Never answer in Spanish unless asked. Single words or noises like ok, sige, salamat, mhm, background chatter never count. ' +
    'Be honest: you cannot book, reserve or pay for anything, send messages, or check live prices, because you are not connected to booking sites or payments yet. If asked, say so right away in one sentence and offer the closest help (best options, their number to call, where to book). Never collect details for something you cannot do. ' +
    'Translator: when asked how to say something or to translate, give the phrase in that language, then an easy pronunciation, then carry on in English. ' +
    'New bookings: if they say they booked or changed a flight, hotel, ferry or tour, be helpful and specific: ask only for what is missing (airline or company, flight or booking number, date, departure and arrival times, from and to), suggest they can just read the confirmation out or type the flight number, then confirm it back in one line before saving. ' +
    'Use TRIP FACTS for anything about this trip and never invent bookings, times, prices or amounts. ' +
    'When they want to record or change something, or ask about money (log an expense, who paid, split, settle up, undo, who owes who, totals), ' +
    'call the penpen_action tool with their request in plain words, then tell them the result in one short sentence. ' +
    '\n\nTRIP FACTS (' + ppcNow_(ppPlace_(ss_())) + '):\n' + ppcFacts_();
  return { token: tok, voice: P.voice, system: sys };
}

// What the Talk space calls when penpen decides to do something (log expense, who owes…).
function penpenLiveAction(request) {
  var r = penpenAsk(String(request || '').slice(0, 500));
  var said = r && r.replies ? r.replies.map(function (x) { return typeof x === 'string' ? x : (x.text || x.t || ''); }).join(' ') : '';
  return { result: said || 'Done.' };
}

/* ================= Find a business's phone number with Google Search (new) ================= */
// Looks up the official public number of a hotel / tour / airline / ferry. Never people.
function penpenFindNumber(name, details) {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('nokey');
  name = String(name || '').slice(0, 120); details = String(details || '').slice(0, 200);
  var q = 'Using Google Search, find the official public phone number of this business for travellers: "' + name + '"' +
    (details ? ' (' + details + ')' : '') + '. ' + (ppPlace_(ss_()).name ? 'The trip is in ' + ppPlace_(ss_()).name + ' unless the details say otherwise. ' : '') +
    'If this is a private person (like someone\'s emergency contact or a family member), or you cannot find a reliable official number, answer with an empty phone. ' +
    'Reply with ONLY this JSON on one line: {"phone":"<number in international format, or empty>","source":"<website or page name>","url":"<page url>"}';
  var models = ['gemini-flash-latest', 'gemini-flash-lite-latest'], why = [];
  for (var i = 0; i < models.length; i++) {
    var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent', {
      method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, muteHttpExceptions: true,
      payload: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: q }] }], tools: [{ google_search: {} }] })
    });
    if (r.getResponseCode() !== 200) { why.push(models[i] + ' ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 160)); continue; }
    var c = JSON.parse(r.getContentText()).candidates || [];
    var t = (c[0] && c[0].content && c[0].content.parts || []).map(function (p) { return p.text || ''; }).join('');
    var m = t.match(/\{[\s\S]*\}/);
    if (!m) { why.push(models[i] + ' text: ' + t.slice(0, 160)); continue; }
    try {
      var j = JSON.parse(m[0]);
      var phone = String(j.phone || '').replace(/[^\d+()\- ]/g, '').trim();
      if (phone.replace(/\D/g, '').length < 7) return { phone: '', why: 'none found: ' + t.slice(0, 160) };
      return { phone: phone, source: String(j.source || '').slice(0, 80), url: /^https?:\/\//.test(j.url || '') ? String(j.url).slice(0, 300) : '' };
    } catch (e) { why.push('parse ' + t.slice(0, 120)); }
  }
  return { phone: '', why: why.join(' || ') };
}


/* ================= Read a booking / receipt screenshot (new) ================= */
// Turns a photo of a booking confirmation, boarding pass or receipt into one plain instruction
// for penpen ("Add flight PR 2555 Manila to Dipolog on Dec 4…"), which then goes through the
// normal chat so the person confirms Yes / No before anything is saved. The photo is not stored.
function penpenReadBooking(dataUrl) {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('nokey');
  var m = String(dataUrl || '').match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!m) throw new Error('badimage');
  if (m[2].length > 6000000) throw new Error('toobig');
  var cw = curWord(String(named(ss_(), 'LocalCur') || 'PHP'));   // "yen", "pesos"… in the examples
  var q = 'This is a travel screenshot: a flight, ferry, bus or train booking, boarding pass, hotel or tour confirmation, or a receipt. ' +
    'Write ONE plain English instruction for a trip-planner assistant. Today is ' + Utilities.formatDate(new Date(), ppTz_(ss_()), 'd MMM yyyy') + '. Examples: ' +
    '"Add flight PR 2555 Manila to Dipolog on Dec 4, departs 8:55 AM, arrives 10:30 AM, seat 36C, booking ref BMGDL2" or ' +
    '"Add hotel Harolds Hotel Cebu, check in Dec 7 2 PM, check out Dec 10 12 PM, booking ref 12345, paid 6,500 ' + cw + ' by Kate" or ' +
    '"Lunch at Larsian 450 ' + cw + ', paid by Brad". Include every useful detail you can read (names, numbers, dates, times, places, seat, price, who paid if shown). ' +
    'Never guess details that are not visible. If it is not a travel booking or receipt, or unreadable, reply exactly: UNREADABLE';
  var models = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  for (var i = 0; i < models.length; i++) {
    var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent', {
      method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, muteHttpExceptions: true,
      payload: JSON.stringify({ contents: [{ role: 'user', parts: [{ inline_data: { mime_type: m[1], data: m[2] } }, { text: q }] }] })
    });
    if (r.getResponseCode() !== 200) continue;
    var c = JSON.parse(r.getContentText()).candidates || [];
    var t = (c[0] && c[0].content && c[0].content.parts || []).map(function (p) { return p.text || ''; }).join('').trim().replace(/^"|"$/g, '');
    if (t) return { text: /UNREADABLE/.test(t) ? '' : t.slice(0, 600) };
  }
  throw new Error('busy');
}


/* ===== QC (temporary): a pretend 3-day barkada trip, every message typed as if spoken ===== */
function qcRun() {
  var owner = Session.getEffectiveUser().getEmail().toLowerCase();
  var t = ppNewTrip_({ email: owner }, { name: 'QC test · Siargao barkada (delete me)', start: '2026-11-27', end: '2026-11-29', where: 'Siargao' });
  ppUseTrip_(t.id);
  var ss = SpreadsheetApp.openById(t.id);
  var F = { Mia: 'qc.mia@example.com', Josh: 'qc.josh@example.com', Lia: 'qc.lia@example.com', Ben: 'qc.ben@example.com' };
  Object.keys(F).forEach(function (n) { ppAddPerson_(ss, n, F[n]); });
  SpreadsheetApp.flush();
  PropertiesService.getScriptProperties().setProperty('qc_trip', t.id);
  console.log('TRIP ' + t.id);
}
function qcSay(email, text) {
  var tid = PropertiesService.getScriptProperties().getProperty('qc_trip');
  ppUseTrip_(tid); __PP_EMAIL = email;
  var r, out;
  try { r = penpenAsk(text); out = (r && r.replies || []).map(function (x) { return typeof x === 'string' ? x : JSON.stringify(x); }).join(' | '); }
  catch (e) { out = 'ERROR ' + e.message; }
  return out;
}
function qcScript() {
  var me = Session.getEffectiveUser().getEmail().toLowerCase();
  var S = [
    [me, 'Van from the airport to General Luna 2,500, split with everyone'],
    [me, 'Dinner at Kermit 3,200, my treat'],
    ['qc.mia@example.com', 'Next round is mine, beers 900'],
    ['qc.josh@example.com', 'Who wants ice cream? 4 cones 400, I paid, for me, Mia, Lia and Ben'],
    ['qc.ben@example.com', 'Surf lessons 7,500 for all five of us, I paid'],
    ['qc.lia@example.com', 'Lunch 1,800, just Kate and me split it'],
    [me, 'Josh paid 600 for my smoothie bowl'],
    ['qc.mia@example.com', 'Island hopping 6,000, I paid 4,000 and Josh paid 2,000, shared by all'],
    ['qc.josh@example.com', 'Pasalubong 1,200 just for me'],
    ['qc.lia@example.com', 'Breakfast 1,000, split 60/40 between me and Ben'],
    ['qc.ben@example.com', 'Scooter gas 450 in dollars? no, 450 pesos, I paid, shared'],
    [me, 'who owes who?']
  ];
  var log = [];
  S.forEach(function (x, i) {
    var a = qcSay(x[0], x[1]);
    if (/\b(yes|no)\b.*\?|confirm|shall i|should i|is that right/i.test(a)) a += '  >>> YES: ' + qcSay(x[0], 'yes');
    log.push((i + 1) + '. [' + x[0].split('@')[0] + '] ' + x[1] + '\n   -> ' + a);
  });
  console.log(log.join('\n'));
}
function qcSheet() {
  var tid = PropertiesService.getScriptProperties().getProperty('qc_trip'); ppUseTrip_(tid);
  var v = SpreadsheetApp.openById(tid).getSheetByName('Expenses').getDataRange().getDisplayValues();
  console.log(v.filter(function (r, i) { return i > 0 && r[1]; }).map(function (r) { return [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[9], r[13]].join(' ¦ ') + ' ¦ shares: ' + r.slice(21, 27).join(',') + ' ¦ paid: ' + r.slice(27, 33).join(','); }).join('\n'));
}

// The web app isn't attached to one sheet, so a "document lock" doesn't exist there — fall back to the script lock.
function ppLock_() { var l = null; try { l = LockService.getDocumentLock(); } catch (e) {} return l || LockService.getScriptLock(); }
