const notificationService = require('../services/notification.service.js');
const memberService = require('../services/member.service.js');
// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

// Time validation helpers
const canCheckIn = schedule => {
  const dayjs = require('dayjs');
  const utc = require('dayjs/plugin/utc');
  const timezone = require('dayjs/plugin/timezone');
  dayjs.extend(utc);
  dayjs.extend(timezone);

  // Get current time in Vietnam timezone, then convert to UTC for comparison
  const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
  const now = vnTime.utc().toDate();
  const startTime = new Date(schedule.start_time);
  const endTime = new Date(schedule.end_time);
  const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000);

  return schedule.check_in_enabled && now >= tenMinBefore && now <= endTime;
};

const canCheckOut = schedule => {
  const dayjs = require('dayjs');
  const utc = require('dayjs/plugin/utc');
  const timezone = require('dayjs/plugin/timezone');
  dayjs.extend(utc);
  dayjs.extend(timezone);

  // Get current time in Vietnam timezone, then convert to UTC for comparison
  const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
  const now = vnTime.utc().toDate();
  const endTime = new Date(schedule.end_time);
  const tenMinBefore = new Date(endTime.getTime() - 10 * 60 * 1000); // 10 minutes before end
  const tenMinAfter = new Date(endTime.getTime() + 10 * 60 * 1000); // 10 minutes after end

  // Allow check-out from 10 minutes before end time to 10 minutes after end time
  const canCheckOut = now >= tenMinBefore && now <= tenMinAfter;

  // Debug logging for timezone comparison
  console.log('[CHECKOUT] Time comparison:', {
    vnTimeNow: vnTime.format('YYYY-MM-DD HH:mm:ss'),
    utcNow: now.toISOString(),
    endTime: endTime.toISOString(),
    endTimeVN: dayjs(endTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    tenMinBefore: tenMinBefore.toISOString(),
    tenMinBeforeVN: dayjs(tenMinBefore).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    tenMinAfter: tenMinAfter.toISOString(),
    tenMinAfterVN: dayjs(tenMinAfter).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    canCheckOut,
  });

  return canCheckOut;
};

const canEnableCheckIn = schedule => {
  const dayjs = require('dayjs');
  const utc = require('dayjs/plugin/utc');
  const timezone = require('dayjs/plugin/timezone');
  dayjs.extend(utc);
  dayjs.extend(timezone);

  // Get current time in Vietnam timezone, then convert to UTC for comparison
  const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
  const now = vnTime.utc().toDate();
  const startTime = new Date(schedule.start_time);
  const endTime = new Date(schedule.end_time);
  const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000);

  return now >= tenMinBefore && now <= endTime;
};

// 1. Enable check-in (Trainer opens check-in)
const enableCheckIn = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const { trainer_id } = req.body;

    console.log('[SEARCH] Enable check-in debug:', {
      schedule_id,
      trainer_id,
      body: req.body,
    });

    if (!trainer_id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required',
        data: null,
      });
    }

    // Find trainer by user_id (since frontend sends user_id, not trainer_id)
    const trainer = await prisma.trainer.findUnique({
      where: { user_id: trainer_id },
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
        data: null,
      });
    }

    console.log('👨‍🏫 Found trainer:', {
      trainer_id: trainer.id,
      user_id: trainer.user_id,
      full_name: trainer.full_name,
    });

    // Get schedule with trainer info
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
        trainer: true,
        gym_class: true,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    console.log('[LIST] Schedule data:', {
      schedule_id: schedule.id,
      schedule_trainer_id: schedule.trainer_id,
      found_trainer_id: trainer.id,
      trainer_match: schedule.trainer_id === trainer.id,
    });

    // Verify trainer owns this schedule
    if (schedule.trainer_id !== trainer.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only enable check-in for your own schedules',
        data: null,
      });
    }

    // Check if check-in can be enabled
    const canEnable = canEnableCheckIn(schedule);
    console.log('[SEARCH] Check-in enable validation:', {
      schedule_id: schedule.id,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      can_enable: canEnable,
      current_time: new Date().toISOString(),
    });

    if (!canEnable) {
      return res.status(400).json({
        success: false,
        message: 'Check-in can only be enabled 10 minutes before class starts',
        data: {
          current_time: new Date().toISOString(),
          class_start: schedule.start_time,
          ten_min_before: new Date(
            new Date(schedule.start_time).getTime() - 10 * 60 * 1000
          ).toISOString(),
        },
      });
    }

    // Enable check-in
    const updatedSchedule = await prisma.schedule.update({
      where: { id: schedule_id },
      data: {
        check_in_enabled: true,
        check_in_opened_at: new Date(),
        check_in_opened_by: trainer_id,
      },
      include: {
        trainer: true,
        gym_class: true,
      },
    });

    res.json({
      success: true,
      message: 'Check-in enabled successfully',
      data: {
        schedule: updatedSchedule,
        check_in_enabled: true,
        opened_at: updatedSchedule.check_in_opened_at,
      },
    });
  } catch (error) {
    console.error('Enable check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enabling check-in',
      data: null,
    });
  }
};

