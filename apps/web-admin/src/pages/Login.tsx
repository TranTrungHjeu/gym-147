import React from 'react';
import Card from '../components/Card';
export default function Login(){
  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('admin');
  const [msg, setMsg] = React.useState('');
  function onSubmit(e: React.FormEvent){
    e.preventDefault();
    setMsg('Đăng nhập giả lập thành công (mock). Tích hợp API /identity/login sau.');
  }
  return (
    <div>
      <h2>Login (demo)</h2>
      <Card title="Form đăng nhập (mock)">
        <form onSubmit={onSubmit} style={{display:'grid', gap:8, maxWidth:320}}>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" />
          <button type="submit" style={{padding:'8px 12px', border:'1px solid #ccc', borderRadius:8}}>Đăng nhập</button>
        </form>
        {msg && <p style={{color:'green'}}>{msg}</p>}
      </Card>
    </div>
  );
}