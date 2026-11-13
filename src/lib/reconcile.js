// ตรวจยอดดุลเงินสำรองจ่าย
// สมมติฐาน: รายการ "รับ" = เงินที่ได้รับคืน/เติมเข้ามา, รายการ "เบิก" ที่เคลียร์แล้ว = ส่งเบิกชดเชยไปแล้ว
// ถ้าเคลียร์ครบและได้เงินคืนครบ  ยอดเงินสดควรกลับมาเท่ายอดตั้งต้น
//   ยอดคาดการณ์หลังเคลียร์ = ยอดคงเหลือปัจจุบัน + เบิกที่ยังไม่เคลียร์
//   ส่วนต่างดิบ = ยอดคาดการณ์ − ยอดตั้งต้น = รับทั้งหมด − เบิกที่เคลียร์แล้ว
//   ส่วนต่างจริง = ส่วนต่างดิบ + ยอดล็อตที่รอรับเงิน (เงินที่กำลังจะเข้า)
const num = (v) => parseFloat(v) || 0;
const round2 = (n) => Math.round(n * 100) / 100;

export function computeReconcile(entries, opening, batches = []) {
  const income = entries.reduce((s, e) => s + num(e.income_amount), 0);
  const expense = entries.reduce((s, e) => s + num(e.expense_amount), 0);
  const uncleared = entries.filter((e) => !e.cleared && num(e.expense_amount) > 0);
  const clearedRows = entries.filter((e) => e.cleared);
  const unclearedExpense = uncleared.reduce((s, e) => s + num(e.expense_amount), 0);
  const clearedExpense = clearedRows.reduce((s, e) => s + num(e.expense_amount), 0);

  const currentBalance = round2(opening + income - expense);
  const projected = round2(currentBalance + unclearedExpense);
  const rawDiff = round2(projected - opening);
  // ล็อตที่ส่งเบิกแล้วแต่ยังไม่ได้รับเงินคืน ไม่นับเป็นยอดหลุด
  const pendingBatches = batches.filter((b) => b.status !== 'received');
  const pendingTotal = round2(pendingBatches.reduce((s, b) => s + num(b.total), 0));
  const unassigned = clearedRows.filter((e) => !e.batch_id);
  const unassignedTotal = round2(unassigned.reduce((s, e) => s + num(e.expense_amount), 0));
  const diff = round2(rawDiff + pendingTotal);
  const status = Math.abs(diff) < 0.005 ? 'balanced' : diff > 0 ? 'over' : 'short';

  // ช่วยไล่หาสาเหตุ: รายการเดี่ยวที่ยอดเท่ากับส่วนต่างพอดี
  const abs = Math.abs(diff);
  const suspects = status === 'balanced' ? [] : entries.filter((e) => {
    const target = status === 'short' ? num(e.expense_amount) : num(e.income_amount);
    return Math.abs(target - abs) < 0.005 && target > 0;
  }).slice(0, 5);

  return {
    opening, income, expense, currentBalance,
    unclearedCount: uncleared.length, unclearedExpense: round2(unclearedExpense),
    clearedCount: clearedRows.length, clearedExpense: round2(clearedExpense),
    projected, rawDiff, diff, status, suspects,
    pendingCount: pendingBatches.length, pendingTotal,
    unassignedCount: unassigned.length, unassignedTotal,
  };
}
