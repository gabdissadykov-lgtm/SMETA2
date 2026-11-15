"use strict";

// Независимый расчёт количества. Цены и денежные итоги остаются в script.js.
const MaterialCalculator = (() => {
  const f = (id, label, value = "", hint = "") => ({ id, label, value, hint });
  const configs = [
    { mode: "mix", surface: "floor", fields: [f("rate", "Расход, кг/м² на 1 мм (с упаковки)"), f("thickness", "Толщина слоя, мм"), f("pack", "Масса мешка, кг", 50)], note: "Цемент сам по себе не является готовой стяжкой. Укажите расход именно цемента из рецептуры вашей смеси. Песок и заполнители считаются отдельно." },
    { mode: "mix", surface: "walls", fields: [f("rate", "Расход, кг/м² на 1 мм (с упаковки)"), f("thickness", "Толщина слоя, мм"), f("pack", "Масса мешка, кг", 30)], note: "Штукатурка: чистая площадь × толщина × расход на 1 мм." },
    { mode: "mix", surface: "walls", fields: [f("rate", "Расход, кг/м² на 1 мм (с упаковки)"), f("thickness", "Суммарная толщина всех слоёв, мм"), f("pack", "Масса мешка, кг", 20)], note: "Шпаклёвка: чистая площадь × суммарная толщина × расход на 1 мм." },
    { mode: "coat", surface: "walls", fields: [f("rate", "Расход на слой, л/м² (с упаковки)"), f("layers", "Количество слоёв", 1), f("pack", "Объём канистры, л", 10)], note: "Грунтовка: чистая площадь с откосами × слои × расход." },
    { mode: "coat", surface: "walls", fields: [f("rate", "Расход на слой, л/м² (с упаковки)"), f("layers", "Количество слоёв", 2), f("pack", "Объём ведра, л", 10)], note: "Краска: чистая площадь с откосами × слои × расход. Если указана укрывистость в м²/л, расход равен 1 / укрывистость." },
    { mode: "rate", surface: "walls", fields: [f("rate", "Расход, кг/м² для выбранного зубца шпателя"), f("pack", "Масса мешка, кг", 25)], note: "Плиточный клей: площадь × расход производителя для основания и размера зубца. Учитывайте двойное нанесение в норме." },
    { mode: "grout", surface: "walls", fields: [f("tileL", "Длина плитки, см", 60), f("tileW", "Ширина плитки, см", 60), f("joint", "Ширина шва, мм", 2), f("depth", "Глубина заполнения шва, мм", 8), f("density", "Расход сухой смеси на 1 л шва, кг (по марке)"), f("pack", "Масса упаковки, кг", 2)], note: "Затирка: площадь × доля швов в регулярной сетке × глубина × расход сухой смеси на литр шва. Модель не учитывает граничные швы и неровности; сверяйте результат с таблицей производителя." },
    { mode: "tile", surface: "walls", fields: [f("tileL", "Длина плитки, см", 60), f("tileW", "Ширина плитки, см", 60), f("joint", "Ширина шва, мм", 2)], note: "Прямая сетка от левого нижнего угла каждой стены. Плитки, целиком попавшие в проём, исключаются; частично подрезанные считаются целыми. Обрезки не переиспользуются. Откосы — отдельная поверхность." },
    { mode: "tile", surface: "floor", fields: [f("tileL", "Длина плитки, см", 60), f("tileW", "Ширина плитки, см", 60), f("joint", "Ширина шва, мм", 2)], note: "Прямая раскладка от угла комнаты, каждую подрезанную плитку покупаем целой. Обрезки не переиспользуются; диагональная раскладка не моделируется." },
    { mode: "packArea", surface: "floor", fields: [f("pack", "Площадь одной упаковки, м²", 2)], note: "Ламинат: площадь пола с запасом / площадь упаковки. Это расчёт по площади, без карты распила и направления укладки." },
    { mode: "packArea", surface: "floor", fields: [f("pack", "Площадь одной упаковки подложки, м²")], note: "Подложка: площадь пола с запасом, округление до упаковок." },
    { mode: "skirting", surface: "floor", fields: [f("piece", "Длина планки, м", 2.5)], note: "Плинтус: каждая стена минус двери, каждый оставшийся участок округляется до целых планок. Обрезки между участками не переносятся. Соединители и углы не включены." },
    { mode: "wallpaper", surface: "walls", fields: [f("rollW", "Ширина рулона, м", 1.06), f("rollL", "Длина рулона, м", 10), f("trim", "Припуск на каждый отрезок, см", 10), f("repeat", "Раппорт прямого совмещения, см", 0)], note: "Полосы начинаются от левого края каждой стены. Проём вычитается из полосы только там, где перекрывает её полную ширину. Каждый отрезок с припуском округляется до раппорта; отрезки упаковываются в рулоны от длинных к коротким. Это консервативный раскрой, не поиск оптимального. Смещённый рисунок не поддерживается." },
    { mode: "rate", surface: "walls", fields: [f("rate", "Расход сухого клея, г/м² (с упаковки)"), f("pack", "Масса упаковки, г", 300)], note: "Обойный клей: чистая площадь стен × расход сухого клея. Расход раствора вместо сухого клея здесь не подходит." },
    { mode: "sheet", surface: "walls", fields: [f("sheetW", "Ширина листа, м", 1.2), f("sheetH", "Высота листа, м", 2.5), f("layers", "Количество слоёв обшивки", 1)], note: "Вертикальная сетка листов от угла, отдельно на каждой стене. Только целиком закрытые проёмом листы исключаются. Подрезанный лист считается целым; обрезки не переиспользуются. Откосы считаются отдельно." },
    { mode: "profile", surface: "walls", fields: [f("route", "Сумма длин профилей по схеме каркаса, м"), f("piece", "Длина одного профиля, м", 3)], note: "Введите длину именно профиля 60 × 27 по вашей схеме: стойки, перемычки и обрамления проёмов. Площадь стены не определяет состав каркаса. Результат — нижняя граница по общему метражу, без карты распила; направляющие и подвесы не включены." },
    { mode: "screw", surface: "walls", fields: [f("sheetW", "Ширина листа, м", 1.2), f("sheetH", "Высота листа, м", 2.5), f("support", "Шаг линий крепления на листе, см", 60), f("fastener", "Шаг саморезов вдоль линии, см", 25), f("edge", "Отступ крепления от краёв листа, мм", 15), f("layers", "Слоёв с одинаковым шагом крепления", 1), f("extra", "Дополнительные саморезы по схеме, шт", 0), f("pack", "Саморезов в упаковке, шт", 200)], note: "Расчёт по линиям крепления каждого листа, с крепежом у обоих краёв. Точки внутри проёмов исключаются. Стыкующиеся листы крепятся каждый со своей стороны стыка. Каркас должен поддерживать все линии и края. Обрамления проёмов и перемычки добавляйте отдельно. Для разных шагов по слоям выполните отдельные расчёты. Саморез 25 мм из каталога не подходит автоматически для любой толщины обшивки." },
    { mode: "foam", surface: "walls", fields: [f("route", "Длина заполняемых швов, м"), f("gapW", "Ширина шва, мм"), f("gapD", "Глубина шва, мм"), f("yield", "Фактический выход готовой пены из баллона, л")], note: "Пена: объём швов / выход готовой пены. Выход берите для условий применения. 750 мл на баллоне — не объём готовой пены. Длину можно перенести из периметров проёмов кнопкой ниже." },
    { mode: "sealant", surface: "walls", fields: [f("route", "Длина шва, м"), f("gapW", "Ширина шва, мм"), f("gapD", "Глубина шва, мм"), f("shape", "Коэффициент сечения (1 — прямоугольник, 0,5 — треугольник)", 1), f("pack", "Объём тубы, мл", 280)], note: "Герметик: длина × ширина × глубина × коэффициент сечения. Для неодинаковых швов сделайте отдельные расчёты." },
    { mode: "cable", surface: "floor", fields: [f("route", "Сумма длин трасс по плану, м"), f("points", "Количество концов кабеля", 0), f("tail", "Запас на один конец, м", 0.2)], note: "Кабель: фактические трассы со спусками + запас на концы. Площадь комнаты не задаёт электропроект. Сечение и защиту эта функция не подбирает." },
    { mode: "nails", surface: "walls", fields: [f("route", "Длина одной линии крепления, м"), f("fastener", "Шаг гвоздей, см"), f("lines", "Количество отдельных линий крепления", 1), f("pack", "Гвоздей в упаковке, шт")], note: "Дополнительный крепёж: число интервалов округляется вверх, добавляется начальная точка каждой линии. Для линий разной длины выполните отдельные расчёты. Гвоздей в исходном прайсе нет — цена в смете будет 0, укажите её вручную." }
  ];
  const ceil = (n) => Math.ceil(Number(n.toPrecision(14)));
  const pretty = (n) => n.toLocaleString("ru-RU", { maximumFractionDigits: 6 }).replace(/\u00a0|\u202f/g, " ");
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function compute(p) {
    const config = configs[p.index];
    if (!config) return { error: "Выберите материал." };
    const fail = (error) => ({ error });
    const needs = (keys) => keys.every((key) => Number.isFinite(p[key]) && p[key] > 0);
    const mode = config.mode;
    const direct = ["profile", "foam", "sealant", "cable", "nails"].includes(mode);
    if (!Number.isFinite(p.reserve) || p.reserve < 0) return fail("Проверьте запас.");
    if (!direct && !needs(["length", "width"])) return fail("Введите длину и ширину комнаты больше нуля.");
    if (!direct && p.surface === "walls" && !needs(["height"])) return fail("Введите высоту стен больше нуля.");
    if (["sheet", "screw", "wallpaper"].includes(mode) && p.surface !== "walls") return fail("Для этого расчёта выберите стены.");
    const wallWidths = [p.length, p.width, p.length, p.width];
    const openings = p.openings || [];
    if (openings.length && !needs(["length", "width", "height"])) return fail("Для проверки проёмов заполните размеры комнаты и высоту.");
    for (const o of openings) {
      if (![o.x, o.y, o.w, o.h, o.depth].every(Number.isFinite) || !Number.isInteger(o.wall) || o.wall < 0 || o.wall > 3 || o.w <= 0 || o.h <= 0 || o.x < 0 || o.y < 0 || o.depth < 0 || !["door", "window"].includes(o.type)) return fail("Заполните размеры и положение каждого проёма.");
      if (o.x + o.w > wallWidths[o.wall] + 1e-9 || o.y + o.h > p.height + 1e-9) return fail("Проём выходит за границы стены.");
      if (o.type === "door" && o.y !== 0) return fail("У двери высота низа должна быть 0.");
    }
    for (let i = 0; i < openings.length; i++) for (let j = i + 1; j < openings.length; j++) {
      if (openings[i].wall === openings[j].wall && overlap(openings[i], openings[j])) return fail("Проёмы на одной стене пересекаются.");
    }
    const openingArea = openings.reduce((sum, o) => sum + o.w * o.h, 0);
    const revealArea = openings.reduce((sum, o) => sum + (2 * o.h + (o.type === "door" ? o.w : 2 * o.w)) * o.depth, 0);
    const gross = p.surface === "walls" ? 2 * (p.length + p.width) * p.height : p.length * p.width;
    const net = gross - (p.surface === "walls" ? openingArea : 0);
    const coated = ["mix", "coat"].includes(mode) && p.surface === "walls" ? net + revealArea : net;
    const factor = 1 + p.reserve / 100;
    let quantity = 0, detail = "", base = 0;
    let pack = p.pack, unit = "упак.", rawUnit = "";
    const surfaces = p.surface === "walls" ? wallWidths.map((w, wall) => ({ w, h: p.height, holes: openings.filter((o) => o.wall === wall) })) : [{ w: p.length, h: p.width, holes: [] }];
    const blocked = (x, y, w, h, holes) => holes.some((o) => x >= o.x - 1e-9 && y >= o.y - 1e-9 && x + w <= o.x + o.w + 1e-9 && y + h <= o.y + o.h + 1e-9);
    const safe = (n) => Number.isFinite(n) && n >= 0 && n <= 1e9;
    const packaged = () => { quantity = ceil(base * factor / pack); detail = `Расход без запаса: ${pretty(base)} ${rawUnit}. Купить: ${quantity} ${unit} по ${pretty(pack)} ${rawUnit}.`; };
    if (!direct && (!safe(gross) || !safe(coated) || coated <= 0)) return fail("Площадь должна быть больше нуля; проверьте размеры и проёмы.");
    if (mode === "mix" || mode === "coat" || mode === "rate") {
      if (!needs(["rate", "pack"]) || (mode === "mix" && !needs(["thickness"])) || (mode === "coat" && (!needs(["layers"]) || !Number.isInteger(p.layers)))) return fail("Укажите положительные расход, фасовку и толщину/целое число слоёв.");
      base = coated * p.rate * (mode === "mix" ? p.thickness : mode === "coat" ? p.layers : 1);
      rawUnit = p.index === 13 ? "г" : mode === "coat" ? "л" : "кг";
      unit = p.index === 3 ? "канистра" : p.index === 4 ? "ведро" : [0, 1, 2, 5].includes(p.index) ? "мешок" : "упак.";
      packaged();
    } else if (mode === "grout") {
      if (!needs(["tileL", "tileW", "joint", "depth", "density", "pack"])) return fail("Укажите размеры плитки, шва, плотность и фасовку больше нуля.");
      const a = p.tileL * 10, b = p.tileW * 10, j = p.joint;
      const fraction = 1 - a * b / ((a + j) * (b + j));
      base = net * fraction * p.depth * p.density;
      rawUnit = "кг"; packaged();
    } else if (mode === "packArea") {
      if (!needs(["pack"])) return fail("Укажите площадь упаковки больше нуля.");
      const count = ceil(net * factor / p.pack);
      quantity = Math.ceil(Number((count * p.pack * 1e6).toPrecision(14))) / 1e6;
      unit = "м²";
      detail = `Площадь с запасом: ${pretty(net * factor)} м². Купить: ${count} упаковок по ${pretty(p.pack)} м² = ${pretty(quantity)} м².`;
    } else if (mode === "tile" || mode === "sheet" || mode === "screw") {
      const isTile = mode === "tile";
      if (isTile ? !needs(["tileL", "tileW"]) : !needs(["sheetW", "sheetH", "layers"]) || !Number.isInteger(p.layers)) return fail("Укажите размеры материала и целое количество слоёв больше нуля.");
      if (mode === "screw" && (!needs(["support", "fastener", "pack"]) || !Number.isInteger(p.pack) || !Number.isInteger(p.extra) || p.extra < 0 || !Number.isFinite(p.edge) || p.edge < 0)) return fail("Проверьте шаг крепежа, фасовку и количество дополнительных саморезов.");
      const w = isTile ? p.tileW / 100 : p.sheetW, h = isTile ? p.tileL / 100 : p.sheetH;
      const gap = isTile ? p.joint / 1000 : 0;
      if (!Number.isFinite(gap) || gap < 0) return fail("Проверьте ширину шва.");
      let cells = 0, screws = 0, operations = 0;
      for (const s of surfaces) {
        const nx = ceil(s.w / (w + gap)), ny = ceil(s.h / (h + gap));
        if (!safe(nx * ny) || nx * ny > 100000) return fail("Слишком много элементов. Проверьте размеры материала.");
        for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) {
          const x = ix * (w + gap), y = iy * (h + gap), cw = Math.min(w, s.w - x), ch = Math.min(h, s.h - y);
          if (cw <= 1e-9 || ch <= 1e-9 || blocked(x, y, cw, ch, s.holes)) continue;
          cells++;
          if (mode === "screw") {
            const edge = p.edge / 1000;
            if (2 * edge >= cw || 2 * edge >= ch) return fail("Подрезка листа слишком узкая для заданного отступа крепежа.");
            const nLines = ceil((cw - 2 * edge) / (p.support / 100));
            const nPoints = ceil((ch - 2 * edge) / (p.fastener / 100));
            operations += (nLines + 1) * (nPoints + 1);
            if (!safe(operations) || operations > 200000) return fail("Слишком много точек крепежа. Проверьте шаг.");
            for (let a = 0; a <= nLines; a++) for (let b = 0; b <= nPoints; b++) {
              const px = x + edge + a * (cw - 2 * edge) / nLines;
              const py = y + edge + b * (ch - 2 * edge) / nPoints;
              if (!s.holes.some((o) => px >= o.x && px <= o.x + o.w && py >= o.y && py <= o.y + o.h)) screws++;
            }
          }
        }
      }
      if (mode === "screw") {
        base = screws * p.layers + p.extra; rawUnit = "шт"; packaged();
        detail = `По сетке: ${screws} саморезов на слой + ${p.extra} дополнительных. ${detail}`;
      } else {
        const count = ceil(cells * (isTile ? 1 : p.layers) * factor);
        quantity = isTile ? Math.ceil(Number((count * w * h * 1e6).toPrecision(14))) / 1e6 : count;
        unit = isTile ? "м²" : "лист";
        detail = `По раскладке: ${cells} ${isTile ? "плиток" : "листов на слой"}. Купить с запасом: ${count} ${isTile ? "плиток" : "листов"}${isTile ? ` = ${pretty(quantity)} м²` : ""}.`;
      }
    } else if (mode === "wallpaper") {
      if (!needs(["rollW", "rollL"]) || !Number.isFinite(p.trim) || p.trim < 0 || !Number.isFinite(p.repeat) || p.repeat < 0) return fail("Проверьте размеры рулона, припуск и раппорт.");
      const cuts = [];
      for (const s of surfaces) {
        const strips = ceil(s.w / p.rollW);
        if (!safe(strips) || strips > 10000) return fail("Слишком много полос. Проверьте ширину рулона.");
        for (let i = 0; i < strips; i++) {
          const x = i * p.rollW, stripW = Math.min(p.rollW, s.w - x);
          const holes = s.holes.filter((o) => o.x <= x + 1e-9 && o.x + o.w >= x + stripW - 1e-9).sort((a,b) => a.y - b.y);
          let bottom = 0;
          const cut = (length) => {
            if (length <= 1e-9) return;
            let n = length + p.trim / 100;
            if (p.repeat > 0) n = ceil(n / (p.repeat / 100)) * (p.repeat / 100);
            cuts.push(n);
          };
          holes.forEach((o) => { cut(o.y - bottom); bottom = o.y + o.h; });
          cut(s.h - bottom);
        }
      }
      if (cuts.length > 5000) return fail("Слишком много отрезков. Разделите расчёт на помещения.");
      if (cuts.some((n) => n > p.rollL + 1e-9)) return fail("Рулон короче необходимого отрезка с припуском и раппортом.");
      const rolls = [];
      for (const cut of cuts.sort((a,b) => b-a)) {
        const idx = rolls.findIndex((remaining) => remaining + 1e-9 >= cut);
        if (idx < 0) rolls.push(p.rollL - cut); else rolls[idx] -= cut;
      }
      quantity = ceil(rolls.length * factor); unit = "рулон";
      detail = `Отрезков: ${cuts.length}; раскрой: ${rolls.length} рулонов. Купить с запасом: ${quantity} рулонов.`;
    } else if (mode === "skirting") {
      if (!needs(["piece"])) return fail("Укажите длину планки.");
      let count = 0, metres = 0;
      wallWidths.forEach((width, wall) => {
        let start = 0;
        for (const door of openings.filter((o) => o.wall === wall && o.type === "door").sort((a,b) => a.x-b.x)) {
          const run = door.x - start; count += ceil(run / p.piece); metres += run; start = door.x + door.w;
        }
        const run = width - start; count += ceil(run / p.piece); metres += run;
      });
      quantity = ceil(count * factor); unit = "шт";
      detail = `Периметр без дверей: ${pretty(metres)} м. По участкам: ${count} планок. С запасом: ${quantity} шт.`;
    } else if (mode === "profile") {
      if (!needs(["route", "piece"])) return fail("Введите метраж по схеме и длину профиля.");
      quantity = ceil(p.route * factor / p.piece); unit = "шт";
      detail = `По схеме: ${pretty(p.route)} м; с запасом ${pretty(p.route * factor)} м. Минимум по метражу: ${quantity} шт. по ${pretty(p.piece)} м. Проверьте карту распила.`;
    } else if (mode === "foam" || mode === "sealant") {
      if (!needs(["route", "gapW", "gapD"]) || (mode === "foam" ? !needs(["yield"]) : !needs(["shape", "pack"]) || p.shape > 1)) return fail("Введите длину и размеры шва, выход пены / объём тубы и коэффициент от 0 до 1.");
      base = p.route * p.gapW * p.gapD * (mode === "sealant" ? p.shape : 1);
      if (mode === "foam") { base /= 1000; pack = p.yield; rawUnit = "л"; unit = "баллон"; } else { rawUnit = "мл"; unit = "туба"; }
      packaged();
    } else if (mode === "cable") {
      if (!needs(["route"]) || !Number.isInteger(p.points) || p.points < 0 || !Number.isFinite(p.tail) || p.tail < 0) return fail("Укажите трассу, целое число концов и запас на конец.");
      quantity = ceil((p.route + p.points * p.tail) * factor); unit = "м";
      detail = `Трасса ${pretty(p.route)} м + концы ${pretty(p.points * p.tail)} м. С запасом и округлением до метра: ${quantity} м.`;
    } else if (mode === "nails") {
      if (!needs(["route", "fastener", "lines", "pack"]) || !Number.isInteger(p.lines) || !Number.isInteger(p.pack)) return fail("Введите длину, шаг и целые количество линий и фасовку.");
      base = (ceil(p.route / (p.fastener / 100)) + 1) * p.lines;
      rawUnit = "шт"; packaged();
    }
    if (!safe(quantity) || quantity <= 0) return fail("Нет материала к покупке или числа слишком велики. Проверьте данные.");
    const areaInfo = direct ? "" : `Площадь до вычета: ${pretty(gross)} м². Проёмы: ${pretty(p.surface === "walls" ? openingArea : 0)} м². Чистая: ${pretty(net)} м².${["mix", "coat"].includes(mode) && p.surface === "walls" ? ` Откосы: ${pretty(revealArea)} м².` : ""}\n`;
    return { quantity, unit, text: areaInfo + detail, net, openingArea, revealArea };
  }
  return { configs, compute, pretty };
})();

