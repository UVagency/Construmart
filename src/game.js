import { supabase, hasSupabase } from './supabase.js';

const TOTAL_HOTSPOTS = 4;
const found = new Set();
let sessionId = null;

export async function initGame() {
  sessionId = await createSession();

  document.querySelectorAll('.hotspot').forEach((el) => {
    el.addEventListener('click', () => handleHotspotClick(el));
  });

  const total = document.getElementById('total');
  if (total) total.textContent = String(TOTAL_HOTSPOTS);

  wireHelpModal();
}

async function createSession() {
  const leadEmail = sessionStorage.getItem('lead_email') || null;
  const leadPhone = sessionStorage.getItem('lead_phone') || null;

  if (!hasSupabase) {
    const localId = `local-${Date.now()}`;
    console.info('[game] offline session:', localId);
    return localId;
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      started_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      email: leadEmail,
      phone: leadPhone
    })
    .select()
    .single();

  if (error) {
    console.error('[game] error creando sesión:', error);
    return `local-${Date.now()}`;
  }
  return data.id;
}

async function handleHotspotClick(el) {
  const id = el.dataset.id;
  if (found.has(id)) return;

  found.add(id);

  // Feedback visual — azul Construmart al encontrar
  el.setAttribute('material', 'color: #2A5DB9; opacity: 0.9; emissive: #2A5DB9; emissiveIntensity: 0.6');
  el.setAttribute(
    'animation__found',
    'property: scale; to: 0.01 0.01 0.01; dur: 500; easing: easeInQuad'
  );

  // SFX
  const sfx = document.querySelector('#found-sfx');
  if (sfx?.components?.sound) sfx.components.sound.playSound();

  // HUD
  const counter = document.getElementById('counter');
  if (counter) counter.textContent = String(found.size);

  // Log hallazgo
  if (hasSupabase && !String(sessionId).startsWith('local-')) {
    await supabase
      .from('finds')
      .insert({
        session_id: sessionId,
        hotspot_id: id,
        found_at: new Date().toISOString()
      });
  }

  if (found.size === TOTAL_HOTSPOTS) {
    setTimeout(() => completeGame(), 800);
  }
}

async function completeGame() {
  const overlay = document.getElementById('complete-overlay');
  overlay?.classList.remove('hidden');

  // TODO: la edge function 'claim-coupon' se implementa en iteración 2.
  // Mientras tanto, si Supabase no está configurado o la function no existe,
  // redirigimos con un código placeholder para poder iterar la UI de success.
  if (!hasSupabase || String(sessionId).startsWith('local-')) {
    const fake = `UV-DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    window.location.href = `/success.html?code=${fake}`;
    return;
  }

  const { data, error } = await supabase.functions.invoke('claim-coupon', {
    body: { session_id: sessionId }
  });

  if (error || !data?.coupon_code) {
    console.error('[game] claim-coupon error:', error);
    alert('Error al obtener cupón. Intentá de nuevo.');
    overlay?.classList.add('hidden');
    return;
  }

  window.location.href = `/success.html?code=${data.coupon_code}`;
}

function wireHelpModal() {
  const btn = document.getElementById('help-btn');
  const modal = document.getElementById('help-modal');
  const close = document.getElementById('help-close');
  if (!btn || !modal) return;
  btn.addEventListener('click', () => modal.classList.remove('hidden'));
  close?.addEventListener('click', () => modal.classList.add('hidden'));
}
