// Copy buttons: copy the absolute ICS URL instead of opening the feed; where the clipboard is blocked, show it to copy by hand.
const copyStatus = document.getElementById('copy-status');
document.addEventListener('click', async (event) => {
  const link = event.target.closest('[data-copy]');
  if (!link) return;
  event.preventDefault();
  try {
    await navigator.clipboard.writeText(link.href);
  } catch {
    window.prompt('Copy this calendar link:', link.href);
    return;
  }
  const label = link.querySelector('span') ?? link;
  link.dataset.label ??= label.textContent;
  label.textContent = 'Copied';
  copyStatus.textContent = 'Link copied';
  clearTimeout(link.copyTimer);
  link.copyTimer = setTimeout(() => {
    label.textContent = link.dataset.label;
    copyStatus.textContent = '';
  }, 1500);
});

// Schedule: launches with a known time are rendered in UTC; show them in the visitor's time zone instead.
for (const time of document.querySelectorAll('time[data-local]')) {
  time.textContent = new Date(time.dateTime).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

// Next launch: the first launch in next.json that has not ended on the visitor's clock.
const panel = document.getElementById('next');
fetch('next.json')
  .then((res) => (res.ok ? res.json() : []))
  .then((launches) => {
    let current = null;
    const tick = () => {
      const now = Date.now();
      const launch = launches.find((item) => Date.parse(item.end) > now);
      if (!launch) {
        panel.hidden = true;
        return;
      }
      if (launch !== current) {
        current = launch;
        show(launch);
      }
      const untilStart = Date.parse(launch.start) - now;
      document.getElementById('next-heading').textContent = launch.timed && untilStart <= 0 ? 'Just launched' : 'Next launch';
      document.getElementById('next-clock').textContent = launch.timed ? clock(untilStart) : '';
    };
    tick();
    setInterval(tick, 1000);
  })
  .catch(() => { panel.hidden = true; });

function show(launch) {
  const title = document.getElementById('next-title');
  title.textContent = launch.title.replace(/^🚀\s*/, '').replace(/\s\((TBD|TBC|Hold)\)$/, '');
  if (!launch.confirmed) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = 'Not confirmed';
    title.append(tag);
  }
  const start = new Date(launch.start);
  document.getElementById('next-when').textContent = launch.timed
    ? start.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    : `${start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}, time not set yet`;
  const meta = document.getElementById('next-meta');
  meta.textContent = launch.location;
  if (launch.url) {
    const watch = document.createElement('a');
    watch.href = launch.url;
    watch.textContent = 'Webcast';
    watch.rel = 'noopener';
    meta.append(' · ', watch);
  }
  panel.hidden = false;
}

/** "T- 2d 04:13:22" before liftoff, "T+ 00:12:03" after. */
function clock(ms) {
  const sign = ms > 0 ? 'T-' : 'T+';
  const total = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(total / 86400);
  const hms = [Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60].map((n) => String(n).padStart(2, '0')).join(':');
  return `${sign} ${days > 0 ? `${days}d ` : ''}${hms}`;
}
