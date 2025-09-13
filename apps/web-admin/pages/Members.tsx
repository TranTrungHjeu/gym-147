import React from 'react';
import Card from '../components/Card';
const MOCK = [
  { id: 'M001', name: 'Nguyễn Văn A', phone: '0901-234-567', status: 'ACTIVE' },
  { id: 'M002', name: 'Trần Thị B', phone: '0902-345-678', status: 'EXPIRED' },
  { id: 'M003', name: 'Lê Văn C', phone: '0903-456-789', status: 'ACTIVE' },
];
export default function Members(){
  return (
    <div>
      <h2>Members</h2>
      <Card title="Danh sách hội viên (mock)">
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'8px'}}>ID</th>
              <th style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'8px'}}>Họ tên</th>
              <th style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'8px'}}>SĐT</th>
              <th style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'8px'}}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map(m => (
              <tr key={m.id}>
                <td style={{padding:'8px', borderBottom:'1px solid #f3f3f3'}}>{m.id}</td>
                <td style={{padding:'8px', borderBottom:'1px solid #f3f3f3'}}>{m.name}</td>
                <td style={{padding:'8px', borderBottom:'1px solid #f3f3f3'}}>{m.phone}</td>
                <td style={{padding:'8px', borderBottom:'1px solid #f3f3f3'}}>{m.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}