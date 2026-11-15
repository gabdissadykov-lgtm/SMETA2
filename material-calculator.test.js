"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { configs, compute } = require("./material-calculator.js");
function params(index, overrides = {}) {
  const c = configs[index];
  const p = { index, surface: c.surface, length: 4, width: 3, height: 2.7, reserve: 10, openings: [], rate: 0.2, thickness: 10, density: 1.6, route: 20, gapW: 10, gapD: 10, yield: 30, fastener: 25, pack: 200 };
  c.fields.forEach((f) => { if (f.value !== "") p[f.id] = Number(f.value); });
  if (index === 10) p.pack = 10;
  if (index === 20) p.pack = 100;
  return { ...p, ...overrides };
}
const windowHole = { type: "window", wall: 0, x: 1, y: 1, w: 1.5, h: 1.2, depth: 0.2 };
const door = { type: "door", wall: 1, x: 1, y: 0, w: 0.9, h: 2.1, depth: 0.15 };

test("все 20 товаров и гвозди: независимые ожидаемые количества и единицы", () => {
  const expected = [[1,"мешок"],[3,"мешок"],[5,"мешок"],[1,"канистра"],[2,"ведро"],[1,"мешок"],[2,"упак."],[47.52,"м²"],[14.04,"м²"],[14,"м²"],[20,"м²"],[9,"шт"],[6,"рулон"],[1,"упак."],[31,"лист"],[8,"шт"],[3,"упак."],[1,"баллон"],[8,"туба"],[22,"м"],[1,"упак."]];
  assert.equal(configs.length, expected.length);
  configs.forEach((c, i) => {
    const r = compute(params(i));
    assert.equal(r.error, undefined, `Материал ${i}: ${r.error}`);
    assert.deepEqual([r.quantity,r.unit],expected[i],`Материал ${i}`);
  });
});
test("вычет окна и двери, добавление откосов только для покрытий", () => {
  const r = compute(params(4, { openings: [windowHole, door], reserve: 0 }));
  assert(Math.abs(r.net - 34.11) < 1e-9);
  assert(Math.abs(r.openingArea - 3.69) < 1e-9);
  assert(Math.abs(r.revealArea - 1.845) < 1e-9);
  const floor = compute(params(9, { openings: [windowHole, door] }));
  assert.equal(floor.net, 12);
});
test("ошибки расположения и пересечения проёмов", () => {
  for (const openings of [[windowHole, windowHole], [{...windowHole,x:3.9}], [{...windowHole,y:2.5}], [{...door,y:0.1}], [{...door,w:0}], [{...door,wall:4}]]) {
    assert(compute(params(4,{openings})).error);
  }
});
test("в плитке учитывается расположение: полный проём исключает ячейку, частичный — нет", () => {
  const base = { length: 2, width: 2, height: 2, tileL: 100, tileW: 100, joint: 0, reserve: 0 };
  assert.equal(compute(params(7,base)).quantity,16);
  const full = {type:"window",wall:0,x:0,y:0,w:1,h:1,depth:0};
  assert.equal(compute(params(7,{...base,openings:[full]})).quantity,15);
  assert.equal(compute(params(7,{...base,openings:[{...full,w:0.5}]})).quantity,16);
});
test("раскрой обоев с проёмом, раппортом и коротким рулоном", () => {
  const p = {length:2,width:2,height:2,rollW:1,rollL:4,trim:0,repeat:0,reserve:0};
  assert.equal(compute(params(12,p)).quantity,4);
  assert.equal(compute(params(12,{...p,openings:[{type:"door",wall:0,x:0,y:0,w:2,h:2,depth:0}]})).quantity,3);
  assert.equal(compute(params(12,{...p,repeat:60})).quantity,8);
  assert(compute(params(12,{...p,rollL:1})).error);
});
test("гипсокартон и саморезы: листы, слои, исключение точек в проёме", () => {
  const base = {length:1.2,width:1.2,height:2.5,reserve:0};
  assert.equal(compute(params(14,base)).quantity,4);
  assert.equal(compute(params(14,{...base,layers:2})).quantity,8);
  const screws = compute(params(16,{...base,pack:1}));
  assert.equal(screws.quantity,132); // 4 листа × 3 линии × 11 точек.
  const hole = {type:"door",wall:0,x:0,y:0,w:1.2,h:2.5,depth:0};
  assert.equal(compute(params(16,{...base,pack:1,openings:[hole]})).quantity,99);
  assert.equal(compute(params(16,{...base,pack:1,layers:2,extra:5})).quantity,269);
});
test("плинтус вычитает только двери, не окна", () => {
  const base = {length:5,width:5,height:3,piece:2.5,reserve:0};
  assert.equal(compute(params(11,base)).quantity,8);
  const hole={type:"door",wall:0,x:0,y:0,w:2.5,h:2,depth:0};
  assert.equal(compute(params(11,{...base,openings:[hole]})).quantity,7);
  assert.equal(compute(params(11,{...base,openings:[{...hole,type:"window",y:0.5}]})).quantity,8);
});
test("объём шва, выход пены и кабельные концы", () => {
  assert.equal(compute(params(17,{route:10,gapW:10,gapD:10,yield:1,reserve:0})).quantity,1);
  assert.equal(compute(params(18,{route:10,gapW:10,gapD:10,shape:0.5,pack:250,reserve:0})).quantity,2);
  assert.equal(compute(params(19,{route:10,points:4,tail:0.5,reserve:0})).quantity,12);
  assert.equal(compute(params(20,{route:1,lines:2,fastener:25,pack:1,reserve:0})).quantity,10);
});
test("целые границы и невалидные параметры", () => {
  assert.equal(compute(params(9,{length:3,width:3,pack:3.3,reserve:10})).quantity,9.9);
  for (const [index, change] of [[0,{rate:0}],[4,{layers:1.5}],[7,{tileW:0}],[9,{pack:0}],[12,{rollW:0}],[14,{sheetH:0}],[16,{fastener:0}],[18,{shape:2}],[19,{points:0.5}],[20,{pack:1.5}],[7,{length:1e100}],[7,{tileW:1e-10}]]) {
    assert(compute(params(index,change)).error,`Материал ${index}`);
  }
});

