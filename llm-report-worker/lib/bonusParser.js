
// bonusParser.js (optional helper if parsing dynamically in future)
function parseBonusToolsFromPrompt(text) {
  const tools = [];
  if (/roi/i.test(text)) tools.push({
    title: 'Precious Metal ROI Calculator',
    description: 'Estimate your returns across gold, silver, and platinum.',
    link: 'https://assets.performancecorporate.com/tools/roi-calc.xlsx'
  });
  if (/alloc/i.test(text)) tools.push({
    title: 'Allocation Worksheet',
    description: 'Build a personalized metals strategy.',
    link: 'https://assets.performancecorporate.com/tools/allocation-worksheet.xlsx'
  });
  if (/red flag|scam|checklist/i.test(text)) tools.push({
    title: 'Red Flag Checklist for Online Buying',
    description: 'Avoid scams and unreliable sellers.',
    link: 'https://assets.performancecorporate.com/tools/red-flag-checklist.pdf'
  });
  return tools;
}

module.exports.parseBonusToolsFromPrompt = parseBonusToolsFromPrompt;