// 2. Disable check-in (Trainer closes check-in)
const disableCheckIn = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const { trainer_id } = req.body;

    if (!trainer_id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required',
        data: null,
      });
    }

    // Find trainer by user_id (since frontend sends user_id, not trainer_id)
    const trainer = await prisma.trainer.findUnique({
      where: { user_id: trainer_id },
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
        data: null,
      });
    }

    // Get schedule
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Verify trainer owns this schedule
    if (schedule.trainer_id !== trainer.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only disable check-in for your own schedules',
        data: null,
      });
    }

    // Disable check-in
    const updatedSchedule = await prisma.schedule.update({
      where: { id: schedule_id },
      data: {
        check_in_enabled: false,
      },
      include: {
        trainer: true,
        gym_class: true,
      },
    });

    res.json({
      success: true,
      message: 'Check-in disabled successfully',
      data: {
        schedule: updatedSchedule,
        check_in_enabled: false,
      },
    });
  } catch (error) {
    console.error('Disable check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling check-in',
      data: null,
    });
  }
};

// 3. Member self check-in
const memberCheckIn = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required',
        data: null,
      });
    }

    // Get schedule with trainer info
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
        trainer: true,
        gym_class: true,
        bookings: {
          where: { member_id, status: 'CONFIRMED' },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Check if member has a booking
    if (schedule.bookings.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must have a confirmed booking to check in',
        data: null,
      });
    }

    // Check if check-in is allowed
    if (!canCheckIn(schedule)) {
      return res.status(400).json({
        success: false,
        message: 'Check-in is not available at this time',
        data: {
          check_in_enabled: schedule.check_in_enabled,
          current_time: new Date().toISOString(),
          class_start: schedule.start_time,
          class_end: schedule.end_time,
        },
      });
    }

    // Use transaction to prevent race conditions
    const attendance = await prisma.$transaction(async tx => {
      // Check if already checked in (with database lock)
      const existingAttendance = await tx.attendance.findUnique({
        where: {
          schedule_id_member_id: {
            schedule_id,
            member_id,
          },
        },
      });

      if (existingAttendance && existingAttendance.checked_in_at) {
        throw new Error('ALREADY_CHECKED_IN');
      }

      // Create attendance record
      return await tx.attendance.create({
        data: {
          schedule_id,
          member_id,
          checked_in_at: new Date(),
          check_in_method: 'SELF',
          attendance_method: 'MANUAL',
        },
      });
    });

    // Get member info for notifications
    let memberName = `Member ${member_id}`;
    let memberUserId = null;
    try {
      const memberService = require('../services/member.service.js');
      const member = await memberService.getMemberById(member_id);
      if (member) {
        if (member.full_name) {
          memberName = member.full_name;
        }
        if (member.user_id) {
          memberUserId = member.user_id;
        }
      }
    } catch (memberError) {
      console.error('Error getting member info for check-in notification:', memberError);
    }

    // Send notification to trainer
    if (schedule.trainer && schedule.trainer.user_id) {
      await notificationService.notifyTrainerCheckIn(
        schedule.trainer.user_id,
        memberName,
        schedule.gym_class.name,
        attendance.checked_in_at,
        schedule_id,
        member_id
      );
    }

    // Send notification to member
    if (memberUserId) {
      try {
        await notificationService.notifyMemberCheckIn(
          memberUserId,
          memberName,
          schedule.gym_class.name,
          attendance.checked_in_at,
          schedule_id,
          member_id
        );
      } catch (memberNotifError) {
        console.error('Error sending check-in notification to member:', memberNotifError);
        // Don't fail the check-in if notification fails
      }
    }

    // Emit Socket.IO event to update attendance list
    if (global.io) {
      try {
        const socketPayload = {
          schedule_id,
          member_id,
          member_name: memberName,
          checked_in_at: attendance.checked_in_at.toISOString(),
          check_in_method: attendance.check_in_method,
        };

        // Emit to trainer room
        if (schedule.trainer && schedule.trainer.user_id) {
          const trainerRoom = `user:${schedule.trainer.user_id}`;
          global.io.to(trainerRoom).emit('member:checked_in', socketPayload);
          console.log(`[SOCKET] Emitted member:checked_in to trainer room: ${trainerRoom}`);
        }

        // Emit to schedule room (for all users viewing this schedule)
        const scheduleRoom = `schedule:${schedule_id}`;
        global.io.to(scheduleRoom).emit('member:checked_in', socketPayload);
        console.log(`[SOCKET] Emitted member:checked_in to schedule room: ${scheduleRoom}`);
      } catch (socketError) {
        console.error('[ERROR] Error emitting member:checked_in socket event:', socketError);
        // Don't fail the check-in if socket fails
      }
    }

    res.json({
      success: true,
      message: 'Check-in successful',
      data: {
        attendance,
        check_in_time: attendance.checked_in_at,
      },
    });
  } catch (error) {
    console.error('Member check-in error:', error);

    // Handle specific transaction errors
    if (error.message === 'ALREADY_CHECKED_IN') {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in',
        data: null,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error checking in',
      data: null,
    });
  }
};

