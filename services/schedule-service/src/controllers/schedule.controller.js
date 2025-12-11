const { prisma } = require('../lib/prisma.js');
const memberService = require('../services/member.service.js');

const toMemberMap = members =>
  members.reduce((acc, member) => {
    if (member?.user_id) {
      acc[member.user_id] = member;
    }
    if (member?.id) {
      acc[member.id] = member;
    }
    return acc;
  }, {});

const hydrateScheduleRelations = async schedule => {
  const bookings = schedule.bookings || [];
  const attendance = schedule.attendance || [];
  const memberIds = [
    ...new Set(
      [
        ...bookings.map(booking => booking.member_id),
        ...attendance.map(record => record.member_id),
      ].filter(Boolean)
    ),
  ];

  // Extract date from start_time in YYYY-MM-DD format
  const startTime = new Date(schedule.start_time);
  const date = startTime.toISOString().split('T')[0]; // Format: YYYY-MM-DD

  if (memberIds.length === 0) {
    return {
      ...schedule,
      date: date, // Add computed date field for frontend compatibility
      bookings: bookings.map(booking => ({ ...booking, member: null })),
      attendance: attendance.map(record => ({ ...record, member: null })),
    };
  }

  try {
    const members = await memberService.getMembersByIds(memberIds);
    const memberMap = toMemberMap(members);

    return {
      ...schedule,
      date: date, // Add computed date field for frontend compatibility
      bookings: bookings.map(booking => ({
        ...booking,
        member: memberMap[booking.member_id] || null,
      })),
      attendance: attendance.map(record => ({
        ...record,
        member: memberMap[record.member_id] || null,
      })),
    };
  } catch (error) {
    console.error('ScheduleController:hydrateScheduleRelations error:', error.message);
    return {
      ...schedule,
      date: date, // Add computed date field for frontend compatibility
      bookings: bookings.map(booking => ({ ...booking, member: null })),
      attendance: attendance.map(record => ({ ...record, member: null })),
    };
  }
};

const ACTIVE_SCHEDULE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'scheduled', 'in_progress'];
const ALLOWED_SCHEDULE_STATUSES = new Set([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'POSTPONED',
]);

