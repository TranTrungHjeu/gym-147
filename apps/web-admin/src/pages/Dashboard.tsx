import React from 'react';
import Card from '../components/Card';
import { pingService } from '../services/api';
export default function Dashboard(){
  const [health, setHealth] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function checkAll(){
    try{
      setLoading(true); setError(null);
      const [idn, mem, sch, bil] = await Promise.all([
        pingService('/identity/health'),
        pingService('/member/health'),
        pingService('/schedule/health'),
        pingService('/billing/health'),
      ]);
      setHealth({ identity: idn, member: mem, schedule: sch, billing: bil });
    }catch(e:any){ setError(e?.message || 'Error'); } finally { setLoading(false); }
  }
  React.useEffect(()=>{ checkAll(); },[]);
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Demo kiểm tra nhanh tình trạng các service qua gateway.</p>
      <button onClick={checkAll} disabled={loading} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #ccc'}}>
        {loading ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
      </button>
      {error && <p style={{color:'red'}}>Lỗi: {error}</p>}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:12, marginTop:12}}>
        <Card title="identity-service"><pre>{JSON.stringify(health.identity, null, 2)}</pre></Card>
        <Card title="member-service"><pre>{JSON.stringify(health.member, null, 2)}</pre></Card>
        <Card title="schedule-service"><pre>{JSON.stringify(health.schedule, null, 2)}</pre></Card>
        <Card title="billing-service"><pre>{JSON.stringify(health.billing, null, 2)}</pre></Card>
      </div>
    </div>
  );
}