// 4. Member self check-out
const memberCheckOut = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required',
        data: null,
      });
    }

    // Get schedule with gym class info
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
        gym_class: true,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Check if check-out is allowed
    if (!canCheckOut(schedule)) {
      return res.status(400).json({
        success: false,
        message: 'Check-out is not available at this time',
        data: {
          current_time: new Date().toISOString(),
          class_end: schedule.end_time,
          ten_min_after: new Date(
            new Date(schedule.end_time).getTime() + 10 * 60 * 1000
          ).toISOString(),
        },
      });
    }

    // Get attendance record
    const attendance = await prisma.attendance.findUnique({
      where: {
        schedule_id_member_id: {
          schedule_id,
          member_id,
        },
      },
    });

    if (!attendance || !attendance.checked_in_at) {
      return res.status(400).json({
        success: false,
        message: 'You must check in before checking out',
        data: null,
      });
    }

    if (attendance.checked_out_at) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out',
        data: {
          checked_out_at: attendance.checked_out_at,
        },
      });
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checked_out_at: new Date(),
        check_out_method: 'SELF',
      },
    });

    // Award points for completing the class (20 points)
    try {
      const memberService = require('../services/member.service.js');
      const className = schedule.gym_class?.name || 'Lớp học';
      const pointsResult = await memberService.awardPoints(
        member_id,
        20,
        'ATTENDANCE',
        attendance.id,
        `Hoàn thành lớp học: ${className}`
      );

      if (pointsResult.success) {
        console.log(`[POINTS] Awarded 20 points to member ${member_id} for completing class: ${className}`);
      } else {
        console.warn(`[WARNING] Failed to award points for attendance: ${pointsResult.error}`);
      }
    } catch (pointsError) {
      console.error('[ERROR] Error awarding points for attendance:', pointsError);
      // Don't fail the check-out if points award fails
    }

    res.json({
      success: true,
      message: 'Check-out successful',
      data: {
        attendance: updatedAttendance,
        check_out_time: updatedAttendance.checked_out_at,
      },
    });
  } catch (error) {
    console.error('Member check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking out',
      data: null,
    });
  }
};

// IMPROVEMENT: Confirm checkout (for auto-checkout confirmation)
const confirmCheckout = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required',
        data: null,
      });
    }

    // Get attendance record
    const attendance = await prisma.attendance.findUnique({
      where: {
        schedule_id_member_id: {
          schedule_id,
          member_id,
        },
      },
      include: {
        schedule: {
          include: {
            gym_class: true,
          },
        },
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
        data: null,
      });
    }

    if (attendance.checked_out_at) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out',
        data: {
          checked_out_at: attendance.checked_out_at,
        },
      });
    }

    // Confirm checkout (manual checkout takes precedence over auto-checkout)
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checked_out_at: new Date(),
        check_out_method: 'SELF',
        is_auto_checkout: false, // Manual confirmation
      },
    });

    res.json({
      success: true,
      message: 'Check-out confirmed successfully',
      data: {
        attendance: updatedAttendance,
        check_out_time: updatedAttendance.checked_out_at,
      },
    });
  } catch (error) {
    console.error('Confirm checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming checkout',
      data: null,
    });
  }
};

// 5. Trainer checks in member
const trainerCheckInMember = async (req, res) => {
  try {
    const { schedule_id, member_id } = req.params;
    const { trainer_id } = req.body;

    if (!trainer_id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required',
        data: null,
      });
    }

    // Find trainer by user_id (since frontend sends user_id, not trainer_id)
    const trainer = await prisma.trainer.findUnique({
      where: { user_id: trainer_id },
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
        data: null,
      });
    }

    // Get schedule with trainer and gym_class info
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
        trainer: true,
        gym_class: true,
        bookings: {
          where: { member_id, status: 'CONFIRMED' },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Verify trainer owns this schedule
    if (schedule.trainer_id !== trainer.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only check in members for your own schedules',
        data: null,
      });
    }

    // Check if member has a booking
    if (schedule.bookings.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Member must have a confirmed booking to check in',
        data: null,
      });
    }

    // Check if already checked in
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        schedule_id_member_id: {
          schedule_id,
          member_id,
        },
      },
    });

    if (existingAttendance && existingAttendance.checked_in_at) {
      return res.status(400).json({
        success: false,
        message: 'Member has already checked in',
        data: {
          checked_in_at: existingAttendance.checked_in_at,
        },
      });
    }

    // Create or update attendance record
    const attendance = await prisma.attendance.upsert({
      where: {
        schedule_id_member_id: {
          schedule_id,
          member_id,
        },
      },
      update: {
        checked_in_at: new Date(),
        check_in_method: 'TRAINER_MANUAL',
      },
      create: {
        schedule_id,
        member_id,
        checked_in_at: new Date(),
        check_in_method: 'TRAINER_MANUAL',
        attendance_method: 'MANUAL',
      },
    });

    // Get member info for notifications
    let memberName = `Member ${member_id}`;
    let memberUserId = null;
    try {
      const memberService = require('../services/member.service.js');
      const member = await memberService.getMemberById(member_id);
      if (member) {
        if (member.full_name) {
          memberName = member.full_name;
        }
        if (member.user_id) {
          memberUserId = member.user_id;
        }
      }
    } catch (memberError) {
      console.error('Error getting member info for check-in notification:', memberError);
    }

    // Send notification to trainer
    if (schedule.trainer && schedule.trainer.user_id) {
      await notificationService.notifyTrainerCheckIn(
        schedule.trainer.user_id,
        memberName,
        schedule.gym_class.name,
        attendance.checked_in_at,
        schedule_id,
        member_id
      );
    }

    // Send notification to member
    if (memberUserId) {
      try {
        await notificationService.notifyMemberCheckIn(
          memberUserId,
          memberName,
          schedule.gym_class.name,
          attendance.checked_in_at,
          schedule_id,
          member_id
        );
      } catch (memberNotifError) {
        console.error('Error sending check-in notification to member:', memberNotifError);
        // Don't fail the check-in if notification fails
      }
    }

    // Emit Socket.IO event to update attendance list
    if (global.io) {
      try {
        const socketPayload = {
          schedule_id,
          member_id,
          member_name: memberName,
          checked_in_at: attendance.checked_in_at.toISOString(),
          check_in_method: attendance.check_in_method,
        };

        // Emit to trainer room
        if (schedule.trainer && schedule.trainer.user_id) {
          const trainerRoom = `user:${schedule.trainer.user_id}`;
          global.io.to(trainerRoom).emit('member:checked_in', socketPayload);
          console.log(`[SOCKET] Emitted member:checked_in to trainer room: ${trainerRoom}`);
        }

        // Emit to schedule room (for all users viewing this schedule)
        const scheduleRoom = `schedule:${schedule_id}`;
        global.io.to(scheduleRoom).emit('member:checked_in', socketPayload);
        console.log(`[SOCKET] Emitted member:checked_in to schedule room: ${scheduleRoom}`);
      } catch (socketError) {
        console.error('[ERROR] Error emitting member:checked_in socket event:', socketError);
        // Don't fail the check-in if socket fails
      }
    }

    res.json({
      success: true,
      message: 'Member checked in successfully',
      data: {
        attendance,
        check_in_time: attendance.checked_in_at,
      },
    });
  } catch (error) {
    console.error('Trainer check-in member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking in member',
      data: null,
    });
  }
};

