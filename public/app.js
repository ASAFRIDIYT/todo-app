const KEY = "todo-app:v1";

let todos = load();
let filter = "all";

const form = document.getElementById("new-form");
const input = document.getElementById("new-input");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const summary = document.getElementById("summary");
const tpl = document.getElementById("item-tpl");

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos));
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

function render() {
  const visible = todos.filter((t) =>
    filter === "active" ? !t.done : filter === "done" ? t.done : true
  );

  list.replaceChildren(
    ...visible.map((t) => {
      const li = tpl.content.firstElementChild.cloneNode(true);
      li.dataset.id = t.id;
      li.classList.toggle("done", t.done);
      li.querySelector(".toggle").checked = t.done;
      li.querySelector(".text").textContent = t.text;
      return li;
    })
  );

  empty.style.display = visible.length ? "none" : "block";
  const left = todos.filter((t) => !t.done).length;
  summary.textContent = todos.length
    ? `${left} of ${todos.length} left`
    : "Nothing to do yet";
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
  update(() => todos.unshift({ id: crypto.randomUUID(), text, done: false }));
  input.value = "";
});

list.addEventListener("change", (e) => {
  if (!e.target.classList.contains("toggle")) return;
  const id = e.target.closest(".item").dataset.id;
  update(() => {
    const t = todos.find((t) => t.id === id);
    t.done = e.target.checked;
  });
});

list.addEventListener("click", (e) => {
  if (!e.target.classList.contains("del")) return;
  const id = e.target.closest(".item").dataset.id;
  update(() => (todos = todos.filter((t) => t.id !== id)));
});

list.addEventListener("dblclick", (e) => {
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

document.getElementById("clear-done").addEventListener("click", () => {
  update(() => (todos = todos.filter((t) => !t.done)));
});

render();
