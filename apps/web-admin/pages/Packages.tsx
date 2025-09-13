import React from 'react';
import Card from '../components/Card';
const MOCK = [
  { id:'P01', name:'Gói tháng', duration:30, price: 600000 },
  { id:'P03', name:'Gói quý', duration:90, price: 1500000 },
  { id:'P12', name:'Gói năm', duration:365, price: 4500000 },
];
export default function Packages(){
  return (
    <div>
      <h2>Packages</h2>
      <Card title="Danh sách gói tập (mock)">
        <ul>
          {MOCK.map(p => (
            <li key={p.id} style={{padding:'6px 0'}}>
              <b>{p.name}</b> — {p.duration} ngày — {p.price.toLocaleString()}₫
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}