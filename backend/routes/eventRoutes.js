const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Submission = require('../models/Submission');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const Notification = require('../models/Notification');
const GeoPhoto    = require('../models/GeoPhoto');
const { auth, isFaculty } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper: create a notification
const notify = (userId, title, message, type, eventId) =>
  Notification.create({ user_id: userId, title, message, type, event_id: eventId }).catch(() => {});

// Multer Config for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper: convert buffer to base64 string
const getBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};

// Helper: delete a file from disk safely
const deleteFile = (filePath) => {
  if (!filePath) return;
  const full = path.join(__dirname, '..', filePath);
  if (fs.existsSync(full)) fs.unlinkSync(full);
};

// ─── STUDENT ENDPOINTS ────────────────────────────────────────────────────────

// Register for an event
router.post('/', auth, upload.single('event_banner'), async (req, res) => {
  try {
    const { event_name, college_name, event_date, event_type, team_name, team_members, num_days, event_dates } = req.body;

    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!student.department) return res.status(400).json({ message: 'Your profile does not have a department set. Please update your profile first.' });

    let parsedMembers = [];
    if (team_members) {
      try { parsedMembers = JSON.parse(team_members); } catch (e) { parsedMembers = []; }
    }

    const event = new Event({
      student_id: req.user.id,
      student_department: student.department,
      event_name, college_name, event_date, event_type, team_name,
      num_days: parseInt(num_days) || 1,
      event_dates: (() => {
        try {
          const arr = JSON.parse(event_dates || '[]');
          return Array.isArray(arr) ? arr.map(d => d ? new Date(d) : null).filter(Boolean) : [];
        } catch(e) { return []; }
      })(),
      team_members: parsedMembers.map(m => {
        if (m.email === student.email) m.status = 'Accepted';
        return m;
      }),
      status: event_type === 'team' ? 'Pending Team Acceptance' : 'Pending Approval',
      event_banner: req.file ? getBase64(req.file) : null
    });
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my events (student)
router.get('/my-events', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const events = await Event.find({
      $or: [
        { student_id: req.user.id },
        { 'team_members': { $elemMatch: { email: student.email, status: 'Accepted' } } }
      ]
    }).populate('student_id', 'name email');
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending invitations for student
router.get('/invitations', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ message: 'User not found' });
    const events = await Event.find({
      'team_members': { $elemMatch: { email: student.email, status: 'Pending' } },
      status: 'Pending Team Acceptance'
    }).populate('student_id', 'name email');
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept invitation
router.post('/:id/accept-invitation', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    let updated = false;
    event.team_members.forEach(m => {
      if (m.email === student.email && m.status === 'Pending') {
        m.status = 'Accepted';
        updated = true;
      }
    });
    if (updated) {
      await event.save();
      // Notify team lead
      notify(
        event.student_id,
        '✅ Team Member Accepted',
        `${student.name} accepted your invitation to join "${event.event_name}".`,
        'accepted',
        event._id
      );
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject invitation
router.post('/:id/reject-invitation', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    let updated = false;
    event.team_members.forEach(m => {
      if (m.email === student.email && m.status === 'Pending') {
        m.status = 'Rejected';
        updated = true;
      }
    });
    if (updated) {
      await event.save();
      // Notify team lead
      notify(
        event.student_id,
        '❌ Team Member Rejected',
        `${student.name} declined your invitation to join "${event.event_name}".`,
        'rejected',
        event._id
      );
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send request to faculty
router.post('/:id/send-request', auth, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, student_id: req.user.id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    const allAccepted = event.team_members.every(m => m.status === 'Accepted');
    if (!allAccepted) return res.status(400).json({ message: 'Not all team members have accepted the invitation.' });
    
    event.status = 'Pending Approval';
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an event (student/lead can delete their own events in deletable states; faculty can delete any in dept)
router.delete('/:id', auth, async (req, res) => {
  try {
    let event;
    if (req.user.role === 'student') {
      event = await Event.findOne({ _id: req.params.id, student_id: req.user.id });
      if (!event) return res.status(404).json({ message: 'Event not found or you are not the team leader' });
      const deletableStatuses = ['Pending Approval', 'Rejected', 'Pending Team Acceptance'];
      if (!deletableStatuses.includes(event.status)) {
        return res.status(400).json({ message: 'This event cannot be deleted at its current stage' });
      }
    } else {
      event = await Event.findOne({ _id: req.params.id, student_department: req.user.department });
      if (!event) return res.status(404).json({ message: 'Event not found' });
    }

    // Clean up uploads (if using legacy disk storage, this cleans it. Base64 strings are ignored)
    if (event.event_banner && !event.event_banner.startsWith('data:')) deleteFile(event.event_banner);
    const submission = await Submission.findOne({ event_id: event._id });
    if (submission) {
      if (submission.live_photo_url && !submission.live_photo_url.startsWith('data:')) deleteFile(submission.live_photo_url);
      if (submission.certificate_url && !submission.certificate_url.startsWith('data:')) deleteFile(submission.certificate_url);
      (submission.event_photos || []).forEach(p => { if (!p.startsWith('data:')) deleteFile(p); });
      (submission.team_certificates || []).forEach(c => { if (!c.startsWith('data:')) deleteFile(c); });
      await Submission.deleteOne({ _id: submission._id });
    }
    await Event.deleteOne({ _id: event._id });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live Event Verification – stores photos as base64 in MongoDB GeoPhoto collection
router.post('/:id/live-verification', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const event = await Event.findOne({
      _id: req.params.id,
      $or: [
        { student_id: req.user.id },
        { 'team_members': { $elemMatch: { email: student.email, status: 'Accepted' } } }
      ]
    });
    if (!event) return res.status(404).json({ message: 'Event not found or access denied' });

    const { photos, timestamp, gps_location } = req.body;

    // photos: [{ day, day_date, photo_data (base64), lat, lng, timestamp }]
    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ message: 'No photos provided' });
    }

    // Save each photo as a GeoPhoto document
    const geoPhotoDocs = photos.map(p => ({
      event_id:    event._id,
      student_id:  req.user.id,
      day:         parseInt(p.day) || 1,
      day_date:    p.day_date ? new Date(p.day_date) : null,
      photo_data:  p.photo_data,
      lat:         p.lat || null,
      lng:         p.lng || null,
      captured_at: p.timestamp ? new Date(p.timestamp) : new Date()
    }));
    await GeoPhoto.insertMany(geoPhotoDocs);

    // Update or create submission record (no photo URLs anymore — photos live in GeoPhoto)
    let submission = await Submission.findOne({ event_id: event._id });
    if (!submission) {
      submission = new Submission({ event_id: event._id, student_id: req.user.id });
    }
    if (timestamp) submission.timestamp = new Date(timestamp);
    if (gps_location) {
      submission.gps_location = gps_location;
    }
    // Mark that geo photos exist (flag for dashboard)
    submission.has_geo_photos = true;
    await submission.save();

    res.json({ message: `${photos.length} photo(s) saved to database`, count: photos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post-Event Submission (certificate + event photos + per-member team certificates)
router.post('/:id/post-submission', auth,
  upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'event_photos', maxCount: 20 },
    { name: 'team_member_cert', maxCount: 20 }  // one per team member, by index
  ]),
  async (req, res) => {
  try {
    const { result, certificate_missing_reason, team_member_emails } = req.body;
    const student = await User.findById(req.user.id);
    const event = await Event.findOne({
      _id: req.params.id,
      $or: [
        { student_id: req.user.id },
        { 'team_members': { $elemMatch: { email: student.email, status: 'Accepted' } } }
      ]
    });
    if (!event) return res.status(404).json({ message: 'Event not found or access denied' });

    let submission = await Submission.findOne({ event_id: event._id });
    if (!submission) {
      submission = new Submission({ event_id: event._id, student_id: req.user.id });
    }

    // Lead certificate
    if (req.files['certificate']) {
      submission.certificate_url = getBase64(req.files['certificate'][0]);
    }

    // Additional event photos
    if (req.files['event_photos']) {
      const photos = req.files['event_photos'].map(f => getBase64(f));
      submission.event_photos = (submission.event_photos || []).concat(photos);
    }

    // Per-member team certificates (indexed by email order)
    if (req.files['team_member_cert'] && team_member_emails) {
      let emailList = [];
      try { emailList = JSON.parse(team_member_emails); } catch(e) { emailList = []; }

      const memberCerts = req.files['team_member_cert'];
      // Build a map: email → certificate_url
      // Files arrive in upload order matching emailList order
      const existingCerts = submission.team_member_certificates || [];
      memberCerts.forEach((file, idx) => {
        const email = emailList[idx];
        if (!email) return;
        const certUrl = getBase64(file);
        const existing = existingCerts.find(c => c.email === email);
        if (existing) {
          existing.certificate_url = certUrl;
        } else {
          existingCerts.push({ email, certificate_url: certUrl });
        }
      });
      submission.team_member_certificates = existingCerts;
    }

    if (certificate_missing_reason) submission.certificate_missing_reason = certificate_missing_reason;
    submission.result = result;
    await submission.save();

    event.status = 'Completed';
    await event.save();

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my achievements (student)
router.get('/my-achievements', auth, async (req, res) => {
  try {
    const achievements = await Achievement.find({ student_id: req.user.id }).sort({ createdAt: -1 });
    res.json(achievements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FACULTY ENDPOINTS ────────────────────────────────────────────────────────

// Get all events for faculty's department only
router.get('/all', auth, isFaculty, async (req, res) => {
  try {
    const facultyDept = req.user.department;
    if (!facultyDept) return res.status(400).json({ message: 'Faculty department not set in token' });
    const events = await Event.find({ student_department: facultyDept })
      .populate('student_id', 'name reg_no department year email phone')
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get minimal info for events across ALL departments (for global cross-dept search)
router.get('/global', auth, isFaculty, async (req, res) => {
  try {
    // Return all ongoing events, but select only generic fields
    const events = await Event.find({ status: { $in: ['Approved', 'Pending Approval'] } })
      .select('event_name college_name event_date student_department status student_id')
      .populate('student_id', 'name reg_no department year')
      .sort({ event_date: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get achievements for faculty dept, grouped by year
router.get('/achievements-by-year', auth, isFaculty, async (req, res) => {
  try {
    const dept = req.user.department;
    const achievements = await Achievement.find({ department: dept }).sort({ year: 1, createdAt: -1 });
    // Group by year
    const grouped = {};
    for (const a of achievements) {
      const yr = a.year || 'Unknown';
      if (!grouped[yr]) grouped[yr] = [];
      grouped[yr].push(a);
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update event status (faculty)
router.put('/:id/status', auth, isFaculty, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const event = await Event.findOne({ _id: req.params.id, student_department: req.user.department })
      .populate('student_id', 'name reg_no year department');
    if (!event) return res.status(404).json({ message: 'Event not found or not in your department' });

    event.status = status;
    if (remarks) event.faculty_remarks = remarks;
    await event.save();

    // ── Notify lead student on every faculty status change ──
    const leadId = event.student_id._id || event.student_id;
    const eventName = event.event_name;

    if (status === 'Approved') {
      notify(leadId, '🎉 Event Approved', `Faculty approved your event request "${eventName}". Proceed to attend and upload geotag photos.`, 'approved', event._id);
      // Also notify accepted team members
      for (const tm of (event.team_members || []).filter(m => m.status === 'Accepted')) {
        const tmUser = await User.findOne({ email: tm.email });
        if (tmUser) notify(tmUser._id, '🎉 Team Event Approved', `Your team event "${eventName}" has been approved by faculty!`, 'approved', event._id);
      }
    } else if (status === 'Rejected') {
      notify(leadId, '❌ Event Rejected', `Faculty rejected your event request "${eventName}".${remarks ? ' Reason: ' + remarks : ''}`, 'faculty_rejected', event._id);
      for (const tm of (event.team_members || []).filter(m => m.status === 'Accepted')) {
        const tmUser = await User.findOne({ email: tm.email });
        if (tmUser) notify(tmUser._id, '❌ Team Event Rejected', `Your team event "${eventName}" was rejected by faculty.`, 'faculty_rejected', event._id);
      }
    }

    // When faculty verifies certificate → create achievement + clean up submission
    if (status === 'Certificate Verified') {
      const submission = await Submission.findOne({ event_id: event._id });
      if (submission) {
        const student = event.student_id;

        // Save lead student achievement
        await Achievement.create({
          student_id: student._id,
          event_id: event._id,
          event_name: event.event_name,
          event_date: event.event_date,
          student_name: student.name,
          reg_no: student.reg_no,
          year: student.year,
          department: student.department,
          result: submission.result,
          certificate_url: submission.certificate_url,
          is_team_member: false,
          team_name: event.team_name || null,
        });

        // Save team members' achievements (if team event)
        if (event.event_type === 'team' && event.team_members?.length > 0) {
          // team members who are accepted
          const acceptedMembers = event.team_members.filter(m => m.status === 'Accepted');
          
          if (acceptedMembers.length > 0) {
            const teamAchievements = [];
            for (const tm of acceptedMembers) {
              const tmUser = await User.findOne({ email: tm.email });

              // Look up this member's individual certificate; fall back to lead certificate
              const memberCertEntry = (submission.team_member_certificates || [])
                .find(c => c.email === tm.email);
              const memberCertUrl = memberCertEntry?.certificate_url || submission.certificate_url;

              teamAchievements.push({
                student_id: tmUser ? tmUser._id : student._id, // matched by email to their account
                event_id: event._id,
                event_name: event.event_name,
                event_date: event.event_date,
                student_name: tm.name,
                reg_no: tm.reg_no,
                year: tmUser?.year || student.year,
                department: tmUser?.department || student.department,
                result: submission.result,
                certificate_url: memberCertUrl,  // individual cert for this member
                is_team_member: true,
                team_name: event.team_name || null,
              });
            }
            await Achievement.insertMany(teamAchievements);
          }
        }

        // Notify lead + accepted team members that certificate is verified
        notify(leadId, '🏆 Certificate Verified!', `Your certificate for "${eventName}" has been verified. Achievement added to your dashboard!`, 'verified', event._id);
        for (const tm of (event.team_members || []).filter(m => m.status === 'Accepted')) {
          const tmUser = await User.findOne({ email: tm.email });
          if (tmUser) notify(tmUser._id, '🏆 Certificate Verified!', `The certificate for "${eventName}" has been verified. Check your Achievements tab!`, 'verified', event._id);
        }

        // Delete GeoPhoto records from DB (photos stored in MongoDB, not filesystem)
        await GeoPhoto.deleteMany({ event_id: event._id });
        // Clean up legacy filesystem photos if any
        (submission.event_photos || []).forEach(p => { if (p && !p.startsWith('data:')) deleteFile(p); });
        if (submission.live_photo_url && !submission.live_photo_url.startsWith('data:')) deleteFile(submission.live_photo_url);
        // Delete submission record (certificate is now in Achievement)
        await Submission.deleteOne({ _id: submission._id });
      }
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get submissions for an event (faculty) — includes GeoPhoto records
router.get('/:id/submission', auth, isFaculty, async (req, res) => {
  try {
    const submission = await Submission.findOne({ event_id: req.params.id }).populate('student_id', 'name reg_no');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    // Fetch GeoPhoto records stored in DB
    const geoPhotos = await GeoPhoto.find({ event_id: req.params.id }).sort({ day: 1, captured_at: 1 });

    const result = submission.toObject();
    result.geo_photos = geoPhotos; // array of { day, day_date, photo_data, lat, lng, captured_at }

    // For backward compat: if old event_photos exist, keep them
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify certificate / live verification (direct status on submission)
router.put('/submission/:id/verify', auth, isFaculty, async (req, res) => {
  try {
    const { status } = req.body;
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    submission.verification_status = status;
    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard stats
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const student = await User.findById(req.user.id);
      // Own registered events
      const ownEvents = await Event.find({ student_id: req.user.id });
      // Team events where this student is an accepted member (not lead)
      const teamEvents = await Event.find({
        student_id: { $ne: req.user.id },
        'team_members': { $elemMatch: { email: student.email, status: 'Accepted' } }
      });
      const allEvents = [...ownEvents, ...teamEvents];
      return res.json({
        total: ownEvents.length,
        approved: ownEvents.filter(e => e.status === 'Approved').length,
        completed: allEvents.filter(e => ['Completed', 'Certificate Verified'].includes(e.status)).length,
        pending: ownEvents.filter(e => e.status === 'Pending Approval').length,
      });
    } else {
      const dept = req.user.department;
      const events = await Event.find({ student_department: dept });
      const students = await User.countDocuments({ role: 'student', department: dept });
      return res.json({
        totalStudents: students,
        activeEvents: events.filter(e => ['Approved', 'Pending Approval'].includes(e.status)).length,
        completedEvents: events.filter(e => ['Completed', 'Certificate Verified'].includes(e.status)).length,
        department: dept,
        deptParticipation: { [dept]: events.length }
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
