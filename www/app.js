(function () {
  'use strict';
  var C = window.JewarCalc;
  var $app = document.getElementById('app');

  /* ---------- تخزين دائم: localStorage + نسخة في Preferences (أندرويد) ---------- */
  var KEYS = { cfg: 'jewarCfg2', log: 'jewarLog', inp: 'jewarInp' };
  function plug(name) { var c = window.Capacitor; return c && c.Plugins && c.Plugins[name]; }
  function isNative() { var c = window.Capacitor; return !!(c && c.isNativePlatform && c.isNativePlatform()); }
  function persist(key, obj) {
    var s = JSON.stringify(obj);
    try { localStorage.setItem(key, s); } catch (e) {}
    var p = plug('Preferences');
    if (p) { try { p.set({ key: key, value: s }); } catch (e) {} }
  }
  async function load(key) {
    var raw = null;
    try { raw = localStorage.getItem(key); } catch (e) {}
    if (!raw) {
      var p = plug('Preferences');
      if (p) { try { raw = (await p.get({ key: key })).value; } catch (e) {} }
    }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* ---------- الحالة ---------- */
  var S = {
    view: 'main', cfg: Object.assign({}, C.DEF), log: [], search: '', delId: null,
    saveOpen: false, saveName: '', toast: '',
    inp: { muni: 'ج', land: 'سكن ج', btype: 'سكن', area: '100', landArea: '100', rate: '4.3', fileFee: '200', officeRate: '3.5', landAuth: '0', follow: '200', discount: '8', synOver: '' },
    v: { area: '50', land: 'سكن ج', muni: 'ج', useRatio: true }
  };

  /* ---------- أدوات ---------- */
  var n = C.n;
  function f(x, d) { d = d == null ? 2 : d; return x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function fmtDate(ts) { var d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function getPath(p) { return p.split('.').reduce(function (o, k) { return o[k]; }, S); }
  function setPath(p, v) { var a = p.split('.'), last = a.pop(), o = a.reduce(function (o, k) { return o[k]; }, S); o[last] = v; }

  var ICON = {
    main: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2"/></svg>',
    viol: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    log: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    settings: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>'
  };
  var NAV = [['main', 'الحاسبة'], ['viol', 'التجاوزات'], ['log', 'السجل'], ['settings', 'القيم المرجعية']];

  function seg(path, val, label, sub) {
    var cur = String(getPath(path)) === String(val);
    return '<button type="button" class="seg' + (cur ? ' on' : '') + '" aria-pressed="' + cur + '" data-act="set" data-path="' + path + '" data-val="' + esc(val) + '">' + esc(label) + (sub ? '<small class="num">' + sub + '</small>' : '') + '</button>';
  }
  function field(label, path, unit, extra) {
    return '<label class="f"><span>' + label + (unit ? ' <small>(' + unit + ')</small>' : '') + '</span><input class="inp" inputmode="decimal" data-f="' + path + '" value="' + esc(getPath(path)) + '"' + (extra || '') + '></label>';
  }

  /* ---------- أجزاء النتائج (تُحدَّث دون إعادة رسم الحقول) ---------- */
  function partRows(r) {
    var i = S.inp, c = S.cfg;
    var rows = [
      ['رسوم فتح ملف', 'تُدخل بالشيكل', r.fileJ, r.fileI],
      ['أتعاب المكتب', f(r.A, 0) + ' م² × ' + f(n(i.officeRate)) + ' د.أ', r.officeJ, r.officeI],
      ['سلطة أراضي / أملاك الدولة', '', r.authJ, r.authI],
      ['رسوم الآثار', f(n(c.antFee), 0) + ' د.أ لكل ' + f(r.block, 0) + ' م² أو جزء منها · أرض ' + f(r.LA, 0) + ' م²', r.antJ, r.antI],
      ['رسوم ختم الصحة', (i.btype === 'سكن' ? 'سكن: ' : 'تجاري: ') + f(r.healthI, 0) + ' ₪ ثابتة', r.healthJ, r.healthI],
      ['رسوم ترخيص البلدية', r.ratioMissing ? 'نسبة الاستيفاء غير مُدخلة' : f(r.landRate, 1) + ' × ' + f(r.ratio) + ' = ' + f(r.muniPerM, 3) + ' د.أ/م² × ' + f(r.A, 0) + ' م²', r.ratioMissing ? null : r.muniJ, r.ratioMissing ? null : r.muniI],
      ['رسوم متابعة', 'تُدخل بالشيكل', r.followJ, r.followI]
    ];
    var h = '<div class="g3 thead"><div>البند</div><div>دينار أردني</div><div>شيكل</div></div>';
    rows.forEach(function (x) {
      h += '<div class="g3 cost"><div><b>' + x[0] + '</b>' + (x[1] ? '<div class="note num">' + x[1] + '</div>' : '') + '</div><div class="num"><b>' + (x[2] == null ? '—' : f(x[2])) + '</b></div><div class="num" style="color:var(--muted2)">' + (x[3] == null ? '—' : f(x[3])) + '</div></div>';
    });
    h += '<div class="g3 total"><div style="font-size:17px;font-weight:700">المجموع النهائي</div><div class="num" style="font-size:19px;font-weight:700">' + f(r.totJ) + '</div><div class="num" style="font-size:17px;font-weight:600">' + f(r.totI) + '</div></div>';
    return h;
  }
  function tile(cls, title, j, i, note) {
    return '<div class="tile ' + cls + '"><div style="font-size:14px;font-weight:600">' + title + '</div><div class="big num">' + f(j) + ' <span style="font-size:14px;font-weight:500">د.أ</span></div><div class="s2 num">' + f(i) + ' ₪</div><div class="s3">' + note + '</div></div>';
  }
  function partTiles(r) {
    return tile('hi', 'ربح JEWAR', r.profJ, r.profI, 'المجموع ناقص رسوم الجهات وحصة الشركاء والخصم الخاص') +
      tile('', 'دفعة النقابة الأولى (' + f(r.first * 100, 0) + '%)', r.firstJ, r.firstI, 'مبلغ استرشادي لتحديد قيمة الدفعة الأولى') +
      tile('', 'حصة النقابة والمتعاونين', r.partJ, r.partI, f(r.A, 0) + ' م² × ' + f(r.partnersPerM) + ' د.أ') +
      tile('', 'مرتجع', r.refJ, r.refI, 'بحسب معادلة الملف');
  }
  function partSyn(r) {
    var i = S.inp;
    var src = i.btype === 'سكن' ? 'من جدول النقابة: سكن · ' + (i.muni === 'حكم محلي' ? 'حكم محلي' : 'بلديات (' + i.muni + ')') : 'من جدول النقابة: مراكز تجارية';
    return '<div><div style="font-size:14px;font-weight:600">سعر المتر الرسمي في النقابة</div><div class="num" style="font-size:22px;font-weight:700">' + f(r.synRate) + ' <span style="font-size:13px;font-weight:500;color:var(--muted)">د.أ / م²</span></div><div class="sub" style="font-size:13px">' + src + '</div></div>' +
      '<div class="num sub" style="font-size:13px;line-height:1.6">حصص الشركاء لكل متر: معماري ' + f(r.shA) + ' + ميكانيك وكهرباء ' + f(r.shM) + ' + نقابة ' + f(r.shS) + ' = ' + f(r.partnersPerM) + ' د.أ / م²</div>';
  }
  function partAlert(r) {
    return r.ratioMissing ? '<div class="alert" role="alert">تصنيف البلدية «' + esc(S.inp.muni) + '» بلا نسبة استيفاء، لذلك رسوم البلدية غير محسوبة. أدخل النسبة من «القيم المرجعية».</div>' : '';
  }
  function partViol() {
    var v = C.calcViol(S.v, S.cfg, S.inp.rate);
    var h = v.missing ? '<div class="alert" role="alert">تصنيف البلدية بلا نسبة استيفاء. أدخلها من «القيم المرجعية».</div>' : '';
    h += '<div class="tile hi" style="border-bottom:4px solid var(--gold)"><div style="font-size:14px;font-weight:600">إجمالي الغرامة</div><div class="big num" style="font-size:34px">' + (v.missing ? '—' : f(v.jod)) + ' <span style="font-size:15px;font-weight:500">د.أ</span></div><div class="s2 num" style="font-size:18px;font-weight:600">' + (v.missing ? '—' : f(v.ils)) + ' ₪</div></div>';
    h += '<div class="box num" style="font-size:14px;line-height:1.9;color:var(--muted2);white-space:pre-line">' + (v.missing ? 'أدخل نسبة الاستيفاء لإكمال الحساب' : f(v.A, 0) + ' م² × ' + f(v.perM, 0) + ' د.أ' + (v.useRatio ? ' × ' + f(v.ratio) : '') + ' = ' + f(v.jod) + ' د.أ\n× ' + f(n(S.inp.rate)) + ' = ' + f(v.ils) + ' ₪') + '</div>';
    return h;
  }
  function partSaveSummary() {
    var r = C.calc(S.inp, S.cfg), i = S.inp;
    return esc(i.btype + ' · بلدية ' + i.muni + ' · ' + i.land + ' · بناء ' + f(r.A, 0) + ' م²') + '<br>المجموع ' + f(r.totJ) + ' د.أ · ربحك ' + f(r.profJ) + ' د.أ';
  }

  /* ---------- الشاشات ---------- */
  function viewMain() {
    var i = S.inp, c = S.cfg;
    var munis = ['أ', 'ب', 'ج', 'د', 'حكم محلي'].map(function (m) { return seg('inp.muni', m, m); }).join('');
    var lands = Object.keys(C.LANDKEY).map(function (l) { return seg('inp.land', l, l, f(n(c[C.LANDKEY[l]]), 1) + ' د.أ / م²'); }).join('');
    var types = ['سكن', 'تجاري'].map(function (t) { return seg('inp.btype', t, t); }).join('');
    var rawRatio = c[C.RKEY[i.muni]];
    return '<div class="head"><div><h1>حاسبة رسوم ترخيص الأبنية</h1><div class="sub">رسوم الجهات، أتعاب المكتب، وحصص النقابة والمتعاونين</div></div>' +
      '<label class="f" style="flex-direction:row;align-items:center;background:#fff;border:1px solid var(--line);border-radius:14px;padding:8px 14px;gap:10px"><span>سعر الصرف: 1 د.أ =</span><input class="inp" style="width:86px" inputmode="decimal" data-f="inp.rate" value="' + esc(i.rate) + '"><span>₪</span></label></div>' +
      '<div class="cols"><div class="col">' +
      '<section class="card" style="gap:20px"><h2>بيانات المشروع</h2>' +
      '<div><div class="sub" style="font-weight:600;color:var(--ink);margin-bottom:8px">تصنيف البلدية</div><div class="row">' + munis + '</div><div class="sub" style="font-size:13px;margin-top:8px">نسبة الاستيفاء: <b class="num" id="ratioTxt" style="color:var(--ink)">' + (C.isBlank(rawRatio) ? 'غير مُدخلة' : f(n(rawRatio))) + '</b></div></div>' +
      '<div><div class="sub" style="font-weight:600;color:var(--ink);margin-bottom:8px">تصنيف قطعة الأرض</div><div class="grid2">' + lands + '</div></div>' +
      '<div><div class="sub" style="font-weight:600;color:var(--ink);margin-bottom:8px">نوع البناء</div><div class="row">' + types + '</div></div>' +
      '<div class="fields">' + field('مجموع مساحات البناء (م²)', 'inp.area') + field('مساحة قطعة الأرض (م²)', 'inp.landArea') + '</div></section>' +
      '<section class="card"><div><h2>رسوم وقيم قابلة للتعديل</h2><div class="sub" style="margin-top:4px">الخانات الذهبية هي نفسها المتغيرات في ملف الإكسيل</div></div><div class="fields">' +
      field('رسوم فتح ملف', 'inp.fileFee', '₪') + field('تكلفة المتر للمكتب', 'inp.officeRate', 'د.أ / م²') + field('سلطة أراضي / أملاك الدولة', 'inp.landAuth', 'د.أ') + field('رسوم متابعة', 'inp.follow', '₪') + field('خصم خاص', 'inp.discount', 'د.أ · من ربحك فقط') +
      '</div></section></div>' +
      '<div class="col wide"><section class="card" style="gap:6px"><h2 style="margin-bottom:8px">جدول احتساب التكاليف</h2><div id="alertBox"></div><div id="rowsBox"></div></section>' +
      '<section class="card" style="gap:16px"><h2>حسابات المكتب والنقابة</h2><div class="tiles" id="tilesBox"></div>' +
      '<div class="box" style="display:flex;flex-wrap:wrap;gap:14px 24px;align-items:flex-end;justify-content:space-between"><div id="synBox" style="display:flex;flex-direction:column;gap:10px;flex:1 1 260px;min-width:0"></div><label class="f" style="width:150px"><span style="font-size:13px">تعديل يدوي (اختياري)</span><input class="inp" inputmode="decimal" placeholder="—" data-f="inp.synOver" value="' + esc(i.synOver) + '"></label></div></section>' +
      '<button type="button" class="btn gold big" data-act="openSave"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>حفظ في سجل الزبائن</button>' +
      '</div></div>';
  }

  function viewViol() {
    var c = S.cfg;
    var lands = Object.keys(C.VIOLKEY).map(function (l) { return seg('v.land', l, l, f(n(c[C.VIOLKEY[l]]), 0) + ' د.أ / م²'); }).join('');
    var ratioOpts = seg('v.useRatio', 'true', 'مع نسبة الاستيفاء') + seg('v.useRatio', 'false', 'بدون نسبة (المبلغ الكامل)');
    var munis = ['أ', 'ب', 'ج', 'د', 'حكم محلي'].map(function (m) { return seg('v.muni', m, m); }).join('');
    var raw = c[C.RKEY[S.v.muni]];
    return '<div><h1>حاسبة غرامات التجاوزات</h1><div class="sub" style="margin-top:4px">غرامة البلدية على مساحة التجاوز، بنفس سعر الصرف ونسب الاستيفاء في الحاسبة الرئيسية</div></div>' +
      '<div class="cols"><section class="card col" style="gap:22px"><h2>بيانات التجاوز</h2>' +
      field('مجموع مساحة التجاوزات (م²)', 'v.area') +
      '<div><div class="sub" style="font-weight:600;color:var(--ink);margin-bottom:8px">تصنيف قطعة الأرض</div><div class="grid2">' + lands + '</div></div>' +
      '<div><div class="sub" style="font-weight:600;color:var(--ink);margin-bottom:8px">نسبة استيفاء البلدية</div><div class="row">' + ratioOpts + '</div></div>' +
      (S.v.useRatio ? '<div><div class="sub" style="font-weight:600;color:var(--ink);margin-bottom:8px">تصنيف البلدية</div><div class="row">' + munis + '</div><div class="sub" style="font-size:13px;margin-top:8px">نسبة الاستيفاء: <b class="num" id="vRatioTxt" style="color:var(--ink)">' + (C.isBlank(raw) ? 'غير مُدخلة' : f(n(raw))) + '</b></div></div>' : '') +
      '</section><section class="card col" style="gap:16px"><h2>غرامة البلدية</h2><div id="violBox" style="display:flex;flex-direction:column;gap:16px"></div></section></div>';
  }

  function logListHtml() {
    var q = S.search.trim();
    var shown = S.log.filter(function (x) { return q === '' || x.name.indexOf(q) !== -1; });
    if (!shown.length) {
      return '<section class="card" style="align-items:center;text-align:center;padding:44px 20px"><div style="font-size:18px;font-weight:700">' + (S.log.length ? 'لا نتائج مطابقة' : 'لا توجد حسابات محفوظة بعد') + '</div><div class="sub" style="max-width:420px;line-height:1.7">' + (S.log.length ? 'جرّب كتابة جزء آخر من الاسم.' : 'احسب من شاشة الحاسبة ثم اضغط «حفظ في سجل الزبائن» وأدخل اسم الزبون.') + '</div></section>';
    }
    return '<div style="display:flex;flex-direction:column;gap:12px">' + shown.map(function (x) {
      var del = S.delId === x.id;
      return '<article class="rec"><div style="min-width:170px;flex:1 1 200px"><div class="nm">' + esc(x.name) + '</div><div class="num sub" style="font-size:13px">' + fmtDate(x.ts) + '</div><div style="font-size:13px;color:var(--muted2)">' + esc(x.inp.btype + ' · بلدية ' + x.inp.muni + ' · ' + x.inp.land + ' · بناء ' + f(n(x.inp.area), 0) + ' م²') + '</div></div>' +
        '<div style="display:flex;gap:22px;flex-wrap:wrap"><div class="stat"><span>المجموع</span><b class="num">' + f(x.res.totJ) + ' د.أ</b></div><div class="stat"><span>ربح JEWAR</span><b class="num pf">' + f(x.res.profJ) + ' د.أ</b></div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-act="openRec" data-id="' + x.id + '">فتح في الحاسبة</button><button type="button" class="btn' + (del ? ' danger' : '') + '" data-act="delRec" data-id="' + x.id + '">' + (del ? 'تأكيد الحذف' : 'حذف') + '</button></div></article>';
    }).join('') + '</div>';
  }
  function viewLog() {
    return '<div class="head"><div><h1>سجل الزبائن</h1><div class="sub" style="margin-top:4px">الحسابات المحفوظة على هذا الجهاز</div></div>' +
      '<div class="tools"><label class="f" style="width:210px"><span style="font-size:13px">بحث بالاسم</span><input class="txt" data-f="search" value="' + esc(S.search) + '" placeholder="اسم الزبون"></label>' +
      '<button type="button" class="btn gold" data-act="exportCsv">تصدير السجل (Excel)</button></div></div>' +
      '<section class="card" style="flex-direction:row;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:14px 18px"><div style="flex:1 1 260px"><div style="font-weight:700;font-size:15px">النسخة الاحتياطية</div><div class="sub" style="font-size:13px;line-height:1.6">احفظ نسخة كاملة (السجل والقيم المرجعية) واستعدها عند تغيير الهاتف.</div></div><div class="tools"><button type="button" class="btn" data-act="backup">حفظ نسخة احتياطية</button><button type="button" class="btn" data-act="restore">استعادة نسخة</button></div></section>' +
      '<div id="logList">' + logListHtml() + '</div>';
  }

  var SYN = [
    ['1', 'سكن', 'بلديات (أ)', '5.500'], ['', '', 'بلديات (ب)', '5.000'], ['', '', 'بلديات (ج) + حكم محلي', '4.500'],
    ['2', 'مراكز تجارية', 'بلديات (أ، ب، ج) + حكم محلي', '6.000'], ['3', 'مبانٍ صناعية خرسانية', 'بلديات (أ، ب، ج) + حكم محلي', '6.000'],
    ['4', 'مبانٍ عامة (بغض النظر عن جهة الترخيص)', 'مدارس، كليات وجامعات، مجمعات صحية وعيادات طبية', '7.500'],
    ['', '', 'مستشفيات، فنادق، قاعات عامة، مراكز ثقافية، متاحف، مسارح', '10.000'], ['', '', 'بنوك', '10.000'],
    ['5', 'الأبنية السكنية التجارية', 'استخدام تجاري / فندقي', '6.000'],
    ['6', 'مصانع وهناجر وإنشاءات معدنية', 'بدون تمديدات الآلات الكهربائية والميكانيكية', '3.000'], ['7', 'مصانع وهناجر وإنشاءات معدنية', 'مع تمديدات الآلات الكهربائية والميكانيكية', '5.500'],
    ['8', 'منشآت زراعية', 'بدون تمديدات ماكينات وتجهيزات', '3.000'], ['9', 'منشآت زراعية', 'مع تمديدات ماكينات وتجهيزات', '4.000'],
    ['10', 'العطاءات العامة لمختلف أنواع الأبنية', 'تصميم ووثائق عطاء بغض النظر عن التفاصيل', '(أتعاب التصميم × 1.4) + ½ دينار'],
    ['11', 'ترميم أبنية عامة مرخصة وإعادة تأهيل', 'مع وثائق عطاء', 'أتعاب التصميم'], ['12', 'ترميم أبنية عامة للترخيص وإعادة تأهيل', 'مع وثائق عطاء', '1.4 × أتعاب'],
    ['13', 'أي منشآت لم يرد ذكرها', '', 'يترك القرار فيها لمجلس الهيئة']
  ];
  function viewSettings() {
    function row(key, label, unit) { return '<label class="setrow"><span>' + label + (unit ? ' <small>' + unit + '</small>' : '') + '</span><input class="cfg" inputmode="decimal" placeholder="—" data-f="cfg.' + key + '" value="' + esc(S.cfg[key]) + '"></label>'; }
    function grp(title, note, rows) { return '<section class="card" style="padding:20px;gap:14px"><div><h2 style="font-size:18px">' + title + '</h2><div class="sub" style="font-size:13px;line-height:1.6;margin-top:4px">' + note + '</div></div>' + rows.join('') + '</section>'; }
    var m = 'د.أ/م²';
    var groups = [
      grp('جدول أ · رسوم المتر حسب تصنيف الأرض', 'سعر المتر للبلدية قبل ضربه بنسبة الاستيفاء.', [row('landA', 'سكن أ', m), row('landB', 'سكن ب', m), row('landC', 'سكن ج', m), row('landD', 'سكن د وبلدة قديمة', m)]),
      grp('جدول ب · نسبة الاستيفاء حسب البلدية', 'اترك الخانة فارغة إذا لم تُحدَّد النسبة، وسيظهر تنبيه في الحاسبة.', [row('rA', 'بلدية أ'), row('rB', 'بلدية ب'), row('rC', 'بلدية ج'), row('rD', 'بلدية د'), row('rL', 'حكم محلي')]),
      grp('جدول ج · حصص الشركاء الفعلية', 'تُخصم من المجموع لحساب ربح المكتب وتُدفع للشركاء.', [row('shArch', 'حصة معماري', m), row('shMep', 'حصة ميكانيك وكهرباء', m), row('shSyn', 'حصة نقابة', m)]),
      grp('حصص النقابة الرسمية (للمرتجع)', 'الأجزاء الرسمية من سعر المتر في النقابة، وتدخل في معادلة المرتجع.', [row('ofArch', 'حصة المعماري الرسمية', 'من سعر المتر'), row('ofElec', 'حصة الكهرباء الرسمية', 'من سعر المتر'), row('ofMech', 'حصة الميكانيك الرسمية', 'من سعر المتر')]),
      grp('رسوم النقابة · سكن', 'سعر المتر الرسمي حسب تصنيف البلدية، من جدول النقابة. «د» مساوية للحكم المحلي.', [row('synA', 'بلديات أ', m), row('synB', 'بلديات ب', m), row('synC', 'بلديات ج', m), row('synD', 'بلديات د', m), row('synL', 'حكم محلي', m)]),
      grp('رسوم النقابة · تجاري', 'مراكز تجارية: بلديات أ، ب، ج + حكم محلي.', [row('synCom', 'مراكز تجارية', m)]),
      grp('غرامات التجاوزات · المتر المربع', 'غرامة المتر حسب تصنيف الأرض، تُضرب بنسبة استيفاء البلدية.', [row('violA', 'سكن أ', m), row('violB', 'سكن ب', m), row('violC', 'سكن ج', m), row('violD', 'سكن د', m)]),
      grp('الدفعة الأولى للنقابة', 'نسبة الدفعة الأولى من الأتعاب بعد خصم حصة النقابة.', [row('first', 'نسبة الدفعة الأولى', '0.6 = 60%')]),
      grp('رسوم ثابتة', 'رسوم الآثار وختم الصحة.', [row('antFee', 'رسوم الآثار', 'د.أ'), row('antBlock', 'لكل مساحة أرض', 'م² أو جزء'), row('healthRes', 'ختم الصحة · سكن', '₪'), row('healthCom', 'ختم الصحة · تجاري', '₪')])
    ].join('');
    return '<div class="head"><div><h1>القيم المرجعية</h1><div class="sub" style="margin-top:4px;max-width:620px;line-height:1.6">هذه الجداول والنسب تُحدَّث نادرًا. أي تعديل يُحفظ على هذا الجهاز ويُطبَّق فورًا على الحاسبة.</div></div><button type="button" class="btn danger" data-act="resetCfg">استعادة القيم الأصلية</button></div>' +
      '<div class="setgrid">' + groups + '</div>' +
      '<section class="card" style="padding:20px;gap:12px"><div><h2 style="font-size:18px">جدول رسوم النقابة الكامل (للاطلاع)</h2><div class="sub" style="font-size:13px;line-height:1.6;margin-top:4px">الفئات 1 و2 فقط مفعّلة في الحاسبة حاليًا. باقي الفئات تُضاف عند معرفة رسومها.</div></div><div class="scroll"><div class="syn"><div class="g sub" style="font-weight:600;font-size:13px;border-top:0"><div>#</div><div>نوع البناء</div><div>جهة الترخيص / التفصيل</div><div>الأتعاب (د.أ / م²)</div></div>' +
      SYN.map(function (r) { return '<div class="g"><div class="num sub">' + r[0] + '</div><div style="font-weight:600">' + r[1] + '</div><div>' + r[2] + '</div><div class="num" style="font-weight:700">' + r[3] + '</div></div>'; }).join('') + '</div></div></section>';
  }

  function saveDialog() {
    return '<div class="over"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="saveTitle"><h2 id="saveTitle" style="font-size:22px">حفظ في السجل</h2>' +
      '<label class="f"><span>اسم الزبون</span><input class="txt" id="saveName" data-f="saveName" value="' + esc(S.saveName) + '" placeholder="مثال: أحمد خليل · فيلا بيت ليقيا"></label>' +
      '<div class="box num" id="saveSummary" style="font-size:14px;line-height:1.8;color:var(--muted2)">' + partSaveSummary() + '</div>' +
      '<div style="display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn" data-act="closeSave">إلغاء</button><button type="button" class="btn gold" data-act="confirmSave">حفظ</button></div></div></div>';
  }

  /* ---------- الرسم ---------- */
  function render() {
    var nav = NAV.map(function (t) {
      var badge = t[0] === 'log' && S.log.length ? '<span class="badge num">' + S.log.length + '</span>' : '';
      return '<button type="button" class="nav' + (S.view === t[0] ? ' on' : '') + '"' + (S.view === t[0] ? ' aria-current="page"' : '') + ' data-act="nav" data-view="' + t[0] + '">' + ICON[t[0]] + '<span>' + t[1] + '</span>' + badge + '</button>';
    }).join('');
    var body = S.view === 'main' ? viewMain() : S.view === 'viol' ? viewViol() : S.view === 'log' ? viewLog() : viewSettings();
    $app.innerHTML = '<header class="top"><img src="logo.png" alt="مكتب جوار الهندسي JEWAR Eng. Office"><nav aria-label="التنقل">' + nav + '</nav></header>' + body + (S.saveOpen ? saveDialog() : '') + (S.toast ? '<div class="toast" role="status">' + esc(S.toast) + '</div>' : '');
    refresh();
    if (S.saveOpen) { var el = document.getElementById('saveName'); if (el) el.focus(); }
  }
  function setHtml(id, h) { var el = document.getElementById(id); if (el) el.innerHTML = h; }
  function setText(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }
  function refresh() {
    if (S.view === 'main') {
      var r = C.calc(S.inp, S.cfg), raw = S.cfg[C.RKEY[S.inp.muni]];
      setText('ratioTxt', C.isBlank(raw) ? 'غير مُدخلة' : f(n(raw)));
      setHtml('alertBox', partAlert(r)); setHtml('rowsBox', partRows(r)); setHtml('tilesBox', partTiles(r)); setHtml('synBox', partSyn(r));
    } else if (S.view === 'viol') {
      setHtml('violBox', partViol());
    }
    if (S.saveOpen) setHtml('saveSummary', partSaveSummary());
  }
  function toast(t) {
    S.toast = t; render();
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { S.toast = ''; var el = document.querySelector('.toast'); if (el) el.remove(); }, 3200);
  }
  function saveInputs() { persist(KEYS.inp, { inp: S.inp, v: S.v }); }

  /* ---------- حفظ/تصدير ---------- */
  async function saveFile(name, text, mime) {
    if (isNative() && plug('Filesystem') && plug('Share')) {
      var fs = plug('Filesystem');
      await fs.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      var u = await fs.getUri({ path: name, directory: 'CACHE' });
      await plug('Share').share({ title: name, url: u.uri, dialogTitle: 'حفظ أو مشاركة الملف' });
      return;
    }
    var blob = new Blob([text], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function csvText() {
    var head = ['التاريخ', 'اسم الزبون', 'نوع البناء', 'البلدية', 'تصنيف الأرض', 'مساحة البناء م2', 'مساحة الأرض م2', 'سعر الصرف', 'المجموع د.أ', 'المجموع شيكل', 'ربح JEWAR د.أ', 'ربح JEWAR شيكل', 'دفعة النقابة الأولى د.أ', 'حصة النقابة والمتعاونين د.أ', 'مرتجع د.أ', 'خصم خاص د.أ'];
    var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var lines = [head.map(q).join(',')].concat(S.log.map(function (x) {
      return [fmtDate(x.ts), x.name, x.inp.btype, x.inp.muni, x.inp.land, x.inp.area, x.inp.landArea, x.inp.rate, x.res.totJ.toFixed(2), x.res.totI.toFixed(2), x.res.profJ.toFixed(2), x.res.profI.toFixed(2), x.res.firstJ.toFixed(2), x.res.partJ.toFixed(2), x.res.refJ.toFixed(2), x.inp.discount].map(q).join(',');
    }));
    return '﻿' + lines.join('\r\n');
  }
  async function doExport() {
    if (!S.log.length) { toast('السجل فارغ، لا يوجد ما يُصدَّر'); return; }
    try { await saveFile('JEWAR-clients-' + fmtDate(Date.now()) + '.csv', csvText(), 'text/csv'); toast('تم تجهيز ملف السجل'); }
    catch (e) { toast('تعذّر التصدير: ' + (e && e.message ? e.message : e)); }
  }
  async function doBackup() {
    var data = JSON.stringify({ app: 'jewar', v: 1, exportedAt: new Date().toISOString(), cfg: S.cfg, log: S.log }, null, 1);
    try { await saveFile('JEWAR-backup-' + fmtDate(Date.now()) + '.json', data, 'application/json'); toast('تم تجهيز النسخة الاحتياطية'); }
    catch (e) { toast('تعذّر حفظ النسخة: ' + (e && e.message ? e.message : e)); }
  }
  function doRestoreFile(file) {
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var d = JSON.parse(rd.result);
        if (!d || d.app !== 'jewar' || !Array.isArray(d.log)) throw new Error('ملف غير صالح');
        var ids = {}; S.log.forEach(function (x) { ids[x.id] = 1; });
        var added = 0;
        d.log.forEach(function (x) { if (x && x.id && !ids[x.id] && x.name && x.inp && x.res) { S.log.push(x); added++; } });
        S.log.sort(function (a, b) { return b.ts - a.ts; });
        if (d.cfg) { S.cfg = Object.assign({}, C.DEF, d.cfg); persist(KEYS.cfg, S.cfg); }
        persist(KEYS.log, S.log);
        toast('تمت الاستعادة: ' + added + ' حساب جديد');
      } catch (e) { toast('تعذّرت الاستعادة: ' + e.message); }
    };
    rd.readAsText(file);
  }
  function doSave() {
    var name = S.saveName.trim();
    if (!name) { var el = document.getElementById('saveName'); if (el) el.focus(); return; }
    var inp = JSON.parse(JSON.stringify(S.inp)), r = C.calc(inp, S.cfg);
    S.log.unshift({ id: Date.now() + '-' + Math.floor(Math.random() * 1000), ts: Date.now(), name: name, inp: inp, res: { totJ: r.totJ, totI: r.totI, profJ: r.profJ, profI: r.profI, firstJ: r.firstJ, partJ: r.partJ, refJ: r.refJ } });
    persist(KEYS.log, S.log);
    S.saveOpen = false; S.saveName = '';
    toast('تم حفظ «' + name + '» في السجل');
  }

  /* ---------- الأحداث ---------- */
  $app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act;
    if (a === 'nav') { S.view = el.dataset.view; S.delId = null; render(); window.scrollTo(0, 0); }
    else if (a === 'set') {
      var v = el.dataset.val; if (v === 'true') v = true; else if (v === 'false') v = false;
      setPath(el.dataset.path, v); saveInputs(); render();
    }
    else if (a === 'openSave') { S.saveOpen = true; S.saveName = ''; render(); }
    else if (a === 'closeSave') { S.saveOpen = false; render(); }
    else if (a === 'confirmSave') doSave();
    else if (a === 'openRec') {
      var x = S.log.filter(function (y) { return y.id === el.dataset.id; })[0];
      if (x) { S.inp = Object.assign({}, S.inp, JSON.parse(JSON.stringify(x.inp))); saveInputs(); S.view = 'main'; render(); window.scrollTo(0, 0); }
    }
    else if (a === 'delRec') {
      if (S.delId === el.dataset.id) { S.log = S.log.filter(function (y) { return y.id !== el.dataset.id; }); S.delId = null; persist(KEYS.log, S.log); render(); }
      else { S.delId = el.dataset.id; setHtml('logList', logListHtml()); }
    }
    else if (a === 'exportCsv') doExport();
    else if (a === 'backup') doBackup();
    else if (a === 'restore') document.getElementById('restoreFile').click();
    else if (a === 'resetCfg') {
      if (el.dataset.sure) { S.cfg = Object.assign({}, C.DEF); persist(KEYS.cfg, S.cfg); render(); toast('أُعيدت القيم الأصلية'); }
      else { el.dataset.sure = '1'; el.textContent = 'اضغط مرة أخرى للتأكيد'; }
    }
  });
  $app.addEventListener('input', function (e) {
    var p = e.target.dataset && e.target.dataset.f; if (!p) return;
    setPath(p, e.target.value);
    if (p.indexOf('cfg.') === 0) persist(KEYS.cfg, S.cfg);
    else if (p.indexOf('inp.') === 0 || p.indexOf('v.') === 0) saveInputs();
    if (p === 'search') setHtml('logList', logListHtml());
    else refresh();
  });
  $app.addEventListener('keydown', function (e) {
    if (e.target.id === 'saveName' && e.key === 'Enter') { e.preventDefault(); doSave(); }
    if (e.key === 'Escape' && S.saveOpen) { S.saveOpen = false; render(); }
  });
  document.getElementById('restoreFile').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0]; if (file) doRestoreFile(file); e.target.value = '';
  });

  /* زر الرجوع في أندرويد */
  var appPlug = plug('App');
  if (appPlug && appPlug.addListener) {
    appPlug.addListener('backButton', function () {
      if (S.saveOpen) { S.saveOpen = false; render(); }
      else if (S.view !== 'main') { S.view = 'main'; render(); }
      else appPlug.exitApp();
    });
  }

  /* ---------- البدء ---------- */
  (async function init() {
    var cfg = await load(KEYS.cfg); if (cfg) S.cfg = Object.assign({}, C.DEF, cfg);
    var log = await load(KEYS.log); if (Array.isArray(log)) S.log = log;
    var st = await load(KEYS.inp); if (st) { if (st.inp) S.inp = Object.assign({}, S.inp, st.inp); if (st.v) S.v = Object.assign({}, S.v, st.v); }
    render();
  })();
})();
