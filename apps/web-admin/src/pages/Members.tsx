import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { memberService, Member as ServiceMember } from '../services/member.service';

interface MemberStats {
  total: number;
  active: number;
  expired: number;
  suspended: number;
  newThisMonth: number;
}

export default function Members() {
  const [members, setMembers] = useState<ServiceMember[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await memberService.getMembers({
        page,
        limit: 20,
        search,
        status: statusFilter,
      });

      setMembers(response.members || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch members');
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsResponse = await memberService.getMemberStats();
      setStats(statsResponse as MemberStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ACTIVE: '#22c55e',
      EXPIRED: '#ef4444',
      SUSPENDED: '#f59e0b',
    };
    return (
      <span
        style={{
          background: colors[status as keyof typeof colors] || '#6b7280',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ marginBottom: '24px' }}>Member Management</h2>

      {/* Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <Card title='Total Members'>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
              {stats.total}
            </div>
          </Card>
          <Card title='Active Members'>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e' }}>
              {stats.active}
            </div>
          </Card>
          <Card title='Expired'>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
              {stats.expired}
            </div>
          </Card>
          <Card title='New This Month'>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
              {stats.newThisMonth}
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card title='Search & Filters'>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <input
              type='text'
              placeholder='Search by name, phone, email...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                flex: 1,
                minWidth: '200px',
              }}
            />
            <button
              type='submit'
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
            }}
          >
            <option value=''>All Status</option>
            <option value='ACTIVE'>Active</option>
            <option value='EXPIRED'>Expired</option>
            <option value='SUSPENDED'>Suspended</option>
          </select>
        </div>
      </Card>

      {/* Members List */}
      <Card title='Members List'>
        {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>}

        {error && (
          <div
            style={{
              color: '#ef4444',
              background: '#fef2f2',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
            }}
          >
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      padding: '12px',
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      padding: '12px',
                    }}
                  >
                    Full Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      padding: '12px',
                    }}
                  >
                    Phone
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      padding: '12px',
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      padding: '12px',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      padding: '12px',
                    }}
                  >
                    Joined
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      borderBottom: '2px solid #e5e7eb',
                      padding: '12px',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}
                    >
                      No members found
                    </td>
                  </tr>
                ) : (
                  members.map(member => (
                    <tr key={member.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>{member.id}</td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{member.full_name}</td>
                      <td style={{ padding: '12px' }}>{member.phone}</td>
                      <td style={{ padding: '12px' }}>{member.email}</td>
                      <td style={{ padding: '12px' }}>
                        {getStatusBadge(member.membership_status)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            style={{
                              padding: '4px 8px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            onClick={() => console.log('Edit', member.id)}
                          >
                            Edit
                          </button>
                          <button
                            style={{
                              padding: '4px 8px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            onClick={() => console.log('Delete', member.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px',
        }}
      >
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: page <= 1 ? '#f3f4f6' : 'white',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          Previous
        </button>
        <span style={{ padding: '8px 12px' }}>Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