// 6. Trainer checks out member
const trainerCheckOutMember = async (req, res) => {
  try {
    const { schedule_id, member_id } = req.params;
    const { trainer_id } = req.body;

    if (!trainer_id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required',
        data: null,
      });
    }

    // Find trainer by user_id (since frontend sends user_id, not trainer_id)
    const trainer = await prisma.trainer.findUnique({
      where: { user_id: trainer_id },
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
        data: null,
      });
    }

    // Get schedule
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Verify trainer owns this schedule
    if (schedule.trainer_id !== trainer.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only check out members for your own schedules',
        data: null,
      });
    }

    // Get attendance record
    const attendance = await prisma.attendance.findUnique({
      where: {
        schedule_id_member_id: {
          schedule_id,
          member_id,
        },
      },
    });

    if (!attendance || !attendance.checked_in_at) {
      return res.status(400).json({
        success: false,
        message: 'Member must check in before checking out',
        data: null,
      });
    }

    if (attendance.checked_out_at) {
      return res.status(400).json({
        success: false,
        message: 'Member has already checked out',
        data: {
          checked_out_at: attendance.checked_out_at,
        },
      });
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checked_out_at: new Date(),
        check_out_method: 'TRAINER_MANUAL',
      },
    });

    // Award points for completing the class (20 points)
    try {
      const memberService = require('../services/member.service.js');
      const className = schedule.gym_class?.name || 'Lớp học';
      const pointsResult = await memberService.awardPoints(
        member_id,
        20,
        'ATTENDANCE',
        attendance.id,
        `Hoàn thành lớp học: ${className}`
      );

      if (pointsResult.success) {
        console.log(`[POINTS] Awarded 20 points to member ${member_id} for completing class: ${className}`);
      } else {
        console.warn(`[WARNING] Failed to award points for attendance: ${pointsResult.error}`);
      }
    } catch (pointsError) {
      console.error('[ERROR] Error awarding points for attendance:', pointsError);
      // Don't fail the check-out if points award fails
    }

    res.json({
      success: true,
      message: 'Member checked out successfully',
      data: {
        attendance: updatedAttendance,
        check_out_time: updatedAttendance.checked_out_at,
      },
    });
  } catch (error) {
    console.error('Trainer check-out member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking out member',
      data: null,
    });
  }
};

