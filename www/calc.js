/* منطق الحساب: مطابق لصيغ ملف الإكسيل "حساب تكلفة ترخيص.xlsx" */
(function (root) {
  'use strict';

  var DEF = {
    landA: '3.5', landB: '3', landC: '2.5', landD: '2',
    rA: '1', rB: '0.8', rC: '0.65', rD: '0.5', rL: '0.5',
    shArch: '0.4', shMep: '0.35', shSyn: '0.18',
    ofArch: '0.33', ofElec: '0.12', ofMech: '0.12',
    first: '0.6', antFee: '50', antBlock: '1000', healthRes: '10', healthCom: '40',
    synA: '5.5', synB: '5', synC: '4.5', synD: '4.5', synL: '4.5', synCom: '6',
    violA: '50', violB: '45', violC: '40', violD: '30'
  };

  var LANDKEY = { 'سكن أ': 'landA', 'سكن ب': 'landB', 'سكن ج': 'landC', 'سكن د وبلدة قديمة': 'landD' };
  var VIOLKEY = { 'سكن أ': 'violA', 'سكن ب': 'violB', 'سكن ج': 'violC', 'سكن د': 'violD' };
  var RKEY = { 'أ': 'rA', 'ب': 'rB', 'ج': 'rC', 'د': 'rD', 'حكم محلي': 'rL' };
  var SKEY = { 'أ': 'synA', 'ب': 'synB', 'ج': 'synC', 'د': 'synD', 'حكم محلي': 'synL' };

  function n(v) {
    var x = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(x) ? x : 0;
  }
  function isBlank(v) { return String(v == null ? '' : v).trim() === ''; }

  function calc(inp, c) {
    var A = n(inp.area), LA = n(inp.landArea), fx = n(inp.rate), inv = fx > 0 ? 1 / fx : 0;
    var fileI = n(inp.fileFee), fileJ = fileI * inv;
    var officeJ = n(inp.officeRate) * A, officeI = officeJ * fx;
    var authJ = n(inp.landAuth), authI = authJ * fx;
    var block = n(c.antBlock) > 0 ? n(c.antBlock) : 1000;
    var antJ = LA > 0 ? Math.ceil(LA / block) * n(c.antFee) : 0, antI = antJ * fx;
    var healthI = inp.btype === 'سكن' ? n(c.healthRes) : n(c.healthCom), healthJ = healthI * inv;
    var landRate = n(c[LANDKEY[inp.land]]);
    var ratioMissing = isBlank(c[RKEY[inp.muni]]);
    var ratio = ratioMissing ? 0 : n(c[RKEY[inp.muni]]);
    var muniPerM = landRate * ratio;
    var muniJ = muniPerM * A, muniI = muniJ * fx;
    var followI = n(inp.follow), followJ = followI * inv;
    var disc = n(inp.discount);

    var totJ = fileJ + officeJ + authJ + antJ + healthJ + muniJ + followJ;
    var totI = fileI + officeI + authI + antI + healthI + muniI + followI;

    var shA = n(c.shArch), shM = n(c.shMep), shS = n(c.shSyn);
    var partnersPerM = shA + shM + shS;
    var partJ = A * partnersPerM, partI = partJ * fx;
    var profJ = totJ - muniJ - healthJ - antJ - authJ - fileJ - partJ - disc;
    var profI = totI - muniI - healthI - antI - authI - fileI - partI - disc * fx;

    var synBase = inp.btype === 'سكن' ? n(c[SKEY[inp.muni]]) : n(c.synCom);
    var synRate = n(inp.synOver) > 0 ? n(inp.synOver) : synBase;
    var first = n(c.first);
    var firstJ = A * (synRate - shS) * first + shS * A, firstI = firstJ * fx;
    var official = n(c.ofArch) + n(c.ofElec) + n(c.ofMech);
    var refJ = (synRate - shS) * official * A - A * (shA + shM), refI = refJ * fx;

    return {
      A: A, LA: LA, fx: fx, block: block,
      fileI: fileI, fileJ: fileJ, officeJ: officeJ, officeI: officeI, authJ: authJ, authI: authI,
      antJ: antJ, antI: antI, healthI: healthI, healthJ: healthJ,
      landRate: landRate, ratio: ratio, ratioMissing: ratioMissing, muniPerM: muniPerM, muniJ: muniJ, muniI: muniI,
      followI: followI, followJ: followJ, disc: disc, totJ: totJ, totI: totI,
      shA: shA, shM: shM, shS: shS, partnersPerM: partnersPerM, partJ: partJ, partI: partI,
      profJ: profJ, profI: profI, synRate: synRate, first: first, firstJ: firstJ, firstI: firstI, refJ: refJ, refI: refI
    };
  }

  /* غرامة التجاوزات: المساحة × غرامة المتر حسب تصنيف الأرض [× نسبة استيفاء البلدية] */
  function calcViol(v, c, rate) {
    var A = n(v.area), r = n(c[VIOLKEY[v.land]]);
    var useRatio = !!v.useRatio;
    var missing = useRatio && isBlank(c[RKEY[v.muni]]);
    var ratio = !useRatio ? 1 : (missing ? 0 : n(c[RKEY[v.muni]]));
    var jod = A * r * ratio;
    return { A: A, perM: r, useRatio: useRatio, ratio: ratio, missing: missing, jod: jod, ils: jod * n(rate) };
  }

  var api = { DEF: DEF, LANDKEY: LANDKEY, VIOLKEY: VIOLKEY, RKEY: RKEY, SKEY: SKEY, n: n, isBlank: isBlank, calc: calc, calcViol: calcViol };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JewarCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
