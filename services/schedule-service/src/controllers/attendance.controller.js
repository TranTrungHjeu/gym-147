const { PrismaClient } = require('@prisma/client');
const notificationService = require('../services/notification.service.js');

const prisma = new PrismaClient();

// Time validation helpers
const canCheckIn = schedule => {
  const dayjs = require('dayjs');
  const utc = require('dayjs/plugin/utc');
  const timezone = require('dayjs/plugin/timezone');
  dayjs.extend(utc);
  dayjs.extend(timezone);

  const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
  const now = new Date(vnTime.format('YYYY-MM-DD HH:mm:ss'));
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

  const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
  const now = new Date(vnTime.format('YYYY-MM-DD HH:mm:ss'));
  const endTime = new Date(schedule.end_time);
  const tenMinAfter = new Date(endTime.getTime() + 10 * 60 * 1000);

  return now >= endTime && now <= tenMinAfter;
};

const canEnableCheckIn = schedule => {
  const dayjs = require('dayjs');
  const utc = require('dayjs/plugin/utc');
  const timezone = require('dayjs/plugin/timezone');
  dayjs.extend(utc);
  dayjs.extend(timezone);

  const vnTime = dayjs().tz('Asia/Ho_Chi_Minh');
  const now = new Date(vnTime.format('YYYY-MM-DD HH:mm:ss'));
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

    console.log('🔍 Enable check-in debug:', {
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

    console.log('📋 Schedule data:', {
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
    console.log('🔍 Check-in enable validation:', {
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

    // Send notification to trainer
    if (schedule.trainer && schedule.trainer.user_id) {
      // Get member info for better notification
      let memberName = `Member ${member_id}`;
      try {
        const memberService = require('../services/member.service.js');
        const member = await memberService.getMemberById(member_id);
        if (member && member.full_name) {
          memberName = member.full_name;
        }
      } catch (memberError) {
        console.error('Error getting member info for check-in notification:', memberError);
      }

      await notificationService.notifyTrainerCheckIn(
        schedule.trainer.user_id,
        memberName,
        schedule.gym_class.name,
        attendance.checked_in_at,
        schedule_id,
        member_id
      );
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

    // Get schedule
    const schedule = await prisma.schedule.findUnique({
      where: { id: schedule_id },
      include: {
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

    if (checkedInMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No checked-in members to check out',
        data: null,
      });
    }

    // Check out all members
    const checkoutTime = new Date();
    const updatedAttendances = await Promise.all(
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

    res.json({
      success: true,
      message: `Successfully checked out ${updatedAttendances.length} members`,
      data: {
        checked_out_count: updatedAttendances.length,
        check_out_time: checkoutTime,
        attendances: updatedAttendances,
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

    const now = new Date();
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

module.exports = {
  enableCheckIn,
  disableCheckIn,
  memberCheckIn,
  memberCheckOut,
  trainerCheckInMember,
  trainerCheckOutMember,
  trainerCheckOutAll,
  getCheckInStatus,
};
