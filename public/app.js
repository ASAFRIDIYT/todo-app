const KEY = "todo-app:v2";
const OLD_KEY = "todo-app:v1";
const MY_GROUP = "Meri Tasks";
const GROUPS = [...DEFAULT_TOPICS.map(([g]) => g), MY_GROUP];

let todos = load();
let filter = "all";
const collapsed = new Set();

const form = document.getElementById("new-form");
const input = document.getElementById("new-input");
const groupSelect = document.getElementById("new-group");
const groupsEl = document.getElementById("groups");
const empty = document.getElementById("empty");
const summary = document.getElementById("summary");
const totalFill = document.getElementById("total-fill");
const groupTpl = document.getElementById("group-tpl");
const itemTpl = document.getElementById("item-tpl");

function defaults() {
  return DEFAULT_TOPICS.flatMap(([group, items]) =>
    items.map(([text, done]) => ({ id: crypto.randomUUID(), text, done, group }))
  );
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return saved;
    // first run on v2: seed the study list, keep any tasks from the old version
    const old = (JSON.parse(localStorage.getItem(OLD_KEY)) || []).map((t) => ({ ...t, group: MY_GROUP }));
    return [...defaults(), ...old];
  } catch {
    return defaults();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos));
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

GROUPS.forEach((g) => groupSelect.add(new Option(g, g)));
groupSelect.value = MY_GROUP;

function render() {
  const show = (t) => (filter === "active" ? !t.done : filter === "done" ? t.done : true);

  const sections = GROUPS.map((g) => {
    const all = todos.filter((t) => t.group === g);
    const visible = all.filter(show);
    if (!visible.length) return null;

    const sec = groupTpl.content.firstElementChild.cloneNode(true);
    const doneCount = all.filter((t) => t.done).length;
    sec.dataset.group = g;
    sec.classList.toggle("collapsed", collapsed.has(g));
    sec.classList.toggle("complete", doneCount === all.length);
    sec.querySelector(".group-head").setAttribute("aria-expanded", !collapsed.has(g));
    sec.querySelector(".g-title").textContent = g;
    sec.querySelector(".g-count").textContent = `${doneCount}/${all.length}`;
    sec.querySelector(".fill").style.width = `${(doneCount / all.length) * 100}%`;

    sec.querySelector(".list").append(
      ...visible.map((t) => {
        const li = itemTpl.content.firstElementChild.cloneNode(true);
        li.dataset.id = t.id;
        li.classList.toggle("done", t.done);
        li.querySelector(".toggle").checked = t.done;
        li.querySelector(".text").textContent = t.text;
        return li;
      })
    );
    return sec;
  }).filter(Boolean);

  groupsEl.replaceChildren(...sections);
  empty.style.display = sections.length ? "none" : "block";

  const done = todos.filter((t) => t.done).length;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
  summary.textContent = `${done} / ${todos.length} topics done · ${pct}%`;
  totalFill.style.width = `${pct}%`;
}

function update(fn) {
  fn();
  save();
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  const group = groupSelect.value;
  collapsed.delete(group);
  update(() => todos.push({ id: crypto.randomUUID(), text, done: false, group }));
  input.value = "";
});

groupsEl.addEventListener("change", (e) => {
  if (!e.target.classList.contains("toggle")) return;
  const id = e.target.closest(".item").dataset.id;
  update(() => {
    todos.find((t) => t.id === id).done = e.target.checked;
  });
  if (e.target.checked) {
    const li = groupsEl.querySelector(`[data-id="${id}"]`);
    if (li) li.classList.add("pop");
  }
});

groupsEl.addEventListener("click", (e) => {
  const head = e.target.closest(".group-head");
  if (head) {
    const g = head.closest(".group").dataset.group;
    collapsed.has(g) ? collapsed.delete(g) : collapsed.add(g);
    render();
    return;
  }
  if (!e.target.classList.contains("del")) return;
  const id = e.target.closest(".item").dataset.id;
  update(() => (todos = todos.filter((t) => t.id !== id)));
});

groupsEl.addEventListener("dblclick", (e) => {
  const span = e.target.closest(".text");
  if (!span) return;
  const id = span.closest(".item").dataset.id;
  const todo = todos.find((t) => t.id === id);

  const edit = document.createElement("input");
  edit.className = "edit";
  edit.value = todo.text;
  edit.maxLength = 200;
  span.replaceWith(edit);
  edit.focus();
  edit.select();

  let finished = false;
  const finish = (commit) => {
    if (finished) return;
    finished = true;
    const text = edit.value.trim();
    update(() => {
      if (!commit) return;
      if (text) todo.text = text;
      else todos = todos.filter((t) => t.id !== id);
    });
  };
  edit.addEventListener("blur", () => finish(true));
  edit.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") finish(true);
    if (ev.key === "Escape") finish(false);
  });
});

document.querySelector(".filters").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  filter = btn.dataset.filter;
  document
    .querySelectorAll(".filters button")
    .forEach((b) => b.classList.toggle("active", b === btn));
  render();
});

document.getElementById("reset").addEventListener("click", () => {
  if (!confirm("Saari progress mita kar default list wapas laani hai?")) return;
  update(() => (todos = defaults()));
});

render();