const parseDateInput = value => {
  if (!value && value !== 0) {
    return null;
  }

  // If value is a date string in YYYY-MM-DD format, parse it as Vietnam timezone
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Parse as Vietnam timezone (UTC+7)
    // "2025-01-10" should represent "2025-01-10 00:00:00" in Vietnam time
    // Vietnam time = UTC + 7, so "2025-01-10 00:00:00 VN" = "2025-01-09 17:00:00 UTC"
    const [year, month, day] = value.split('-').map(Number);
    // Create UTC date representing Vietnam midnight
    // Date.UTC creates UTC time, so we need to subtract 7 hours to get VN midnight
    const vnMidnightUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    vnMidnightUTC.setUTCHours(vnMidnightUTC.getUTCHours() - 7);
    return vnMidnightUTC;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStatus = status => {
  if (!status) {
    return null;
  }

  const upper = String(status).toUpperCase();
  return ALLOWED_SCHEDULE_STATUSES.has(upper) ? upper : null;
};

const isSameDay = (first, second) => {
  if (!first || !second) {
    return false;
  }

  return first.toDateString() === second.toDateString();
};

const validateSchedulePayload = async (payload, { isUpdate = false, currentSchedule = null }) => {
  const errors = [];

  const targetClassId = payload.class_id || currentSchedule?.class_id;
  const targetRoomId = payload.room_id || currentSchedule?.room_id;
  const targetTrainerId =
    payload.trainer_id === undefined ? currentSchedule?.trainer_id : payload.trainer_id;

  if (!targetClassId) {
    errors.push('class_id là bắt buộc');
  }

  if (!targetRoomId) {
    errors.push('room_id là bắt buộc');
  }

  // Date is now derived from start_time, so we extract it from start_time
  const parsedDate = payload.date
    ? parseDateInput(payload.date)
    : currentSchedule && currentSchedule.start_time
    ? new Date(currentSchedule.start_time)
    : null;

  if (!parsedDate) {
    errors.push('date không hợp lệ');
  }

  const parsedStart = payload.start_time
    ? parseDateInput(payload.start_time)
    : currentSchedule
    ? new Date(currentSchedule.start_time)
    : null;

  if (!parsedStart) {
    errors.push('start_time không hợp lệ');
  }

  const parsedEnd = payload.end_time
    ? parseDateInput(payload.end_time)
    : currentSchedule
    ? new Date(currentSchedule.end_time)
    : null;

  if (!parsedEnd) {
    errors.push('end_time không hợp lệ');
  }

  if (parsedStart && parsedEnd && parsedStart >= parsedEnd) {
    errors.push('start_time phải nhỏ hơn end_time');
  }

  if (parsedDate && parsedStart && !isSameDay(parsedDate, parsedStart)) {
    errors.push('start_time phải cùng ngày với date');
  }

  if (parsedDate && parsedEnd && !isSameDay(parsedDate, parsedEnd)) {
    errors.push('end_time phải cùng ngày với date');
  }

  let priceOverride = currentSchedule?.price_override ?? null;
  if (payload.price_override !== undefined) {
    const parsedPrice = parseFloat(payload.price_override);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      errors.push('price_override phải là số không âm');
    } else {
      priceOverride = parsedPrice;
    }
  }

  const normalizedStatus = payload.status
    ? normalizeStatus(payload.status)
    : isUpdate
    ? normalizeStatus(currentSchedule?.status)
    : null;

  if (payload.status && !normalizedStatus) {
    errors.push('status không hợp lệ');
  }

  let gymClass = null;
  if (targetClassId) {
    gymClass = await prisma.gymClass.findUnique({ where: { id: targetClassId } });
    if (!gymClass) {
      errors.push('Lớp học không tồn tại');
    }
  }

  let room = null;
  if (targetRoomId) {
    room = await prisma.room.findUnique({ where: { id: targetRoomId } });
    if (!room) {
      errors.push('Phòng không tồn tại');
    } else {
      // Check room status - only AVAILABLE rooms can be used for new schedules
      if (room.status !== 'AVAILABLE') {
        errors.push(
          `Phòng ${room.name} đang không khả dụng (trạng thái: ${room.status}). Vui lòng chọn phòng khác.`
        );
      }
    }
  }

  let trainer = null;
  if (targetTrainerId) {
    trainer = await prisma.trainer.findUnique({ where: { id: targetTrainerId } });
    if (!trainer) {
      errors.push('Huấn luyện viên không tồn tại');
    } else {
      // Check trainer status - only ACTIVE trainers can be assigned
      if (trainer.status !== 'ACTIVE') {
        errors.push(
          `Huấn luyện viên ${trainer.full_name} đang không hoạt động (trạng thái: ${trainer.status}). Vui lòng chọn huấn luyện viên khác.`
        );
      }
    }
  }

  let maxCapacityValue = currentSchedule?.max_capacity ?? null;
  if (payload.max_capacity !== undefined) {
    const parsedCapacity = parseInt(payload.max_capacity, 10);
    if (Number.isNaN(parsedCapacity) || parsedCapacity <= 0) {
      errors.push('max_capacity phải là số dương');
    } else {
      maxCapacityValue = parsedCapacity;
    }
  }

  // If creating new schedule and max_capacity not provided, use GymClass.max_capacity
  if (!isUpdate && (maxCapacityValue === null || maxCapacityValue === undefined)) {
    if (gymClass && gymClass.max_capacity) {
      maxCapacityValue = gymClass.max_capacity;
    } else {
      errors.push('max_capacity là bắt buộc');
    }
  }

  // Validate max_capacity against GymClass.max_capacity (if gymClass exists)
  if (gymClass && maxCapacityValue !== null && maxCapacityValue > gymClass.max_capacity) {
    errors.push(
      `Sức chứa không được vượt quá sức chứa của lớp học (${gymClass.max_capacity} người)`
    );
  }

  // Validate max_capacity against room.capacity
  if (room && maxCapacityValue !== null && maxCapacityValue > room.capacity) {
    errors.push(`Sức chứa không được vượt quá sức chứa của phòng (${room.capacity} người)`);
  }

  if (
    isUpdate &&
    currentSchedule &&
    maxCapacityValue !== null &&
    maxCapacityValue < (currentSchedule.current_bookings || 0)
  ) {
    errors.push('max_capacity không được nhỏ hơn số lượng đặt chỗ hiện tại');
  }

  // Validate duration from start_time and end_time
  if (parsedStart && parsedEnd && errors.filter(msg => msg.includes('time')).length === 0) {
    const durationMs = parsedEnd.getTime() - parsedStart.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    // Validate duration range (15 minutes to 3 hours)
    if (durationMinutes < 15) {
      errors.push('Thời lượng lớp học tối thiểu 15 phút');
    } else if (durationMinutes > 180) {
      errors.push('Thời lượng lớp học tối đa 180 phút (3 giờ)');
    }
  }

  if (
    parsedDate &&
    parsedStart &&
    parsedEnd &&
    targetRoomId &&
    errors.filter(msg => msg.includes('time')).length === 0
  ) {
    const roomConflict = await prisma.schedule.findFirst({
      where: {
        room_id: targetRoomId,
        ...(isUpdate && currentSchedule
          ? {
              id: {
                not: currentSchedule.id,
              },
            }
          : {}),
        start_time: { lt: parsedEnd },
        end_time: { gt: parsedStart },
        status: { in: ACTIVE_SCHEDULE_STATUSES },
      },
    });

    if (roomConflict) {
      errors.push('Phòng đã có lịch trong khoảng thời gian này');
    }

    if (targetTrainerId) {
      const trainerConflict = await prisma.schedule.findFirst({
        where: {
          trainer_id: targetTrainerId,
          ...(isUpdate && currentSchedule
            ? {
                id: {
                  not: currentSchedule.id,
                },
              }
            : {}),
          start_time: { lt: parsedEnd },
          end_time: { gt: parsedStart },
          status: { in: ACTIVE_SCHEDULE_STATUSES },
        },
      });

      if (trainerConflict) {
        errors.push('Huấn luyện viên đã có lịch trong khoảng thời gian này');
      }
    }
  }

  return {
    errors,
    value: {
      class_id: targetClassId,
      trainer_id: targetTrainerId || null,
      room_id: targetRoomId,
      start_time: parsedStart,
      end_time: parsedEnd,
      max_capacity: maxCapacityValue,
      price_override: priceOverride,
      special_notes:
        payload.special_notes !== undefined
          ? payload.special_notes
          : currentSchedule?.special_notes ?? null,
      status: normalizedStatus || currentSchedule?.status || undefined,
    },
  };
};