// 7. Trainer checks out all members
const trainerCheckOutAll = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const { trainer_id } = req.body;

    if (!trainer_id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required',
        data: null,
      });
    }

    // Find trainer by user_id (since frontend sends user_id, not trainer_id)
    const trainer = await prisma.trainer.findUnique({
      where: { user_id: trainer_id },
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
        data: null,
      });
    }

    // Get schedule
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Verify trainer owns this schedule
    if (schedule.trainer_id !== trainer.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only check out members for your own schedules',
        data: null,
      });
    }

    // Get all checked-in members who haven't checked out
    const checkedInMembers = await prisma.attendance.findMany({
      where: {
        schedule_id,
        checked_in_at: { not: null },
        checked_out_at: null,
      },
    });

    const checkoutTime = new Date();
    let updatedAttendances = [];

    // Check out all members if there are any
    if (checkedInMembers.length > 0) {
      updatedAttendances = await Promise.all(
        checkedInMembers.map(attendance =>
          prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              checked_out_at: checkoutTime,
              check_out_method: 'TRAINER_MANUAL',
            },
          })
        )
      );
    }

    // Update schedule status to COMPLETED
    const updatedSchedule = await prisma.schedule.update({
      where: { id: schedule_id },
      data: {
        status: 'COMPLETED',
      },
    });

    res.json({
      success: true,
      message:
        checkedInMembers.length > 0
          ? `Successfully checked out ${updatedAttendances.length} members and ended the class`
          : 'Class ended successfully (no members to check out)',
      data: {
        checked_out_count: updatedAttendances.length,
        check_out_time: checkoutTime,
        attendances: updatedAttendances,
        schedule: updatedSchedule,
      },
    });
  } catch (error) {
    console.error('Trainer check-out all error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking out all members',
      data: null,
    });
  }
};

// 8. Get check-in status
const getCheckInStatus = async (req, res) => {
  try {
    const { schedule_id } = req.params;

    // Get schedule with attendance info
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
        attendance: {
          where: { checked_in_at: { not: null } },
        },
        gym_class: true,
        trainer: true,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Get current time in Vietnam timezone for display
    const dayjs = require('dayjs');
    const utc = require('dayjs/plugin/utc');
    const timezone = require('dayjs/plugin/timezone');
    dayjs.extend(utc);
    dayjs.extend(timezone);
    
    const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
    const now = vnTime.utc().toDate(); // Convert to UTC for comparison
    const startTime = new Date(schedule.start_time);
    const endTime = new Date(schedule.end_time);
    const tenMinBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
    const tenMinAfter = new Date(endTime.getTime() + 10 * 60 * 1000);

    const status = {
      schedule_id,
      check_in_enabled: schedule.check_in_enabled,
      check_in_opened_at: schedule.check_in_opened_at,
      check_in_opened_by: schedule.check_in_opened_by,
      auto_checkout_completed: schedule.auto_checkout_completed,
      auto_checkout_at: schedule.auto_checkout_at,

      // Time windows
      can_enable_check_in: canEnableCheckIn(schedule),
      can_check_in: canCheckIn(schedule),
      can_check_out: canCheckOut(schedule),

      // Time info
      current_time: now.toISOString(),
      class_start: startTime.toISOString(),
      class_end: endTime.toISOString(),
      ten_min_before: tenMinBefore.toISOString(),
      ten_min_after: tenMinAfter.toISOString(),

      // Attendance stats
      total_checked_in: schedule.attendance.length,
      checked_in_members: schedule.attendance.map(a => ({
        member_id: a.member_id,
        checked_in_at: a.checked_in_at,
        checked_out_at: a.checked_out_at,
        check_in_method: a.check_in_method,
        check_out_method: a.check_out_method,
      })),
    };

    res.json({
      success: true,
      message: 'Check-in status retrieved successfully',
      data: status,
    });
  } catch (error) {
    console.error('Get check-in status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving check-in status',
      data: null,
    });
  }
};

// 9. Generate QR code for schedule check-in/check-out (Trainer)
const generateScheduleQRCode = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const { type = 'check-in' } = req.query; // 'check-in' or 'check-out'
    const { trainer_id } = req.body;

    if (!trainer_id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required',
        data: null,
      });
    }

    // Find trainer by user_id
    const trainer = await prisma.trainer.findUnique({
      where: { user_id: trainer_id },
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
        data: null,
      });
    }

    // Get schedule
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
        gym_class: true,
        trainer: true,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Verify trainer owns this schedule
    if (schedule.trainer_id !== trainer.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only generate QR code for your own schedules',
        data: null,
      });
    }

    // Generate QR code data
    // Format: SCHEDULE_QR:{type}:{schedule_id}:{timestamp}
    const timestamp = Date.now();
    const qrData = `SCHEDULE_QR:${type}:${schedule_id}:${timestamp}`;

    // Generate QR code image
    const qrcode = require('qrcode');
    const qrCodeDataURL = await qrcode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Also generate as SVG string
    const qrCodeSVG = await qrcode.toString(qrData, {
      type: 'svg',
      width: 300,
      margin: 2,
    });

    res.json({
      success: true,
      message: `QR code for ${type} generated successfully`,
      data: {
        schedule_id,
        type, // 'check-in' or 'check-out'
        qr_data: qrData,
        qr_code_data_url: qrCodeDataURL,
        qr_code_svg: qrCodeSVG,
        expires_at: new Date(timestamp + 60 * 60 * 1000).toISOString(), // Valid for 1 hour
        class_name: schedule.gym_class.name,
      },
    });
  } catch (error) {
    console.error('Generate schedule QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      data: null,
    });
  }
};