if (typeof module !== "undefined" && module.exports) module.exports = MaterialCalculator;
if (typeof document !== "undefined") initMaterialCalculator();

function initMaterialCalculator() {
  const $ = (id) => document.getElementById(id);
  const box = $("material-calculator"), select = $("calc-type");
  const configs = MaterialCalculator.configs;
  const names = [...materials.map((m) => m.name), "Гвозди — расчёт по шагу крепления"];
  names.forEach((name, i) => { const option = document.createElement("option"); option.value = String(i); option.textContent = name; select.append(option); });
  const commonIds = ["calc-type", "calc-surface", "calc-length", "calc-width", "calc-height", "calc-reserve"];
  function input(label, id, value = "", hint = "") {
    const wrapper = document.createElement("label"); wrapper.textContent = label;
    const field = document.createElement("input"); field.type = "text"; field.inputMode = "decimal"; field.id = id; field.value = String(value); field.placeholder = hint; wrapper.append(field); return wrapper;
  }
  function openingRow(data = {}) {
    const row = document.createElement("fieldset"); row.className = "opening-row calculator-grid";
    const legend = document.createElement("legend"); legend.textContent = "Проём"; row.append(legend);
    for (const [key, label, values] of [["type", "Тип", [["window", "Окно"], ["door", "Дверь"]]], ["wall", "Стена", [["0", "1 — длина"], ["1", "2 — ширина"], ["2", "3 — длина"], ["3", "4 — ширина"]]]]) {
      const wrapper = document.createElement("label"); wrapper.textContent = label;
      const field = document.createElement("select"); field.dataset.key = key;
      values.forEach(([value, text]) => { const o = document.createElement("option"); o.value = value; o.textContent = text; field.append(o); });
      if (data[key] !== undefined) field.value = String(data[key]); wrapper.append(field); row.append(wrapper);
    }
    for (const [key, label, defaultValue] of [["w", "Ширина, м", ""], ["h", "Высота, м", ""], ["x", "От левого края стены, м", 0], ["y", "Высота низа от пола, м", 0], ["depth", "Глубина откоса, м (для смесей/покраски)", 0]]) {
      const wrapper = input(label, "", data[key] ?? defaultValue); const field = wrapper.querySelector("input"); field.removeAttribute("id"); field.dataset.key = key; row.append(wrapper);
    }
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Удалить проём";
    remove.addEventListener("click", () => { row.remove(); refresh(); persist(); $("add-opening").focus(); }); row.append(remove);
    $("opening-list").append(row); return row;
  }
  function rawOpenings() {
    return Array.from($("opening-list").children, (row) => Object.fromEntries(Array.from(row.querySelectorAll("[data-key]"), (field) => [field.dataset.key, field.value])));
  }
  function renderFields() {
    const config = configs[Number(select.value)];
    $("calc-specific").replaceChildren();
    config.fields.forEach((f) => $("calc-specific").append(input(f.label, "calc-param-" + f.id, f.value, f.hint)));
    $("calc-surface").value = config.surface;
    $("calc-method").textContent = config.note;
  }
  function params() {
    const index = Number(select.value), config = configs[index];
    return { index, surface: $("calc-surface").value,
      ...Object.fromEntries(["length", "width", "height", "reserve"].map((k) => [k, numberValue($("calc-" + k).value)])),
      ...Object.fromEntries(config.fields.map((f) => [f.id, numberValue($("calc-param-" + f.id).value)])),
      openings: rawOpenings().map((o) => ({ type: o.type, ...Object.fromEntries(["wall", "x", "y", "w", "h", "depth"].map((k) => [k, numberValue(o[k])])) })) };
  }
  function refresh() {
    const p = params(), config = configs[p.index];
    const fixed = ["sheet", "screw", "wallpaper", "skirting", "packArea", "profile", "foam", "sealant", "cable", "nails"].includes(config.mode);
    $("calc-surface").disabled = fixed;
    $("calc-fill-seams").hidden = !["foam", "sealant"].includes(config.mode);
    if (fixed) { p.surface = config.surface; $("calc-surface").value = p.surface; }
    const result = MaterialCalculator.compute(p);
    $("calc-result").textContent = result.error || result.text;
    $("calc-add").disabled = Boolean(result.error);
    return { p, result };
  }
  const calcKey = "megastroy-calculator-v2";
  function persist() {
    const data = { common: Object.fromEntries(commonIds.map((id) => [id, $(id).value])), fields: Object.fromEntries(configs[Number(select.value)].fields.map((f) => [f.id, $("calc-param-" + f.id).value])), openings: rawOpenings() };
    try { localStorage.setItem(calcKey, JSON.stringify(data)); } catch { /* Основная смета сообщает об ограничениях хранилища отдельно. */ }
  }
  renderFields();
  try {
    const data = JSON.parse(localStorage.getItem(calcKey));
    if (data && data.common && Number.isInteger(Number(data.common["calc-type"])) && configs[Number(data.common["calc-type"])]) {
      select.value = data.common["calc-type"]; renderFields();
      commonIds.forEach((id) => { if (typeof data.common[id] === "string") $(id).value = data.common[id]; });
      configs[Number(select.value)].fields.forEach((f) => { if (typeof data.fields?.[f.id] === "string") $("calc-param-" + f.id).value = data.fields[f.id]; });
      if (Array.isArray(data.openings)) data.openings.slice(0, 100).forEach(openingRow);
    }
  } catch { /* Повреждённые вспомогательные данные не мешают основной смете. */ }
  $("open-calculator").addEventListener("click", () => {
    box.hidden = !box.hidden; $("open-calculator").setAttribute("aria-expanded", String(!box.hidden));
    if (!box.hidden) { refresh(); select.focus(); }
  });
  function close() { box.hidden = true; $("open-calculator").setAttribute("aria-expanded", "false"); $("open-calculator").focus(); }
  $("close-calculator").addEventListener("click", close);
  box.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  select.addEventListener("change", renderFields);
  box.addEventListener("input", () => { refresh(); persist(); });
  box.addEventListener("change", () => { refresh(); persist(); });
  $("add-opening").addEventListener("click", () => { const row = openingRow(); $("calc-openings").open = true; refresh(); persist(); row.querySelector("select").focus(); });
  $("calc-fill-seams").addEventListener("click", () => {
    const length = params().openings.reduce((sum, o) => sum + 2 * o.h + (o.type === "door" ? o.w : 2 * o.w), 0);
    $("calc-param-route").value = String(length); refresh(); persist();
  });
  $("calc-add").addEventListener("click", () => {
    const { p, result } = refresh(); if (result.error) return;
    const config = configs[p.index], material = materials[p.index];
    let name = material?.name || "Гвозди (цена за упаковку)", price = material?.price || 0;
    // Изменённая фасовка — другой товар: цена исходной упаковки к нему не переносится.
    const packField = config.fields.find((f) => f.id === "pack");
    const changedPack = packField && packField.value !== "" && p.pack !== Number(packField.value);
    const changedRoll = config.mode === "wallpaper" && (p.rollW !== 1.06 || p.rollL !== 10);
    const changedSheet = config.mode === "sheet" && (p.sheetW !== 1.2 || p.sheetH !== 2.5);
    const changedPiece = ["profile", "skirting"].includes(config.mode) && p.piece !== Number(config.fields.find((f) => f.id === "piece").value);
    if ((changedPack && !["packArea"].includes(config.mode)) || changedRoll || changedSheet || changedPiece) {
      name += ` (другая фасовка/размер — цена вручную)`; price = 0;
    }
    addItem(false); const row = items.lastElementChild;
    row.querySelector(".name").value = name;
    row.querySelector(".quantity").value = String(result.quantity);
    row.querySelector(".unit").value = result.unit;
    row.querySelector(".price").value = String(price);
    update(); saveDraft(); close(); row.querySelector(".quantity").focus();
  });
  refresh();
}
