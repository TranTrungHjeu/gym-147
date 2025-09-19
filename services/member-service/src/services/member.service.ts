import {
    CreateMemberData,
    Member,
    MemberFilters,
    MemberStats,
    PaginationResult,
    UpdateMemberData
} from '../types/api.types.js';

// Mock data for development - replace with actual database calls
const mockMembers: Member[] = [
  {
    id: 'M001',
    full_name: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'nguyenvana@email.com',
    membership_status: 'ACTIVE',
    rfid_tag: 'RFID001',
    joined_at: new Date('2024-01-15'),
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
  },
  {
    id: 'M002', 
    full_name: 'Trần Thị B',
    phone: '0902345678',
    email: 'tranthib@email.com',
    membership_status: 'EXPIRED',
    rfid_tag: 'RFID002',
    joined_at: new Date('2024-02-20'),
    created_at: new Date('2024-02-20'),
    updated_at: new Date('2024-02-20'),
  },
  {
    id: 'M003',
    full_name: 'Lê Văn C', 
    phone: '0903456789',
    email: 'levanc@email.com',
    membership_status: 'ACTIVE',
    rfid_tag: 'RFID003',
    joined_at: new Date('2024-03-10'),
    created_at: new Date('2024-03-10'),
    updated_at: new Date('2024-03-10'),
  },
];

export class MemberService {
  // Get members with filtering and pagination
  async getMembers(filters: MemberFilters): Promise<PaginationResult<Member>> {
    let filteredMembers = [...mockMembers];

    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredMembers = filteredMembers.filter(member => 
        member.full_name.toLowerCase().includes(search) ||
        member.phone.includes(search) ||
        member.email.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (filters.status) {
      filteredMembers = filteredMembers.filter(member => 
        member.membership_status === filters.status
      );
    }

    // Calculate pagination
    const total = filteredMembers.length;
    const totalPages = Math.ceil(total / filters.limit);
    const start = (filters.page - 1) * filters.limit;
    const end = start + filters.limit;
    const items = filteredMembers.slice(start, end);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
      },
    };
  }

  // Get member by ID
  async getMemberById(id: string): Promise<Member | null> {
    const member = mockMembers.find(m => m.id === id);
    return member || null;
  }

  // Create new member
  async createMember(data: CreateMemberData): Promise<Member> {
    const newMember: Member = {
      id: `M${String(mockMembers.length + 1).padStart(3, '0')}`,
      ...data,
      membership_status: 'ACTIVE',
      rfid_tag: `RFID${String(mockMembers.length + 1).padStart(3, '0')}`,
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockMembers.push(newMember);
    return newMember;
  }

  // Update member
  async updateMember(id: string, data: UpdateMemberData): Promise<Member | null> {
    const memberIndex = mockMembers.findIndex(m => m.id === id);
    
    if (memberIndex === -1) {
      return null;
    }

    mockMembers[memberIndex] = {
      ...mockMembers[memberIndex],
      ...data,
      updated_at: new Date(),
    };

    return mockMembers[memberIndex];
  }

  // Delete member
  async deleteMember(id: string): Promise<boolean> {
    const memberIndex = mockMembers.findIndex(m => m.id === id);
    
    if (memberIndex === -1) {
      return false;
    }

    mockMembers.splice(memberIndex, 1);
    return true;
  }

  // Get member statistics
  async getMemberStats(): Promise<MemberStats> {
    const total = mockMembers.length;
    const active = mockMembers.filter(m => m.membership_status === 'ACTIVE').length;
    const expired = mockMembers.filter(m => m.membership_status === 'EXPIRED').length;
    const suspended = mockMembers.filter(m => m.membership_status === 'SUSPENDED').length;
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newThisMonth = mockMembers.filter(m => m.joined_at >= thisMonth).length;

    return {
      total,
      active,
      expired,
      suspended,
      newThisMonth,
    };
  }
}

export const memberService = new MemberService();