// 10. Scan QR code to check-in/check-out (Member)
const scanQRCodeCheckInOut = async (req, res) => {
  try {
    const { qr_data } = req.body;
    const { member_id } = req.body;

    if (!qr_data || !member_id) {
      return res.status(400).json({
        success: false,
        message: 'QR data and member ID are required',
        data: null,
      });
    }

    // Parse QR code data
    // Format: SCHEDULE_QR:{type}:{schedule_id}:{timestamp}
    const qrParts = qr_data.split(':');
    if (qrParts.length !== 4 || qrParts[0] !== 'SCHEDULE_QR') {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format',
        data: null,
      });
    }

    const type = qrParts[1]; // 'check-in' or 'check-out'
    const schedule_id = qrParts[2];
    const qrTimestamp = parseInt(qrParts[3], 10);

    // Check if QR code is expired (1 hour validity)
    const now = Date.now();
    const qrAge = now - qrTimestamp;
    if (qrAge > 60 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: 'QR code has expired. Please ask trainer to generate a new one.',
        data: null,
      });
    }

    // Get schedule with trainer and gym_class info
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
        trainer: true,
        gym_class: true,
        bookings: {
          where: { member_id, status: 'CONFIRMED' },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
        data: null,
      });
    }

    // Check if member has a booking
    if (schedule.bookings.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must have a confirmed booking to check in/out',
        data: null,
      });
    }

    // Get member info for notifications
    let memberName = `Member ${member_id}`;
    let memberUserId = null;
    try {
      const memberService = require('../services/member.service.js');
      const member = await memberService.getMemberById(member_id);
      if (member) {
        if (member.full_name) {
          memberName = member.full_name;
        }
        if (member.user_id) {
          memberUserId = member.user_id;
        }
      }
    } catch (memberError) {
      console.error('Error getting member info:', memberError);
    }

    if (type === 'check-in') {
      // Check if check-in is allowed
      if (!canCheckIn(schedule)) {
        return res.status(400).json({
          success: false,
          message: 'Check-in is not available at this time',
          data: {
            check_in_enabled: schedule.check_in_enabled,
            current_time: new Date().toISOString(),
            class_start: schedule.start_time,
            class_end: schedule.end_time,
          },
        });
      }

      // Use transaction to prevent race conditions
      const attendance = await prisma.$transaction(async tx => {
        // Check if already checked in
        const existingAttendance = await tx.attendance.findUnique({
          where: {
            schedule_id_member_id: {
              schedule_id,
              member_id,
            },
          },
        });

        if (existingAttendance && existingAttendance.checked_in_at) {
          throw new Error('ALREADY_CHECKED_IN');
        }

        // Create or update attendance record with QR_CODE method
        return await tx.attendance.upsert({
          where: {
            schedule_id_member_id: {
              schedule_id,
              member_id,
            },
          },
          update: {
            checked_in_at: new Date(),
            check_in_method: 'SELF',
            attendance_method: 'QR_CODE',
          },
          create: {
            schedule_id,
            member_id,
            checked_in_at: new Date(),
            check_in_method: 'SELF',
            attendance_method: 'QR_CODE',
          },
        });
      });

      // Send notification to trainer
      if (schedule.trainer && schedule.trainer.user_id) {
        await notificationService.notifyTrainerCheckIn(
          schedule.trainer.user_id,
          memberName,
          schedule.gym_class.name,
          attendance.checked_in_at,
          schedule_id,
          member_id
        );
      }

      // Send notification to member
      if (memberUserId) {
        try {
          await notificationService.notifyMemberCheckIn(
            memberUserId,
            memberName,
            schedule.gym_class.name,
            attendance.checked_in_at,
            schedule_id,
            member_id
          );
        } catch (memberNotifError) {
          console.error('Error sending check-in notification to member:', memberNotifError);
        }
      }

      // Emit Socket.IO event to update attendance list
      if (global.io) {
        try {
          const socketPayload = {
            schedule_id,
            member_id,
            member_name: memberName,
            checked_in_at: attendance.checked_in_at.toISOString(),
            check_in_method: attendance.check_in_method,
            attendance_method: attendance.attendance_method,
          };

          // Emit to trainer room
          if (schedule.trainer && schedule.trainer.user_id) {
            const trainerRoom = `user:${schedule.trainer.user_id}`;
            global.io.to(trainerRoom).emit('member:checked_in', socketPayload);
            console.log(`[SOCKET] Emitted member:checked_in to trainer room: ${trainerRoom}`);
          }

          // Emit to schedule room
          const scheduleRoom = `schedule:${schedule_id}`;
          global.io.to(scheduleRoom).emit('member:checked_in', socketPayload);
          console.log(`[SOCKET] Emitted member:checked_in to schedule room: ${scheduleRoom}`);
        } catch (socketError) {
          console.error('[ERROR] Error emitting member:checked_in socket event:', socketError);
        }
      }

      res.json({
        success: true,
        message: 'Check-in successful via QR code',
        data: {
          attendance,
          check_in_time: attendance.checked_in_at,
          method: 'QR_CODE',
        },
      });
    } else if (type === 'check-out') {
      // Check if check-out is allowed
      if (!canCheckOut(schedule)) {
        return res.status(400).json({
          success: false,
          message: 'Check-out is not available at this time',
          data: {
            current_time: new Date().toISOString(),
            class_start: schedule.start_time,
            class_end: schedule.end_time,
          },
        });
      }

      // Get attendance record
      const attendance = await prisma.attendance.findUnique({
        where: {
          schedule_id_member_id: {
            schedule_id,
            member_id,
          },
        },
      });

      if (!attendance || !attendance.checked_in_at) {
        return res.status(400).json({
          success: false,
          message: 'You must check in first before checking out',
          data: null,
        });
      }

      if (attendance.checked_out_at) {
        return res.status(400).json({
          success: false,
          message: 'You have already checked out',
          data: {
            checked_out_at: attendance.checked_out_at,
          },
        });
      }

      // Update attendance with check-out
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checked_out_at: new Date(),
          check_out_method: 'SELF',
          attendance_method: 'QR_CODE', // Update attendance_method to QR_CODE
        },
      });

      // Award points for completing the class (20 points)
      try {
        const memberService = require('../services/member.service.js');
        const className = schedule.gym_class?.name || 'Lớp học';
        const pointsResult = await memberService.awardPoints(
          member_id,
          20,
          'ATTENDANCE',
          attendance.id,
          `Hoàn thành lớp học: ${className}`
        );

        if (pointsResult.success) {
          console.log(`[POINTS] Awarded 20 points to member ${member_id} for completing class: ${className}`);
        } else {
          console.warn(`[WARNING] Failed to award points for attendance: ${pointsResult.error}`);
        }
      } catch (pointsError) {
        console.error('[ERROR] Error awarding points for attendance:', pointsError);
        // Don't fail the check-out if points award fails
      }

      // Send notification to trainer
      if (schedule.trainer && schedule.trainer.user_id) {
        try {
          await notificationService.notifyTrainerCheckOut(
            schedule.trainer.user_id,
            memberName,
            schedule.gym_class.name,
            updatedAttendance.checked_out_at,
            schedule_id,
            member_id
          );
        } catch (trainerNotifError) {
          console.error('Error sending check-out notification to trainer:', trainerNotifError);
        }
      }

      // Send notification to member
      if (memberUserId) {
        try {
          await notificationService.notifyMemberCheckOut(
            memberUserId,
            memberName,
            schedule.gym_class.name,
            updatedAttendance.checked_out_at,
            schedule_id,
            member_id
          );
        } catch (memberNotifError) {
          console.error('Error sending check-out notification to member:', memberNotifError);
        }
      }

      // Emit Socket.IO event to update attendance list
      if (global.io) {
        try {
          const socketPayload = {
            schedule_id,
            member_id,
            member_name: memberName,
            checked_out_at: updatedAttendance.checked_out_at.toISOString(),
            check_out_method: updatedAttendance.check_out_method,
            attendance_method: updatedAttendance.attendance_method,
          };

          // Emit to trainer room
          if (schedule.trainer && schedule.trainer.user_id) {
            const trainerRoom = `user:${schedule.trainer.user_id}`;
            global.io.to(trainerRoom).emit('member:checked_out', socketPayload);
            console.log(`[SOCKET] Emitted member:checked_out to trainer room: ${trainerRoom}`);
          }

          // Emit to schedule room
          const scheduleRoom = `schedule:${schedule_id}`;
          global.io.to(scheduleRoom).emit('member:checked_out', socketPayload);
          console.log(`[SOCKET] Emitted member:checked_out to schedule room: ${scheduleRoom}`);
        } catch (socketError) {
          console.error('[ERROR] Error emitting member:checked_out socket event:', socketError);
        }
      }

      res.json({
        success: true,
        message: 'Check-out successful via QR code',
        data: {
          attendance: updatedAttendance,
          check_out_time: updatedAttendance.checked_out_at,
          method: 'QR_CODE',
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code type. Must be "check-in" or "check-out"',
        data: null,
      });
    }
  } catch (error) {
    console.error('Scan QR code check-in/out error:', error);
    
    if (error.message === 'ALREADY_CHECKED_IN') {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in',
        data: null,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error processing QR code check-in/out',
      data: null,
    });
  }
};

