const { prisma } = require('../lib/prisma.js');

class MemberService {
  // Get members with filtering and pagination
  async getMembers(filters) {
    try {
      // Build where clause for filtering
      const where = {};
      
      // Apply search filter
      if (filters.search) {
        where.OR = [
          { full_name: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      // Apply status filter
      if (filters.status) {
        where.membership_status = filters.status;
      }

      // Get total count
      const total = await prisma.member.count({ where });

      // Get paginated results
      const items = await prisma.member.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { created_at: 'desc' },
        include: {
          memberships: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { created_at: 'desc' }
          }
        }
      });

      const totalPages = Math.ceil(total / filters.limit);

      return {
        items: items.map(this.mapPrismaToMember),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Error getting members:', error);
      throw new Error('Failed to retrieve members');
    }
  }

  // Get member by ID
  async getMemberById(id) {
    try {
      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          memberships: {
            orderBy: { created_at: 'desc' }
          }
        }
      });

      return member ? this.mapPrismaToMember(member) : null;
    } catch (error) {
      console.error('Error getting member by ID:', error);
      throw new Error('Failed to retrieve member');
    }
  }

  // Create new member
  async createMember(data) {
    try {
      // Generate membership number
      const membershipNumber = await this.generateMembershipNumber();
      
      const member = await prisma.member.create({
        data: {
          user_id: `USER_${Date.now()}`, // Temporary user_id generation
          membership_number: membershipNumber,
          full_name: data.full_name,
          phone: data.phone,
          email: data.email,
          date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null,
          gender: data.gender || null,
          emergency_contact: data.emergency_contact || null,
          membership_status: 'ACTIVE',
          rfid_tag: await this.generateRfidTag(),
          qr_code: `QR_${Date.now()}`,
        },
        include: {
          memberships: true
        }
      });

      return this.mapPrismaToMember(member);
    } catch (error) {
      console.error('Error creating member:', error);
      if (error.code === 'P2002') {
        throw new Error('Email or phone number already exists');
      }
      throw new Error('Failed to create member');
    }
  }

  // Update member
  async updateMember(id, data) {
    try {
      const updateData = {};
      
      // Only include fields that are provided
      if (data.full_name !== undefined) updateData.full_name = data.full_name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.date_of_birth !== undefined) {
        updateData.date_of_birth = data.date_of_birth ? new Date(data.date_of_birth) : null;
      }
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.emergency_contact !== undefined) updateData.emergency_contact = data.emergency_contact;
      if (data.membership_status !== undefined) updateData.membership_status = data.membership_status;
      
      updateData.updated_at = new Date();

      const member = await prisma.member.update({
        where: { id },
        data: updateData,
        include: {
          memberships: true
        }
      });

      return this.mapPrismaToMember(member);
    } catch (error) {
      console.error('Error updating member:', error);
      if (error.code === 'P2025') {
        return null; // Member not found
      }
      if (error.code === 'P2002') {
        throw new Error('Email or phone number already exists');
      }
      throw new Error('Failed to update member');
    }
  }

  // Delete member
  async deleteMember(id) {
    try {
      await prisma.member.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting member:', error);
      if (error.code === 'P2025') {
        return false; // Member not found
      }
      throw new Error('Failed to delete member');
    }
  }

  // Get member statistics
  async getMemberStats() {
    try {
      const [
        total,
        active,
        expired,
        suspended,
        newThisMonth
      ] = await Promise.all([
        prisma.member.count(),
        prisma.member.count({ where: { membership_status: 'ACTIVE' } }),
        prisma.member.count({ where: { membership_status: 'EXPIRED' } }),
        prisma.member.count({ where: { membership_status: 'SUSPENDED' } }),
        prisma.member.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            }
          }
        })
      ]);

      return {
        total,
        active,
        expired,
        suspended,
        newThisMonth
      };
    } catch (error) {
      console.error('Error getting member stats:', error);
      throw new Error('Failed to retrieve member statistics');
    }
  }

  // Helper method to map Prisma result to Member
  mapPrismaToMember(prismaResult) {
    return {
      id: prismaResult.id,
      full_name: prismaResult.full_name,
      phone: prismaResult.phone,
      email: prismaResult.email,
      date_of_birth: prismaResult.date_of_birth,
      gender: prismaResult.gender,
      emergency_contact: prismaResult.emergency_contact,
      membership_status: prismaResult.membership_status,
      rfid_tag: prismaResult.rfid_tag,
      joined_at: prismaResult.joined_at,
      created_at: prismaResult.created_at,
      updated_at: prismaResult.updated_at,
      // Include membership info if available
      current_membership: prismaResult.memberships?.[0] || null
    };
  }

  // Generate unique membership number
  async generateMembershipNumber() {
    const count = await prisma.member.count();
    return `GYM${String(count + 1).padStart(6, '0')}`;
  }

  // Generate unique RFID tag
  async generateRfidTag() {
    let rfidTag;
    let exists = true;
    
    while (exists) {
      rfidTag = `RFID${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const existing = await prisma.member.findUnique({
        where: { rfid_tag: rfidTag }
      });
      exists = !!existing;
    }
    
    return rfidTag;
  }
}

// Export singleton instance
const memberService = new MemberService();
module.exports = { memberService, MemberService };