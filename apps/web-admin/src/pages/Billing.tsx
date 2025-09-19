import React from 'react';
import Card from '../components/Card';
const MOCK = [
  { id:'INV-001', member:'Nguyễn Văn A', total: 600000, status:'PAID' },
  { id:'INV-002', member:'Trần Thị B', total: 1500000, status:'UNPAID' },
];
export default function Billing(){
  return (
    <div>
      <h2>Billing</h2>
      <Card title="Hoá đơn gần đây (mock)">
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'8px'}}>Mã</th>
              <th style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'8px'}}>Hội viên</th>
              <th style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'8px'}}>Tổng tiền</th>
              <th style={{textAlign:'left', borderBottom:'1px solid #eee', padding:'8px'}}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map(i => (
              <tr key={i.id}>
                <td style={{padding:'8px', borderBottom:'1px solid #f3f3f3'}}>{i.id}</td>
                <td style={{padding:'8px', borderBottom:'1px solid #f3f3f3'}}>{i.member}</td>
                <td style={{padding:'8px', borderBottom:'1px solid #f3f3f3'}}>{i.total.toLocaleString()}₫</td>
                <td style={{padding:'8px', borderBottom:'1px solid #f3f3f3'}}>{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}