/**
 * Submit class and trainer rating
 * POST /schedules/:schedule_id/attendance/:member_id/rating
 */
const submitRating = async (req, res) => {
  try {
    const { schedule_id, member_id } = req.params;
    const { class_rating, trainer_rating, feedback_notes } = req.body;

    // Validate ratings (1-5 or null)
    if (class_rating !== undefined && class_rating !== null) {
      if (!Number.isInteger(class_rating) || class_rating < 1 || class_rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Class rating must be between 1 and 5',
          data: null,
        });
      }
    }

    if (trainer_rating !== undefined && trainer_rating !== null) {
      if (!Number.isInteger(trainer_rating) || trainer_rating < 1 || trainer_rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Trainer rating must be between 1 and 5',
          data: null,
        });
      }
    }

    // Validate feedback notes (max 1000 characters)
    if (feedback_notes && feedback_notes.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Feedback notes must not exceed 1000 characters',
        data: null,
      });
    }

    // Find attendance record
    const attendance = await prisma.attendance.findUnique({
      where: {
        schedule_id_member_id: {
          schedule_id,
          member_id,
        },
      },
      include: {
        schedule: {
          include: {
            gym_class: true,
            trainer: true,
          },
        },
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
        data: null,
      });
    }

    // Check if member has checked out (required before rating)
    if (!attendance.checked_out_at) {
      return res.status(400).json({
        success: false,
        message: 'You must check out before submitting a rating',
        data: null,
      });
    }

    // Update attendance with ratings
    const updateData = {};
    if (class_rating !== undefined) updateData.class_rating = class_rating;
    if (trainer_rating !== undefined) updateData.trainer_rating = trainer_rating;
    if (feedback_notes !== undefined) updateData.feedback_notes = feedback_notes || null;

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
      include: {
        schedule: {
          include: {
            gym_class: true,
            trainer: true,
          },
        },
      },
    });

    // Update GymClass average_rating if class_rating provided
    if (class_rating !== undefined && class_rating !== null) {
      const allClassRatings = await prisma.attendance.findMany({
        where: {
          schedule: {
            gym_class_id: attendance.schedule.gym_class_id,
          },
          class_rating: { not: null },
        },
        select: { class_rating: true },
      });

      if (allClassRatings.length > 0) {
        const averageRating =
          allClassRatings.reduce((sum, a) => sum + a.class_rating, 0) /
          allClassRatings.length;

        await prisma.gymClass.update({
          where: { id: attendance.schedule.gym_class_id },
          data: { average_rating: averageRating },
        });
      }
    }

    // Get member information for notification
    let memberName = 'Hội viên';
    try {
      const members = await memberService.getMembersByIds([member_id]);
      if (members && members.length > 0) {
        memberName = members[0].full_name || members[0].first_name + ' ' + (members[0].last_name || '') || 'Hội viên';
      }
    } catch (memberError) {
      console.error('[ERROR] Failed to get member info for notification:', memberError);
      // Continue with default name
    }

    // Notify trainer about rating (for both class_rating and trainer_rating)
    if (attendance.schedule.trainer?.user_id && (class_rating || trainer_rating)) {
      try {
        // Build notification message
        let notificationTitle = 'Bạn có đánh giá mới!';
        let notificationMessage = '';
        const ratingParts = [];

        if (class_rating) {
          ratingParts.push(`lớp học ${class_rating} sao`);
        }
        if (trainer_rating) {
          ratingParts.push(`bạn ${trainer_rating} sao`);
        }

        if (ratingParts.length > 0) {
          notificationMessage = `${memberName} đã đánh giá ${ratingParts.join(' và ')} cho lớp ${attendance.schedule.gym_class?.name || 'lớp học'}`;
        }

        // Create notification in database
        await notificationService.createNotification({
          userId: attendance.schedule.trainer.user_id,
          type: 'CLASS_RATING', // Use specific notification type
          title: notificationTitle,
          message: notificationMessage,
          data: {
            attendance_id: attendance.id,
            schedule_id,
            class_id: attendance.schedule.gym_class_id,
            member_id,
            member_name: memberName,
            class_rating: class_rating || null,
            trainer_rating: trainer_rating || null,
            feedback_notes: feedback_notes || null,
            class_name: attendance.schedule.gym_class?.name || 'Lớp học',
          },
        });

        // Emit socket event to trainer
        if (global.io && attendance.schedule.trainer.user_id) {
          const socketPayload = {
            attendance_id: attendance.id,
            schedule_id,
            class_id: attendance.schedule.gym_class_id,
            member_id,
            member_name: memberName,
            class_rating: class_rating || null,
            trainer_rating: trainer_rating || null,
            feedback_notes: feedback_notes || null,
            class_name: attendance.schedule.gym_class?.name || 'Lớp học',
            timestamp: new Date().toISOString(),
          };

          global.io
            .to(`user:${attendance.schedule.trainer.user_id}`)
            .emit('class:rating_received', socketPayload);

          console.log(`[SOCKET] Emitted class:rating_received to trainer user:${attendance.schedule.trainer.user_id}`, socketPayload);
        }
      } catch (notifError) {
        console.error('[ERROR] Failed to notify trainer about rating:', notifError);
        // Continue even if notification fails
      }
    }

    // Update Trainer rating_average if trainer_rating provided
    if (trainer_rating !== undefined && trainer_rating !== null && attendance.schedule.trainer_id) {
      const allTrainerRatings = await prisma.attendance.findMany({
        where: {
          schedule: {
            trainer_id: attendance.schedule.trainer_id,
          },
          trainer_rating: { not: null },
        },
        select: { trainer_rating: true },
      });

      if (allTrainerRatings.length > 0) {
        const averageRating =
          allTrainerRatings.reduce((sum, a) => sum + a.trainer_rating, 0) /
          allTrainerRatings.length;

        await prisma.trainer.update({
          where: { id: attendance.schedule.trainer_id },
          data: { rating_average: averageRating },
        });
      }
    }

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        attendance: updatedAttendance,
      },
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting rating',
      data: null,
    });
  }
};

module.exports = {
  enableCheckIn,
  disableCheckIn,
  memberCheckIn,
  memberCheckOut,
  confirmCheckout, // IMPROVEMENT: Checkout confirmation
  trainerCheckInMember,
  trainerCheckOutMember,
  trainerCheckOutAll,
  getCheckInStatus,
  generateScheduleQRCode,
  scanQRCodeCheckInOut,
  submitRating,
};
