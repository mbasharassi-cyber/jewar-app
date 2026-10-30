// اختبار: النتائج الافتراضية يجب أن تطابق خلايا ملف الإكسيل الأصلي
const assert = require('assert');
const { DEF, calc, calcViol } = require('../www/calc.js');

const base = { muni: 'ج', land: 'سكن ج', btype: 'سكن', area: '100', landArea: '100', rate: '4.3',
  fileFee: '200', officeRate: '3.5', landAuth: '0', follow: '200', discount: '8', synOver: '' };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, msg + ' expected ' + b + ' got ' + a);

const r = calc(base, DEF);
near(r.totJ, 657.84883720930236, 'E22 المجموع د.أ');
near(r.totI, 2828.75, 'F22 المجموع ₪');
near(r.muniJ, 162.5, 'E18 البلدية');
near(r.antJ, 50, 'E16 الآثار');
near(r.healthJ, 2.3255813953488373, 'E17 الصحة');
near(r.profJ, 295.5116279069768, 'E26 ربح JEWAR');
near(r.profI, 1270.6999999999998, 'F26 ربح JEWAR ₪');
near(r.firstJ, 277.2, 'E28 دفعة النقابة');
near(r.partJ, 93, 'E29 حصة النقابة والمتعاونين');
near(r.refJ, 171.24000000000007, 'E30 مرتجع');

// صورة التجاوزات: 50 م² × 40 × 0.65 = 1300 د.أ = 5590 ₪
const v = calcViol({ area: '50', land: 'سكن ج', muni: 'ج', useRatio: true }, DEF, '4.3');
near(v.jod, 1300, 'تجاوزات د.أ'); near(v.ils, 5590, 'تجاوزات ₪');
near(calcViol({ area: '50', land: 'سكن ج', muni: 'ج', useRatio: false }, DEF, '4.3').jod, 2000, 'تجاوزات بدون نسبة');

// بلدية بلا نسبة => تنبيه
const m = calc(Object.assign({}, base, { muni: 'ب' }), Object.assign({}, DEF, { rB: '' }));
assert.strictEqual(m.ratioMissing, true);
console.log('كل الاختبارات نجحت');
