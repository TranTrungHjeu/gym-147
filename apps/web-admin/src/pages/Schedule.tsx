import React from 'react';
import Card from '../components/Card';
const MOCK = [
  { id:'S001', title:'Yoga cơ bản', trainer:'PT Hạnh', room:'R1', start:'08:00', end:'09:00', capacity:20, booked:12 },
  { id:'S002', title:'HIIT', trainer:'PT Hải', room:'R2', start:'09:30', end:'10:15', capacity:15, booked:15 },
  { id:'S003', title:'Zumba', trainer:'PT Minh', room:'R1', start:'18:00', end:'19:00', capacity:25, booked:22 },
];
export default function Schedule(){
  return (
    <div>
      <h2>Schedule</h2>
      <Card title="Lịch lớp hôm nay (mock)">
        <div style={{display:'grid', gap:8}}>
          {MOCK.map(s => (
            <div key={s.id} style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
              <b>{s.title}</b> — {s.trainer} — {s.room}<br/>
              {s.start} → {s.end} | Sức chứa: {s.booked}/{s.capacity}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}