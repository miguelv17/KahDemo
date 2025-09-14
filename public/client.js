// Utilidad: conectar socket
export function connectSocket(){
  const s = io();
  return s;
}

export function fmtTime(s){ return `${Math.max(0, s|0)}s`; }
