// lib/renderBonusSection.js
const sanitizeHtml = require('sanitize-html');

function renderBonusSection(bonuses = []) {
  if (!bonuses.length) return '<p>No bonus resources available at this time.</p>';

  let html = '<ul style="list-style: none; padding: 0;">';
  for (const bonus of bonuses) {
    const safeTitle = sanitizeHtml(bonus.title || '');
    const safeDescription = sanitizeHtml(bonus.description || '');
    const safeLink = sanitizeHtml(bonus.access_link || '');

    html += `
      <li style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
        <strong style="font-size: 1.1rem; color: #111827;">${safeTitle}</strong><br />
        <div style="margin: 0.5rem 0; color: #4b5563;">${safeDescription}</div>
        <a href="${safeLink}" style="color: #2563eb; font-weight: 500;" target="_blank">Access Bonus</a>
      </li>
    `;
  }
  html += '</ul>';
  return html;
}

module.exports = renderBonusSection;