class ScheduleController {
  async getAllSchedules(req, res) {
    try {
      const {
        status,
        category,
        difficulty,
        trainer_id,
        room_id,
        from_date,
        to_date,
        date_from, // Support both naming conventions
        date_to, // Support both naming conventions
        page,
        limit, // No default limit - return all schedules
        search,
      } = req.query;

      // Use date_from/date_to if provided, otherwise fall back to from_date/to_date
      const finalFromDate = date_from || from_date;
      const finalToDate = date_to || to_date;

      // Log request parameters for debugging
      console.log('[GET_ALL_SCHEDULES] Request params:', {
        status,
        category,
        difficulty,
        trainer_id,
        room_id,
        from_date,
        to_date,
        date_from,
        date_to,
        finalFromDate,
        finalToDate,
        page,
        limit,
        search,
      });

      // Build where clause
      const whereClause = {};

      // Filter by status
      // Default: Only show active schedules (SCHEDULED, IN_PROGRESS) for mobile users
      // Allow 'all' or 'include_all=true' to get all statuses
      if (status) {
        if (status === 'all' || status === 'ALL') {
          // Don't filter by status - show all
        } else {
          const normalizedStatus = normalizeStatus(status);
          if (normalizedStatus) {
            whereClause.status = normalizedStatus;
          }
        }
      } else {
        // Default: Only show active schedules (SCHEDULED, IN_PROGRESS)
        // This ensures mobile users only see bookable/active classes
        whereClause.status = {
          in: ['SCHEDULED', 'IN_PROGRESS'],
        };
      }

      // Filter by date range (using start_time for more accurate filtering)
      if (finalFromDate || finalToDate) {
        whereClause.start_time = {};
        if (finalFromDate) {
          const fromDate = parseDateInput(finalFromDate);
          if (fromDate) {
            // Set to start of day in Vietnam timezone
            // Note: parseDateInput should handle timezone correctly
            fromDate.setHours(0, 0, 0, 0);
            whereClause.start_time.gte = fromDate;
            console.log('[GET_ALL_SCHEDULES] Date filter - from:', {
              input: finalFromDate,
              parsed: fromDate,
              iso: fromDate.toISOString(),
            });
          }
        }
        if (finalToDate) {
          const toDate = parseDateInput(finalToDate);
          if (toDate) {
            // Set to end of day in Vietnam timezone
            toDate.setHours(23, 59, 59, 999);
            whereClause.start_time.lte = toDate;
            console.log('[GET_ALL_SCHEDULES] Date filter - to:', {
              input: finalToDate,
              parsed: toDate,
              iso: toDate.toISOString(),
            });
          }
        }
      }

      // Filter by trainer
      if (trainer_id) {
        whereClause.trainer_id = trainer_id;
      }

      // Filter by room
      if (room_id) {
        whereClause.room_id = room_id;
      }

      // Filter by gym class properties
      if (category || difficulty || search) {
        whereClause.gym_class = {};

        if (category) {
          whereClause.gym_class.category = category.toUpperCase();
        }

        if (difficulty) {
          whereClause.gym_class.difficulty = difficulty.toUpperCase();
        }

        if (search) {
          whereClause.gym_class.name = {
            contains: search,
            mode: 'insensitive',
          };
        }
      }

      // Calculate pagination (only if limit is provided)
      const parsedLimit = limit ? parseInt(limit) : undefined;
      const parsedPage = page ? parseInt(page) : 1;
      const skip = parsedLimit ? (parsedPage - 1) * parsedLimit : undefined;

      const [schedules, totalCount] = await Promise.all([
        prisma.schedule.findMany({
          where: whereClause,
          include: {
            gym_class: true,
            trainer: true,
            room: true,
            bookings: true,
            attendance: true,
          },
          orderBy: { start_time: 'desc' },
          ...(skip !== undefined && { skip }),
          ...(parsedLimit && { take: parsedLimit }),
        }),
        prisma.schedule.count({ where: whereClause }),
      ]);

      const schedulesWithMembers = await Promise.all(
        schedules.map(schedule => hydrateScheduleRelations(schedule))
      );

      // Log response for debugging
      console.log('[GET_ALL_SCHEDULES] Response:', {
        schedulesCount: schedulesWithMembers.length,
        totalCount,
        page: parsedPage,
        limit: parsedLimit || 'unlimited',
        pages: parsedLimit ? Math.ceil(totalCount / parsedLimit) : 1,
        filters: {
          status: whereClause.status,
          hasDateFilter: !!whereClause.start_time,
          dateRange: whereClause.start_time
            ? {
                gte: whereClause.start_time.gte,
                lte: whereClause.start_time.lte,
              }
            : null,
          category: whereClause.gym_class?.category,
          trainer_id: whereClause.trainer_id,
          room_id: whereClause.room_id,
        },
        firstSchedule: schedulesWithMembers[0]
          ? {
              id: schedulesWithMembers[0].id,
              status: schedulesWithMembers[0].status,
              start_time: schedulesWithMembers[0].start_time,
              class_name: schedulesWithMembers[0].gym_class?.name,
            }
          : null,
        lastSchedule: schedulesWithMembers[schedulesWithMembers.length - 1]
          ? {
              id: schedulesWithMembers[schedulesWithMembers.length - 1].id,
              status: schedulesWithMembers[schedulesWithMembers.length - 1].status,
              start_time: schedulesWithMembers[schedulesWithMembers.length - 1].start_time,
              class_name: schedulesWithMembers[schedulesWithMembers.length - 1].gym_class?.name,
            }
          : null,
      });

      res.json({
        success: true,
        message: 'Schedules retrieved successfully',
        data: {
          schedules: schedulesWithMembers,
          pagination: parsedLimit
            ? {
                page: parsedPage,
                limit: parsedLimit,
                total: totalCount,
                pages: Math.ceil(totalCount / parsedLimit),
                hasMore: parsedPage * parsedLimit < totalCount,
              }
            : {
                page: 1,
                limit: null,
                total: totalCount,
                pages: 1,
                hasMore: false,
              },
          filters: {
            status,
            category,
            difficulty,
            trainer_id,
            room_id,
            from_date,
            to_date,
            search,
          },
        },
      });
    } catch (error) {
      console.error('Get schedules error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getScheduleById(req, res) {
    try {
      const { id } = req.params;
      const schedule = await prisma.schedule.findUnique({
        where: { id },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: true,
          attendance: true,
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
          data: null,
        });
      }

      const scheduleWithMembers = await hydrateScheduleRelations(schedule);

      res.json({
        success: true,
        message: 'Schedule retrieved successfully',
        data: { schedule: scheduleWithMembers },
      });
    } catch (error) {
      console.error('Get schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createSchedule(req, res) {
    try {
      const {
        class_id,
        trainer_id,
        room_id,
        date,
        start_time,
        end_time,
        max_capacity,
        price_override,
        special_notes,
      } = req.body;

      const validation = await validateSchedulePayload(
        {
          class_id,
          trainer_id,
          room_id,
          date,
          start_time,
          end_time,
          max_capacity,
          price_override,
          special_notes,
        },
        { isUpdate: false }
      );

      if (validation.errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          data: { errors: validation.errors },
        });
      }

      const schedule = await prisma.schedule.create({
        data: {
          class_id: validation.value.class_id,
          trainer_id: validation.value.trainer_id,
          room_id: validation.value.room_id,
          start_time: validation.value.start_time,
          end_time: validation.value.end_time,
          max_capacity: validation.value.max_capacity,
          price_override: validation.value.price_override,
          special_notes: validation.value.special_notes,
          status: validation.value.status || 'SCHEDULED',
        },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Schedule created successfully',
        data: { schedule },
      });
    } catch (error) {
      console.error('Create schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const {
        class_id,
        trainer_id,
        room_id,
        date,
        start_time,
        end_time,
        status,
        max_capacity,
        price_override,
        special_notes,
      } = req.body;

      const currentSchedule = await prisma.schedule.findUnique({
        where: { id },
      });

      if (!currentSchedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
          data: null,
        });
      }

      const validation = await validateSchedulePayload(
        {
          class_id,
          trainer_id,
          room_id,
          date,
          start_time,
          end_time,
          status,
          max_capacity,
          price_override,
          special_notes,
        },
        { isUpdate: true, currentSchedule }
      );

      if (validation.errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          data: { errors: validation.errors },
        });
      }

      const schedule = await prisma.schedule.update({
        where: { id },
        data: {
          class_id: validation.value.class_id,
          trainer_id: validation.value.trainer_id,
          room_id: validation.value.room_id,
          start_time: validation.value.start_time,
          end_time: validation.value.end_time,
          status: validation.value.status,
          max_capacity: validation.value.max_capacity,
          price_override: validation.value.price_override,
          special_notes: validation.value.special_notes,
        },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            include: {
              member: {
                select: {
                  id: true,
                  user_id: true,
                  full_name: true,
                },
              },
            },
          },
        },
      });

      // Detect changes for notification
      const changes = [];
      if (currentSchedule.room_id !== schedule.room_id) {
        changes.push('phòng');
      }
      if (
        currentSchedule.start_time?.toISOString() !== schedule.start_time?.toISOString() ||
        currentSchedule.end_time?.toISOString() !== schedule.end_time?.toISOString()
      ) {
        changes.push('giờ');
      }
      // Compare date part of start_time
      const currentDate = currentSchedule.start_time
        ? new Date(currentSchedule.start_time).toISOString().split('T')[0]
        : null;
      const newDate = schedule.start_time
        ? new Date(schedule.start_time).toISOString().split('T')[0]
        : null;
      if (currentDate !== newDate) {
        changes.push('ngày');
      }
      if (currentSchedule.max_capacity !== schedule.max_capacity) {
        changes.push('sức chứa');
      }
      if (currentSchedule.status !== schedule.status) {
        changes.push('trạng thái');
      }

      // Notify waitlist members if capacity increased
      let waitlistNotificationResult = null;
      if (
        currentSchedule.max_capacity < schedule.max_capacity &&
        schedule.max_capacity > schedule.current_bookings
      ) {
        try {
          const waitlistService = require('../services/waitlist.service.js');
          const additionalSlots = schedule.max_capacity - currentSchedule.max_capacity;
          waitlistNotificationResult = await waitlistService.notifyWaitlistMembersAvailability(
            schedule.id,
            additionalSlots
          );
          console.log(
            `[WAITLIST] Capacity increased for schedule ${schedule.id}. Notified ${
              waitlistNotificationResult.notified || 0
            } waitlist members.`
          );
        } catch (waitlistError) {
          console.error('[ERROR] Failed to notify waitlist members:', waitlistError);
          // Don't fail schedule update if waitlist notification fails
        }
      }

      // Send notifications if there are changes
      if (changes.length > 0 && global.io) {
        const notificationService = require('../services/notification.service.js');
        const changesText = changes.join(', ');

        // Notify trainer if exists
        if (schedule.trainer?.user_id) {
          try {
            const trainerNotification = {
              user_id: schedule.trainer.user_id,
              type: 'SCHEDULE_UPDATE',
              title: 'Lịch tập đã được cập nhật',
              message: `Admin đã cập nhật ${changesText} của lớp ${schedule.gym_class.name}`,
              data: {
                schedule_id: schedule.id,
                class_id: schedule.gym_class.id,
                class_name: schedule.gym_class.name,
                room_id: schedule.room.id,
                room_name: schedule.room.name,
                date: schedule.start_time
                  ? new Date(schedule.start_time).toISOString().split('T')[0]
                  : null,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                max_capacity: schedule.max_capacity,
                status: schedule.status,
                changes: changes,
                role: 'ADMIN',
              },
            };

            const notification = await notificationService.sendNotification(trainerNotification);

            // Emit notification:new event for NotificationDropdown
            if (notification && notification.id) {
              const notificationPayload = {
                notification_id: notification.id,
                type: trainerNotification.type,
                title: trainerNotification.title,
                message: trainerNotification.message,
                data: trainerNotification.data,
                created_at: notification.created_at || new Date().toISOString(),
                is_read: false,
              };

              console.log(
                `[EMIT] Emitting notification:new to trainer user:${schedule.trainer.user_id}`,
                notificationPayload
              );
              global.io
                .to(`user:${schedule.trainer.user_id}`)
                .emit('notification:new', notificationPayload);
            }

            // Emit schedule:updated event for real-time UI update
            const socketPayload = {
              schedule_id: schedule.id,
              class_name: schedule.gym_class.name,
              room_name: schedule.room.name,
              date: schedule.start_time
                ? new Date(schedule.start_time).toISOString().split('T')[0]
                : null,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              max_capacity: schedule.max_capacity,
              status: schedule.status,
              changes: changes,
              updated_at: schedule.updated_at,
            };

            console.log(
              `[EMIT] Emitting schedule:updated to trainer user:${schedule.trainer.user_id}`,
              socketPayload
            );
            global.io
              .to(`user:${schedule.trainer.user_id}`)
              .emit('schedule:updated', socketPayload);
          } catch (notifError) {
            console.error('Error creating trainer notification:', notifError);
          }
        }

        // Notify all members who booked this schedule
        if (schedule.bookings && schedule.bookings.length > 0) {
          const memberNotifications = schedule.bookings
            .filter(booking => booking.member?.user_id)
            .map(booking => ({
              user_id: booking.member.user_id,
              type: 'SCHEDULE_UPDATE',
              title: 'Lịch tập đã được cập nhật',
              message: `Admin đã cập nhật ${changesText} của lớp ${schedule.gym_class.name} bạn đã đặt`,
              data: {
                schedule_id: schedule.id,
                booking_id: booking.id,
                class_id: schedule.gym_class.id,
                class_name: schedule.gym_class.name,
                room_id: schedule.room.id,
                room_name: schedule.room.name,
                date: schedule.start_time
                  ? new Date(schedule.start_time).toISOString().split('T')[0]
                  : null,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                max_capacity: schedule.max_capacity,
                status: schedule.status,
                changes: changes,
                role: 'ADMIN',
              },
            }));

          // Create notifications in Identity Service (saves to database immediately)
          if (memberNotifications.length > 0) {
            try {
              const notificationService = require('../services/notification.service.js');

              const createdNotifications = [];
              for (const notificationData of memberNotifications) {
                try {
                  const created = await notificationService.createNotificationInIdentityService(
                    {
                      user_id: notificationData.user_id,
                      type: notificationData.type,
                      title: notificationData.title,
                      message: notificationData.message,
                      data: notificationData.data,
                      channels: ['IN_APP', 'PUSH'],
                    },
                    'normal' // Use normal priority for schedule updates
                  );
                  if (created) {
                    createdNotifications.push(created);
                  }
                } catch (error) {
                  console.error(
                    `[ERROR] Failed to create notification for user ${notificationData.user_id}:`,
                    error.message
                  );
                }
              }

              console.log(
                `[SUCCESS] Created ${createdNotifications.length} notifications in Identity Service`
              );

              const notificationsWithIds = createdNotifications;

              // Emit socket events to all members (only for notifications that were created)
              memberNotifications.forEach((notification, index) => {
                const createdNotif = notificationsWithIds.find(
                  n => n && n.user_id === notification.user_id
                );

                // Emit notification:new event for NotificationDropdown (only if notification was created)
                if (createdNotif && createdNotif.id) {
                  const notificationPayload = {
                    notification_id: createdNotif.id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    created_at: createdNotif.created_at?.toISOString() || new Date().toISOString(),
                    is_read: false,
                  };

                  console.log(
                    `[EMIT] Emitting notification:new to member user:${notification.user_id}`,
                    notificationPayload
                  );
                  global.io
                    .to(`user:${notification.user_id}`)
                    .emit('notification:new', notificationPayload);
                }

                // Emit schedule:updated event for real-time UI update
                const socketPayload = {
                  schedule_id: schedule.id,
                  booking_id: schedule.bookings.find(
                    b => b.member?.user_id === notification.user_id
                  )?.id,
                  class_name: schedule.gym_class.name,
                  room_name: schedule.room.name,
                  date: schedule.start_time
                    ? new Date(schedule.start_time).toISOString().split('T')[0]
                    : null,
                  start_time: schedule.start_time,
                  end_time: schedule.end_time,
                  max_capacity: schedule.max_capacity,
                  status: schedule.status,
                  changes: changes,
                  updated_at: schedule.updated_at,
                };

                console.log(
                  `[EMIT] Emitting schedule:updated to member user:${notification.user_id}`,
                  socketPayload
                );
                global.io
                  .to(`user:${notification.user_id}`)
                  .emit('schedule:updated', socketPayload);
              });

              console.log(
                `[SUCCESS] Sent ${memberNotifications.length} notifications to members about schedule update`
              );
            } catch (notifError) {
              console.error('Error creating member notifications:', notifError);
            }
          }
        }
      }

      res.json({
        success: true,
        message: 'Schedule updated successfully',
        data: { schedule },
      });
    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async deleteSchedule(req, res) {
    try {
      const { id } = req.params;

      // Get schedule details before deletion for socket event
      const schedule = await prisma.schedule.findUnique({
        where: { id },
        include: {
          gym_class: true,
          trainer: {
            select: { user_id: true },
          },
          bookings: {
            where: {
              status: 'CONFIRMED', // Only cancel confirmed bookings
            },
            select: {
              id: true,
              member_id: true,
              payment_status: true,
              amount_paid: true,
            },
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

      // TC-SCHED-003: Cancel all bookings before deleting schedule
      const confirmedBookings = schedule.bookings || [];
      const cancellationReason = 'Lớp học đã bị xóa bởi quản trị viên';

      // Fetch member info to get user_id for notifications and socket events
      let members = [];
      let memberMap = {};
      if (confirmedBookings.length > 0) {
        const memberIds = confirmedBookings.map(b => b.member_id);
        try {
          members = await memberService.getMembersByIds(memberIds);
          memberMap = members.reduce((acc, member) => {
            if (member?.id) acc[member.id] = member;
            return acc;
          }, {});
        } catch (memberError) {
          console.error('[ERROR] Failed to fetch member info for notifications:', memberError);
        }
      }

      if (confirmedBookings.length > 0) {
        // Use transaction to ensure atomic cancellation and deletion
        await prisma.$transaction(
          async tx => {
            // Cancel all confirmed bookings
            await tx.booking.updateMany({
              where: {
                schedule_id: id,
                status: 'CONFIRMED',
              },
              data: {
                status: 'CANCELLED',
                cancelled_at: new Date(),
                cancellation_reason: cancellationReason,
              },
            });

            // Update schedule capacity (decrement by number of cancelled bookings)
            await tx.schedule.update({
              where: { id },
              data: {
                current_bookings: {
                  decrement: confirmedBookings.length,
                },
              },
            });

            // Delete schedule (cascade will handle related records)
            await tx.schedule.delete({
              where: { id },
            });
          },
          {
            isolationLevel: 'Serializable',
            timeout: 30000,
          }
        );

        // Notify members about cancellation (outside transaction)
        const notificationService = require('../services/notification.service.js');
        for (const booking of confirmedBookings) {
          try {
            const member = memberMap[booking.member_id];
            if (!member?.user_id) {
              console.warn(
                `[WARNING] Member ${booking.member_id} not found or has no user_id. Skipping notification.`
              );
              continue;
            }

            await notificationService.sendNotification({
              user_id: member.user_id,
              type: 'SCHEDULE_CANCELLED',
              title: 'Lớp học đã bị hủy',
              message: `Lớp "${
                schedule.gym_class?.name || 'Lớp học'
              }" đã bị xóa bởi quản trị viên.`,
              data: {
                schedule_id: id,
                class_id: schedule.gym_class?.id,
                class_name: schedule.gym_class?.name || 'Lớp học',
                cancellation_reason: cancellationReason,
                role: 'MEMBER',
              },
            });
          } catch (notifError) {
            console.error(
              `[ERROR] Failed to notify member ${booking.member_id} about schedule deletion:`,
              notifError.message
            );
          }
        }
      } else {
        // No bookings, just delete
        await prisma.schedule.delete({
          where: { id },
        });
      }

      // Emit socket event for schedule deletion
      if (global.io && schedule) {
        const socketPayload = {
          schedule_id: id,
          id: id,
          action: 'deleted',
          data: {
            id: id,
            class_name: schedule.gym_class?.name,
            date: schedule.start_time
              ? new Date(schedule.start_time).toISOString().split('T')[0]
              : null,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          },
          timestamp: new Date().toISOString(),
        };

        // Emit to trainer if exists
        if (schedule.trainer?.user_id) {
          global.io.to(`user:${schedule.trainer.user_id}`).emit('schedule:deleted', socketPayload);
        }

        // Emit to all members who had bookings (use memberMap from notification loop)
        if (confirmedBookings.length > 0 && members.length > 0) {
          confirmedBookings.forEach(booking => {
            const member = memberMap[booking.member_id];
            if (member?.user_id) {
              global.io.to(`user:${member.user_id}`).emit('schedule:deleted', socketPayload);
            }
          });
        }

        // Broadcast to all admins
        global.io.emit('schedule:deleted', socketPayload);
        console.log(`[EMIT] Emitted schedule:deleted event for schedule ${id}`);
      }

      res.json({
        success: true,
        message: 'Schedule deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get filter options for schedules
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getScheduleFilterOptions(req, res) {
    try {
      const [categories, difficulties, trainers, rooms] = await Promise.all([
        // Get unique categories from gym classes
        prisma.gymClass.findMany({
          select: { category: true },
          distinct: ['category'],
          where: { is_active: true },
        }),

        // Get unique difficulties from gym classes
        prisma.gymClass.findMany({
          select: { difficulty: true },
          distinct: ['difficulty'],
          where: { is_active: true },
        }),

        // Get active trainers
        prisma.trainer.findMany({
          select: {
            id: true,
            full_name: true,
            user_id: true,
            status: true,
          },
          where: { status: 'ACTIVE' },
          orderBy: { full_name: 'asc' },
        }),

        // Get available rooms
        prisma.room.findMany({
          select: {
            id: true,
            name: true,
            capacity: true,
            status: true,
          },
          where: { status: 'AVAILABLE' },
          orderBy: { name: 'asc' },
        }),
      ]);

      // Get schedule status options
      const statusOptions = [
        { value: 'SCHEDULED', label: 'Đã lên lịch' },
        { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
        { value: 'COMPLETED', label: 'Hoàn thành' },
        { value: 'CANCELLED', label: 'Đã hủy' },
        { value: 'POSTPONED', label: 'Hoãn lại' },
      ];

      res.json({
        success: true,
        message: 'Schedule filter options retrieved successfully',
        data: {
          categories: categories.map(c => ({ value: c.category, label: c.category })),
          difficulties: difficulties.map(d => ({ value: d.difficulty, label: d.difficulty })),
          trainers: trainers.map(t => ({
            value: t.id,
            label: t.full_name,
            user_id: t.user_id,
          })),
          rooms: rooms.map(r => ({
            value: r.id,
            label: r.name,
            capacity: r.capacity,
          })),
          statuses: statusOptions,
        },
      });
    } catch (error) {
      console.error('Get schedule filter options error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy filter options',
        data: null,
      });
    }
  }

  /**
   * Get schedules by specific date
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSchedulesByDate(req, res) {
    try {
      const { date } = req.params; // Format: YYYY-MM-DD
      const { status, trainer_id, room_id } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date parameter is required (format: YYYY-MM-DD)',
          data: null,
        });
      }

      const targetDate = parseDateInput(date);
      if (!targetDate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD',
          data: null,
        });
      }

      // Set time range for the entire day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Build where clause
      const whereClause = {
        start_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };

      // Add additional filters
      if (status) {
        const normalizedStatus = normalizeStatus(status);
        if (normalizedStatus) {
          whereClause.status = normalizedStatus;
        }
      }

      if (trainer_id) {
        whereClause.trainer_id = trainer_id;
      }

      if (room_id) {
        whereClause.room_id = room_id;
      }

      const schedules = await prisma.schedule.findMany({
        where: whereClause,
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            where: { status: 'CONFIRMED' },
          },
          attendance: true,
        },
        orderBy: { start_time: 'asc' },
      });

      // Debug: Log attendance data
      console.log('[SEARCH] Debug: Schedules with attendance data:', {
        total_schedules: schedules.length,
        schedules_with_attendance: schedules.filter(s => s.attendance && s.attendance.length > 0)
          .length,
        sample_schedule: schedules[0]
          ? {
              id: schedules[0].id,
              attendance_count: schedules[0].attendance?.length || 0,
              bookings_count: schedules[0].bookings?.length || 0,
              attendance_data: schedules[0].attendance,
            }
          : null,
      });

      // Debug: Check if attendance records exist in database
      const totalAttendanceRecords = await prisma.attendance.count();
      console.log('[STATS] Total attendance records in database:', totalAttendanceRecords);

      if (totalAttendanceRecords > 0) {
        const sampleAttendance = await prisma.attendance.findFirst({
          include: {
            schedule: {
              select: { id: true, start_time: true },
            },
          },
        });
        console.log('[LIST] Sample attendance record:', sampleAttendance);

        // Check attendance for specific schedule
        const scheduleId = schedules[0]?.id;
        if (scheduleId) {
          const attendanceForSchedule = await prisma.attendance.findMany({
            where: { schedule_id: scheduleId },
            include: {
              schedule: {
                select: { id: true, start_time: true },
              },
            },
          });
          console.log(`[LIST] Attendance for schedule ${scheduleId}:`, {
            count: attendanceForSchedule.length,
            records: attendanceForSchedule,
          });
        }
      } else {
        console.log('[ERROR] No attendance records found in database!');
      }

      const schedulesWithMembers = await Promise.all(
        schedules.map(schedule => hydrateScheduleRelations(schedule))
      );

      res.json({
        success: true,
        message: `Schedules for ${date} retrieved successfully`,
        data: {
          schedules: schedulesWithMembers,
          date: date,
          total: schedulesWithMembers.length,
        },
      });
    } catch (error) {
      console.error('Get schedules by date error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy lịch theo ngày',
        data: null,
      });
    }
  }

  /**
   * Get upcoming schedules (next 7 days)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUpcomingSchedules(req, res) {
    try {
      const { limit = 10 } = req.query;
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const schedules = await prisma.schedule.findMany({
        where: {
          start_time: {
            gte: today,
            lte: nextWeek,
          },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            where: { status: 'CONFIRMED' },
          },
        },
        orderBy: { start_time: 'asc' },
        take: parseInt(limit),
      });

      const schedulesWithMembers = await Promise.all(
        schedules.map(schedule => hydrateScheduleRelations(schedule))
      );

      res.json({
        success: true,
        message: 'Upcoming schedules retrieved successfully',
        data: { schedules: schedulesWithMembers },
      });
    } catch (error) {
      console.error('Get upcoming schedules error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy lịch sắp tới',
        data: null,
      });
    }
  }

  /**
   * Get schedule statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getScheduleStats(req, res) {
    try {
      const { from_date, to_date } = req.query;

      // Build date filter
      const dateFilter = {};
      if (from_date) {
        dateFilter.gte = parseDateInput(from_date);
      }
      if (to_date) {
        dateFilter.lte = parseDateInput(to_date);
      }

      const whereClause = Object.keys(dateFilter).length > 0 ? { start_time: dateFilter } : {};

      const [
        totalSchedules,
        scheduledCount,
        inProgressCount,
        completedCount,
        cancelledCount,
        totalBookings,
        totalRevenue,
      ] = await Promise.all([
        prisma.schedule.count({ where: whereClause }),
        prisma.schedule.count({ where: { ...whereClause, status: 'SCHEDULED' } }),
        prisma.schedule.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
        prisma.schedule.count({ where: { ...whereClause, status: 'COMPLETED' } }),
        prisma.schedule.count({ where: { ...whereClause, status: 'CANCELLED' } }),
        prisma.booking.count({
          where: {
            schedule: whereClause,
            status: 'CONFIRMED',
          },
        }),
        prisma.schedule.aggregate({
          where: {
            ...whereClause,
            status: 'COMPLETED',
          },
          _sum: {
            price_override: true,
          },
        }),
      ]);

      res.json({
        success: true,
        message: 'Schedule statistics retrieved successfully',
        data: {
          period: {
            from: from_date || 'All time',
            to: to_date || 'All time',
          },
          stats: {
            total_schedules: totalSchedules,
            by_status: {
              scheduled: scheduledCount,
              in_progress: inProgressCount,
              completed: completedCount,
              cancelled: cancelledCount,
            },
            total_bookings: totalBookings,
            total_revenue: totalRevenue._sum.price_override || 0,
            completion_rate: totalSchedules > 0 ? (completedCount / totalSchedules) * 100 : 0,
            cancellation_rate: totalSchedules > 0 ? (cancelledCount / totalSchedules) * 100 : 0,
          },
        },
      });
    } catch (error) {
      console.error('Get schedule stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy thống kê lịch học',
        data: null,
      });
    }
  }
}

module.exports = new ScheduleController();