test("интерфейс: все товары, перенос в смету, другая фасовка и восстановление данных", () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const storage = new Map();
  function makeApp() {
    const roots = [];
    class Element {
      constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.dataset = {}; this.value = ""; this.id = ""; this.hidden = false; }
      append(child) { child.parent = this; this.children.push(child); if (this.tag === "select" && this.children.length === 1) this.value = child.value; }
      replaceChildren() { this.children = []; }
      addEventListener(event, fn) { (this.events[event] ||= []).push(fn); }
      emit(event) { (this.events[event] || []).forEach((fn) => fn({target:this})); }
      removeAttribute(key) { this[key] = ""; }
      setAttribute(key, value) { this[key] = value; }
      focus() {}
      remove() { this.parent.children = this.parent.children.filter((c) => c !== this); }
      querySelector(selector) { return this.querySelectorAll(selector)[0]; }
      querySelectorAll(selector) {
        const all = this.children.flatMap((child) => [child, ...child.querySelectorAll("*")]);
        return selector === "*" ? all : all.filter((e) => selector === "[data-key]" ? e.dataset.key : e.tag === selector);
      }
    }
    function get(id) { return roots.flatMap((e) => [e, ...e.querySelectorAll("*")]).find((e) => e.id === id); }
    const html = fs.readFileSync("index.html", "utf8");
    for (const match of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
      const e = new Element(match[1]); e.id = match[2]; e.value = /value="([^"]*)"/.exec(match[0])?.[1] || ""; roots.push(e);
    }
    const items = { rows: [] }; let saves = 0;
    const context = { document: { getElementById:get, createElement:tag=>new Element(tag) }, localStorage: {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}, numberValue:v=>{const n=Number(String(v).replace(",","."));return Number.isFinite(n)&&n>=0?n:0;},items,update(){},saveDraft(){saves++;},addItem(){const fields={};const row={querySelector:s=>fields[s] ||= {value:"",focus(){}}};items.rows.push(row);items.lastElementChild=row;} };
    vm.createContext(context);
    const source = fs.readFileSync("script.js", "utf8");
    vm.runInContext(source.slice(source.indexOf("const materials ="),source.indexOf("for (const material of materials)")), context);
    vm.runInContext(fs.readFileSync("material-calculator.js", "utf8"),context);
    return {get,items,saves:()=>saves};
  }
  let app = makeApp();
  assert.equal(app.get("calc-type").children.length,21);
  app.get("calc-type").value = "9"; app.get("calc-type").emit("change");
  app.get("calc-length").value="4";app.get("calc-width").value="3";
  app.get("material-calculator").emit("input");
  assert.equal(app.get("calc-add").disabled,false);
  app.get("calc-add").emit("click");
  assert.equal(app.items.lastElementChild.querySelector(".quantity").value,"14");
  assert.equal(app.items.lastElementChild.querySelector(".unit").value,"м²");
  assert.equal(app.items.lastElementChild.querySelector(".price").value,"5900");
  assert.equal(app.saves(),1);
  app=makeApp();
  assert.equal(app.get("calc-type").value,"9");assert.equal(app.get("calc-length").value,"4");
  app.get("calc-type").value="12";app.get("calc-type").emit("change");app.get("calc-height").value="2.7";
  app.get("calc-param-rollW").value="0.53";
  app.get("material-calculator").emit("input");app.get("calc-add").emit("click");
  assert.equal(app.items.lastElementChild.querySelector(".price").value,"0");
  assert.equal(app.items.lastElementChild.querySelector(".unit").value,"рулон");
  app.get("add-opening").emit("click");assert.equal(app.get("opening-list").children.length,1);
  assert.equal(app.get("calc-add").disabled,true);
});
